import { Router } from 'express';
import {
  createProgram, deleteProgram, getProgram, listLogs, listPrograms,
  replacePlan, setActiveProgram, updateProgramMeta,
} from '../lib/repo.js';
import { requireAuth } from '../lib/auth.js';
import {
  templates, exercises, uid, normalizeExerciseEntry, sessionType,
} from '../lib/catalog.js';
import { programStats, sessionProgress } from '../lib/progress.js';

const router = Router();
router.use(requireAuth);

const owned = (req) => listPrograms(req.user.id);
const find = (req) => getProgram(req.user.id, req.params.id);

/**
 * Persist a program object whose plan was just mutated, then decorate it.
 *
 * Every editing route below works the way it always has — load the program,
 * change the arrays, hand it back — and this is the single place that turns
 * that into writes. `replacePlan` swaps the whole plan inside a transaction,
 * which is sound here because a plan has exactly one writer.
 */
async function saveAndDecorate(req, program, { planChanged = true } = {}) {
  await updateProgramMeta(program.id, {
    name: program.name,
    totalWeeks: program.totalWeeks,
    daysPerWeek: program.daysPerWeek,
  });
  if (planChanged) await replacePlan(program.id, program.weeks);
  return decorate(await listLogs(req.user.id), program);
}

const clone = (v) => structuredClone(v);

/** Fresh ids all the way down — a copy must never share ids with its source. */
const copySessions = (sessions, weekIndex) =>
  clone(sessions).map((session) => ({
    ...session,
    id: uid('s'),
    weekIndex: weekIndex ?? session.weekIndex,
    exercises: session.exercises.map((entry) => ({ ...entry, id: uid('ex') })),
  }));

/** "Block" -> "Block (copy)" -> "Block (copy 2)" ... */
function uniqueName(existing, base) {
  const taken = new Set(existing);
  const stripped = base.replace(/ \(copy( \d+)?\)$/, '');
  let candidate = `${stripped} (copy)`;
  let n = 2;
  while (taken.has(candidate)) candidate = `${stripped} (copy ${n++})`;
  return candidate;
}

/** The session the Continue Training card and the floating action button open. */
export function nextSession(logs, program) {
  if (!program) return null;
  let firstIncomplete = null;
  for (const week of program.weeks) {
    for (const session of week.sessions) {
      const progress = sessionProgress(logs, program, week.index, session);
      if (!progress.complete) {
        if (progress.started) return { weekIndex: week.index, session, progress };
        firstIncomplete ||= { weekIndex: week.index, session, progress };
      }
    }
  }
  return firstIncomplete;
}

/** Program plus everything a screen needs to render honest completion state. */
function decorate(logs, program) {
  const weeks = program.weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => ({
      ...session,
      progress: sessionProgress(logs, program, week.index, session),
    })),
  }));
  const built = weeks.filter((w) => w.sessions.length > 0).length;
  const next = nextSession(logs, program);
  return {
    ...program,
    weeks,
    weeksBuilt: built,
    stats: programStats(logs, program),
    next: next
      ? {
          weekIndex: next.weekIndex,
          sessionId: next.session.id,
          name: next.session.name,
          type: next.session.type,
          exerciseCount: next.session.exercises.length,
          setCount: next.session.exercises.reduce((n, e) => n + e.sets, 0),
          exerciseIndex: next.progress.nextExerciseIndex,
          progress: next.progress,
        }
      : null,
  };
}

router.get('/', async (req, res) => {
  const [programs, logs] = await Promise.all([owned(req), listLogs(req.user.id)]);
  res.json({ programs: programs.map((p) => decorate(logs, p)) });
});

router.get('/active', async (req, res) => {
  const [programs, logs] = await Promise.all([owned(req), listLogs(req.user.id)]);
  const program = programs.find((p) => p.isActive) || null;
  res.json({ program: program ? decorate(logs, program) : null });
});

