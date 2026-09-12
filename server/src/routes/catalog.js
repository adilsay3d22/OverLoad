import { Router } from 'express';
import { exercises, templates, resolveExercise, uid } from '../lib/catalog.js';
import { muscleMap, muscleNames } from '../lib/muscles.js';
import { CATEGORY_GROUP, exerciseKey } from '../lib/progress.js';
import { requireAuth } from '../lib/auth.js';
import {
  createCustomExercise, deleteCustomExercise, listCustomExercises,
} from '../lib/repo.js';

const router = Router();

/**
 * The exercise library is per-user now.
 *
 * A 160-entry list will never cover everyone's gym — cable machines differ,
 * people invent variations, and a plan you cannot write down is a plan you stop
 * following. Exercises a user adds themselves sit in the same search results as
 * the bundled ones and behave identically everywhere downstream.
 *
 * The one thing they do not get is a tier. The library's tier is an editorial
 * judgement about how much an exercise gives back; inventing one for somebody
 * else's movement would be fabricating a rating nobody made.
 */
const forUser = async (req) => (req.user ? listCustomExercises(req.user.id) : []);

/** The tracking identity an exercise accumulates history under. */
const slugFor = (name) => exerciseKey({ name });

/** Library rows and custom rows, in one shape the client can treat alike. */
const asResult = (e) => ({
  ...e,
  group: CATEGORY_GROUP[e.category] || e.category,
  equipment: e.equipment || [],
  custom: Boolean(e.custom),
  tier: e.tier ?? null,
  tierRank: e.tierRank ?? 0,
  exerciseType: e.exerciseType || (e.custom ? 'Custom' : null),
});

/** Muscle-group grid on step 1 of the add-exercise flow, ordered by size. */
const GROUP_ORDER = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core'];

router.get('/exercises', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '');
  const group = String(req.query.group || '');

  // A user's own exercises lead: they were added because the library did not
  // have the thing, so burying them under 160 library rows would undo the point.
  let list = [...(await forUser(req)), ...exercises];
  if (category) list = list.filter((e) => e.category === category);
  if (group) list = list.filter((e) => (CATEGORY_GROUP[e.category] || e.category) === group);
  if (q) {
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.aliases || []).some((a) => a.toLowerCase().includes(q)) ||
        (e.equipment || []).some((a) => a.toLowerCase().includes(q)),
    );
  }
  // `tierRank` is a quality score, not a position: S+ sits at 7-8 and F at 2,
  // so best-first means sorting it descending.
  res.json({
    exercises: list
      .slice()
      .sort(
        (a, b) =>
          Number(Boolean(b.custom)) - Number(Boolean(a.custom))
          || (b.tierRank || 0) - (a.tierRank || 0)
          || a.name.localeCompare(b.name),
      )
      .map(asResult),
  });
});

// ---------------------------------------------------------------------------
// A user's own exercises
// ---------------------------------------------------------------------------

router.get('/custom', requireAuth, async (req, res) => {
  res.json({ exercises: (await forUser(req)).map(asResult) });
});

router.post('/custom', requireAuth, async (req, res) => {
  const name = String(req.body?.name || '').replace(/\s+/g, ' ').trim();
  const category = String(req.body?.category || '').trim();
  const equipment = (Array.isArray(req.body?.equipment) ? req.body.equipment : [])
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 4);

  const errors = {};
  if (name.length < 2) errors.name = 'Give the exercise a name.';
  if (name.length > 60) errors.name = 'Keep the name under 60 characters.';
  if (!CATEGORY_GROUP[category]) errors.category = 'Pick which muscle it trains.';
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Check the form', errors });
  }

  const slug = slugFor(name);
  if (!slug) return res.status(400).json({ error: 'Check the form', errors: { name: 'Give the exercise a name.' } });

  // An exercise the bundled library already has, under a name that would track
  // to the same key. Saying so is more use than silently making a duplicate
  // that splits the lifter's history in two.
  const inLibrary = exercises.find((e) => e.slug === slug);
  if (inLibrary) {
    return res.status(409).json({
      error: `${inLibrary.name} is already in the library — search for it instead.`,
      existing: asResult(inLibrary),
    });
  }

  const created = await createCustomExercise({
    id: uid('cx'), userId: req.user.id, slug, name, category, equipment,
  });
  if (!created) {
    const mine = (await forUser(req)).find((e) => e.slug === slug);
    return res.status(409).json({
      error: 'You already added that one.',
      existing: mine ? asResult(mine) : undefined,
    });
  }
  res.status(201).json({ exercise: asResult(created) });
});

/**
 * Removing a custom exercise takes it out of search. It does not touch the
 * plans that already use it or a single logged set — same rule as deleting a
 * program, and for the same reason.
 */
router.delete('/custom/:id', requireAuth, async (req, res) => {
  const gone = await deleteCustomExercise(req.user.id, req.params.id);
  if (!gone) return res.status(404).json({ error: 'Exercise not found' });
  res.json({ ok: true });
});

router.get('/exercises/groups', requireAuth, async (req, res) => {
  const counts = {};
  const categories = {};
  for (const e of [...(await forUser(req)), ...exercises]) {
    const group = CATEGORY_GROUP[e.category] || e.category;
    counts[group] = (counts[group] || 0) + 1;
    (categories[group] ||= new Set()).add(e.category);
  }
  res.json({
    groups: GROUP_ORDER.filter((g) => counts[g]).map((g) => ({
      name: g,
      count: counts[g],
      categories: [...categories[g]],
    })),
  });
});

router.get('/exercises/:id', (req, res) => {
  const found = exercises.find(
    (e) => String(e.id) === req.params.id || e.slug === req.params.id,
  );
  if (!found) return res.status(404).json({ error: 'Exercise not found' });
  res.json({
    exercise: {
      ...found,
      group: CATEGORY_GROUP[found.category] || found.category,
      muscles: muscleMap(found, found.category),
      muscleNames: muscleNames(found, found.category),
    },
  });
});

router.get('/templates', (_req, res) => {
  res.json({
    templates: templates.map(({ weeks, ...rest }) => ({
      ...rest,
      // Which weekdays the block actually trains, so the library can draw each
      // template's rhythm instead of printing "4 days/week" and leaving the
      // reader to imagine which four.
      days: weeks[0].sessions.map((s) => s.day % 7).sort((a, b) => a - b),
      preview: weeks[0].sessions.map((s) => ({
        name: s.name,
        type: s.type,
        exerciseCount: s.exercises.length,
      })),
    })),
  });
});

router.get('/templates/:id', (req, res) => {
  const found = templates.find((t) => t.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'Template not found' });
  res.json({ template: found });
});

/** Used by the client when it needs anatomy for an ad-hoc exercise name. */
router.get('/muscle-map', (req, res) => {
  const name = String(req.query.name || '');
  const category = String(req.query.category || 'Chest');
  const library = resolveExercise(name, category);
  const anatomy = library && library.category === category ? library : null;
  res.json({ muscles: muscleMap(anatomy, category), names: muscleNames(anatomy, category) });
});

export default router;
