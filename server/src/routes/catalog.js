import { Router } from 'express';
import { exercises, templates, resolveExercise } from '../lib/catalog.js';
import { muscleMap, muscleNames } from '../lib/muscles.js';
import { CATEGORY_GROUP } from '../lib/progress.js';

const router = Router();

/** Muscle-group grid on step 1 of the add-exercise flow, ordered by size. */
const GROUP_ORDER = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core'];

router.get('/exercises', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '');
  const group = String(req.query.group || '');

  let list = exercises;
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
      .sort((a, b) => b.tierRank - a.tierRank || a.name.localeCompare(b.name))
      .map((e) => ({ ...e, group: CATEGORY_GROUP[e.category] || e.category })),
  });
});

router.get('/exercises/groups', (_req, res) => {
  const counts = {};
  const categories = {};
  for (const e of exercises) {
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