/**
 * A program saved as a reusable plan.
 *
 * Deleting a program has always been safe for history — the logs outlive it —
 * but it was never safe for the *plan*, which took weeks to build and vanished
 * with it. Saving one as a template keeps the structure and none of the work:
 * weeks, sessions, exercises, targets and cues, with no logged set anywhere
 * near it. That is also what makes deleting a duplicate program a comfortable
 * thing to do rather than a decision to put off.
 *
 * These routes are declared before `/:id` so that "saved-templates" is never
 * read as a program id.
 */
const ownedTemplates = (req) => listPrograms(req.user.id, 'template');

const templateSummary = (t) => ({
  id: t.id,
  name: t.name,
  totalWeeks: t.totalWeeks,
  daysPerWeek: t.daysPerWeek,
  createdAt: t.createdAt,
  sessionCount: t.weeks.reduce((n, w) => n + w.sessions.length, 0),
  exerciseCount: t.weeks.reduce(
    (n, w) => n + w.sessions.reduce((m, x) => m + x.exercises.length, 0),
    0,
  ),
  weeks: t.weeks,
});

router.get('/saved-templates', async (req, res) => {
  const templates = await ownedTemplates(req);
  res.json({ templates: templates.map(templateSummary) });
});

router.post('/:id/save-as-template', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });

  const name = String(req.body?.name || program.name).trim();
  if (name.length < 2) {
    return res.status(400).json({ error: 'Give the template a name.' });
  }

  const saved = {
    id: uid('ut'),
    userId: req.user.id,
    kind: 'template',
    name,
    totalWeeks: program.totalWeeks,
    daysPerWeek: program.daysPerWeek,
    isActive: false,
    createdAt: new Date().toISOString(),
    // The plan only, with fresh ids all the way down. Nothing here is keyed to
    // a log, so starting from this template later cannot resurrect anyone's
    // sets — and reusing the source program's session ids would be worse than
    // untidy, because logs are keyed on `session_id` and the two would start
    // answering for each other.
    weeks: program.weeks.map((week) => ({
      index: week.index,
      sessions: copySessions(week.sessions, week.index),
    })),
  };
  await createProgram(saved);
  res.status(201).json({ template: templateSummary(saved) });
});

router.post('/saved-templates/:templateId/start', async (req, res) => {
  const saved = await getProgram(req.user.id, req.params.templateId);
  if (!saved || saved.kind !== 'template') {
    return res.status(404).json({ error: 'Template not found' });
  }

  const program = {
    id: uid('p'),
    userId: req.user.id,
    name: String(req.body?.name || saved.name).trim() || saved.name,
    source: 'saved',
    savedTemplateId: saved.id,
    totalWeeks: saved.totalWeeks,
    daysPerWeek: saved.daysPerWeek,
    isActive: true,
    createdAt: new Date().toISOString(),
    weeks: saved.weeks.map((week) => ({
      index: week.index,
      sessions: copySessions(week.sessions, week.index),
    })),
  };
  program.isActive = false;
  await createProgram(program);
  await setActiveProgram(req.user.id, program.id);
  program.isActive = true;
  res.status(201).json({ program: decorate(await listLogs(req.user.id), program) });
});

router.delete('/saved-templates/:templateId', async (req, res) => {
  const saved = await getProgram(req.user.id, req.params.templateId);
  if (!saved || saved.kind !== 'template') {
    return res.status(404).json({ error: 'Template not found' });
  }
  await deleteProgram(saved.id);
  res.json({ ok: true });
});

router.post('/template/:templateId', async (req, res) => {
  const template = templates.find((t) => t.id === req.params.templateId);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const program = {
    id: uid('p'),
    userId: req.user.id,
    name: req.body?.name?.trim() || template.name,
    source: 'template',
    templateId: template.id,
    tagline: template.tagline,
    totalWeeks: template.totalWeeks,
    daysPerWeek: template.daysPerWeek,
    isActive: true,
    createdAt: new Date().toISOString(),
    weeks: clone(template.weeks).map((week) => ({
      index: week.index,
      sessions: week.sessions.map((s) => ({ ...s, id: uid('s'), exercises: s.exercises.map((e) => ({ ...e, id: uid('ex') })) })),
    })),
  };
  program.isActive = false;
  await createProgram(program);
  await setActiveProgram(req.user.id, program.id);
  program.isActive = true;
  res.status(201).json({ program: decorate(await listLogs(req.user.id), program) });
});

router.post('/custom', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const totalWeeks = Math.min(16, Math.max(1, Number(req.body?.totalWeeks) || 8));
  const daysPerWeek = Math.min(7, Math.max(1, Number(req.body?.daysPerWeek) || 4));
  if (name.length < 2) {
    return res.status(400).json({ error: 'Check the form', errors: { name: 'Give the program a name.' } });
  }

  const program = {
    id: uid('p'),
    userId: req.user.id,
    name,
    source: 'custom',
    templateId: null,
    tagline: null,
    totalWeeks,
    daysPerWeek,
    isActive: true,
    createdAt: new Date().toISOString(),
    weeks: Array.from({ length: totalWeeks }, (_, index) => ({ index, sessions: [] })),
  };
  program.isActive = false;
  await createProgram(program);
  await setActiveProgram(req.user.id, program.id);
  program.isActive = true;
  res.status(201).json({ program: decorate(await listLogs(req.user.id), program) });
});

router.get('/:id', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  res.json({ program: decorate(await listLogs(req.user.id), program) });
});

router.post('/:id/activate', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  await setActiveProgram(req.user.id, program.id);
  program.isActive = true;
  res.json({ program: decorate(await listLogs(req.user.id), program) });
});

router.patch('/:id', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  if (typeof req.body?.name === 'string' && req.body.name.trim().length >= 2) {
    program.name = req.body.name.trim();
  }
  res.json({ program: await saveAndDecorate(req, program, { planChanged: false }) });
});

/**
 * Deep copy a program. The copy carries the plan only — logged sets stay with
 * the program they were logged against — and does not steal the active slot.
 */
router.post('/:id/duplicate', async (req, res) => {
  const source = await find(req);
  if (!source) return res.status(404).json({ error: 'Program not found' });

  const copy = {
    ...clone(source),
    id: uid('p'),
    name: uniqueName((await owned(req)).map((p) => p.name), source.name),
    isActive: false,
    createdAt: new Date().toISOString(),
    weeks: source.weeks.map((week) => ({
      index: week.index,
      sessions: copySessions(week.sessions, week.index),
    })),
  };
  await createProgram(copy);
  res.status(201).json({ program: decorate(await listLogs(req.user.id), copy) });
});

router.delete('/:id', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const wasActive = program.isActive;
  await deleteProgram(program.id);

  // Deleting the program you were training shouldn't strand you with nothing
  // active while other saved programs sit unreachable.
  let activated = null;
  if (wasActive) {
    const remaining = await owned(req);
    if (remaining[0]) {
      await setActiveProgram(req.user.id, remaining[0].id);
      activated = { id: remaining[0].id, name: remaining[0].name };
    }
  }

  // Logged history is deliberately kept. Nothing here touches the `logs`
  // table, and there is no foreign key from it that could have cascaded.
  res.json({ ok: true, activated });
});

// --------------------------------------------------------------------------
// Weeks
// --------------------------------------------------------------------------

const getWeek = (program, index) => program.weeks.find((w) => w.index === Number(index));

/** Append an empty week. Only ever appends, so no existing week shifts index. */
router.post('/:id/weeks', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  if (program.weeks.length >= 16) {
    return res.status(400).json({ error: 'A program can run up to 16 weeks.' });
  }
  const index = program.weeks.length;
  program.weeks.push({ index, sessions: [] });
  program.totalWeeks = program.weeks.length;
  res.status(201).json({ program: await saveAndDecorate(req, program), weekIndex: index });
});

/**
 * Remove the last week only. Dropping one from the middle would renumber every
 * week after it, and logged sets record the week index they were logged in —
 * they would all start pointing at the wrong week.
 */
router.delete('/:id/weeks/:week', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const index = Number(req.params.week);
  if (program.weeks.length <= 1) {
    return res.status(400).json({ error: 'A program needs at least one week.' });
  }
  if (index !== program.weeks.length - 1) {
    return res.status(400).json({
      error: 'Only the last week can be removed, so the weeks after it keep their numbers.',
    });
  }
  program.weeks.pop();
  program.totalWeeks = program.weeks.length;
  // Logged sets stay, exactly as when a session or program is deleted.
  res.json({ program: await saveAndDecorate(req, program) });
});

router.post('/:id/weeks/:week/clone', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const target = getWeek(program, req.params.week);
  const source = getWeek(program, req.body?.from);
  if (!target || !source) return res.status(404).json({ error: 'Week not found' });
  target.sessions = clone(source.sessions).map((s) => ({
    ...s,
    id: uid('s'),
    weekIndex: target.index,
    exercises: s.exercises.map((e) => ({ ...e, id: uid('ex') })),
  }));
  res.json({ program: await saveAndDecorate(req, program) });
});

router.post('/:id/weeks/:week/clear', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const week = getWeek(program, req.params.week);
  if (!week) return res.status(404).json({ error: 'Week not found' });
  week.sessions = [];
  res.json({ program: await saveAndDecorate(req, program) });
});

// --------------------------------------------------------------------------
// Sessions
// --------------------------------------------------------------------------

router.post('/:id/weeks/:week/sessions', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const week = getWeek(program, req.params.week);
  if (!week) return res.status(404).json({ error: 'Week not found' });

  const session = {
    id: uid('s'),
    day: Number.isFinite(req.body?.day) ? req.body.day : week.sessions.length,
    name: String(req.body?.name || `Session ${week.sessions.length + 1}`).trim(),
    type: req.body?.type || 'Full Body',
    weekIndex: week.index,
    exercises: [],
  };
  week.sessions.push(session);
  week.sessions.sort((a, b) => a.day - b.day);
  res.status(201).json({ program: await saveAndDecorate(req, program), sessionId: session.id });
});

function locateSession(program, weekIndex, sessionId) {
  const week = getWeek(program, weekIndex);
  const session = week?.sessions.find((s) => s.id === sessionId);
  return { week, session };
}

router.patch('/:id/weeks/:week/sessions/:sessionId', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const { week, session } = locateSession(program, req.params.week, req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (typeof req.body?.name === 'string' && req.body.name.trim()) session.name = req.body.name.trim();
  if (typeof req.body?.type === 'string') session.type = req.body.type;
  if (Number.isFinite(req.body?.day)) {
    session.day = req.body.day;
    week.sessions.sort((a, b) => a.day - b.day);
  }
  res.json({ program: await saveAndDecorate(req, program) });
});

/**
 * Copy a session into any week. Landing in the same week it came from, it gets
 * a "(copy)" name; sent to another week it keeps its own, because there it is
 * that week's version of the same session.
 */
router.post('/:id/weeks/:week/sessions/:sessionId/duplicate', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const { session } = locateSession(program, req.params.week, req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const targetIndex = Number.isFinite(req.body?.toWeek) ? req.body.toWeek : Number(req.params.week);
  const target = getWeek(program, targetIndex);
  if (!target) return res.status(404).json({ error: 'Week not found' });

  const taken = new Set(target.sessions.map((s) => s.day % 7));
  const requested = Number.isFinite(req.body?.day) ? Math.trunc(req.body.day) : null;

  if (requested != null) {
    if (requested < 0 || requested > 6) {
      return res.status(400).json({ error: 'Pick a day of the week.' });
    }
    // The client greys these out, but a stale view must not double-book a day.
    if (taken.has(requested)) {
      return res.status(400).json({
        error: `Week ${targetIndex + 1} already has a session on that day.`,
      });
    }
  }

  const day = requested ?? [0, 1, 2, 3, 4, 5, 6].find((d) => !taken.has(d));
  if (day == null) {
    return res.status(400).json({ error: `Week ${targetIndex + 1} already has a session every day.` });
  }

  const sameWeek = target.index === Number(req.params.week);
  const [copy] = copySessions([session], target.index);
  copy.day = day;
  copy.name = sameWeek ? uniqueName(target.sessions.map((s) => s.name), session.name) : session.name;

  target.sessions.push(copy);
  target.sessions.sort((a, b) => a.day - b.day);
  res.status(201).json({
    program: await saveAndDecorate(req, program),
    sessionId: copy.id,
    weekIndex: target.index,
  });
});

router.delete('/:id/weeks/:week/sessions/:sessionId', async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const { week, session } = locateSession(program, req.params.week, req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  week.sessions.splice(week.sessions.indexOf(session), 1);
  res.json({ program: await saveAndDecorate(req, program) });
});

// --------------------------------------------------------------------------
// Exercises inside a session
// --------------------------------------------------------------------------

const BASE = '/:id/weeks/:week/sessions/:sessionId/exercises';

router.post(BASE, async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const { session } = locateSession(program, req.params.week, req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const library = req.body?.exerciseId
    ? exercises.find((e) => e.id === Number(req.body.exerciseId))
    : null;
  const name = library?.name || String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Pick an exercise first.' });

  const entry = normalizeExerciseEntry({
    exerciseId: library?.id ?? null,
    name,
    category: library?.category || req.body?.category || 'Chest',
    sets: clampInt(req.body?.sets, 1, 10, 3),
    reps: clampInt(req.body?.reps, 1, 30, 8),
    rpe: clampHalf(req.body?.rpe, 5, 10, 7),
    restSeconds: req.body?.restSeconds ?? 180,
    note: req.body?.note || null,
  });
  session.exercises.push(entry);
  session.type = req.body?.keepType ? session.type : sessionType(session.exercises);
  res.status(201).json({ program: await saveAndDecorate(req, program), exerciseId: entry.id });
});

router.patch(`${BASE}/:entryId`, async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const { session } = locateSession(program, req.params.week, req.params.sessionId);
  const entry = session?.exercises.find((e) => e.id === req.params.entryId);
  if (!entry) return res.status(404).json({ error: 'Exercise not found' });

  if (req.body?.sets != null) entry.sets = clampInt(req.body.sets, 1, 10, entry.sets);
  if (req.body?.reps != null) entry.reps = clampInt(req.body.reps, 1, 30, entry.reps);
  if (req.body?.rpe != null) entry.rpe = clampHalf(req.body.rpe, 5, 10, entry.rpe);
  if (req.body?.restSeconds != null) {
    entry.restSeconds = clampInt(req.body.restSeconds, 15, 600, entry.restSeconds);
  }
  if (typeof req.body?.note === 'string') entry.note = req.body.note.trim() || null;
  res.json({ program: await saveAndDecorate(req, program) });
});

router.delete(`${BASE}/:entryId`, async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const { session } = locateSession(program, req.params.week, req.params.sessionId);
  const entry = session?.exercises.find((e) => e.id === req.params.entryId);
  if (!entry) return res.status(404).json({ error: 'Exercise not found' });
  session.exercises.splice(session.exercises.indexOf(entry), 1);
  if (session.exercises.length) session.type = sessionType(session.exercises);
  res.json({ program: await saveAndDecorate(req, program) });
});

router.put(`${BASE}`, async (req, res) => {
  const program = await find(req);
  if (!program) return res.status(404).json({ error: 'Program not found' });
  const { session } = locateSession(program, req.params.week, req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const order = Array.isArray(req.body?.order) ? req.body.order : [];
  const byId = new Map(session.exercises.map((e) => [e.id, e]));
  const reordered = order.map((id) => byId.get(id)).filter(Boolean);
  if (reordered.length === session.exercises.length) session.exercises = reordered;
  res.json({ program: await saveAndDecorate(req, program) });
});

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function clampHalf(value, min, max, fallback) {
  const n = Math.round(Number(value) * 2) / 2;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export default router;
