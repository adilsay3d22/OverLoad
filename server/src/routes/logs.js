import { Router } from 'express';
import {
  ensureLog, findLog, getProgram, listLogs, listPrograms, putSet,
} from '../lib/repo.js';
import { requireAuth } from '../lib/auth.js';
import { uid } from '../lib/catalog.js';
import { sessionProgress, exerciseHistory, exerciseKey } from '../lib/progress.js';

const router = Router();
router.use(requireAuth);

async function locate(userId, { programId, week, sessionId }) {
  const program = await getProgram(userId, programId);
  const weekIndex = Number(week);
  const session = program?.weeks
    .find((w) => w.index === weekIndex)
    ?.sessions.find((s) => s.id === sessionId);
  return { program, weekIndex, session };
}

/**
 * One log document per planned exercise entry. Every entry records the program
 * it belongs to so week+day slots never collide across programs.
 */
function logShell(userId, program, weekIndex, session, entry) {
  return {
    id: uid('l'),
    userId,
    programId: program.id,
    programName: program.name,
    weekIndex,
    sessionId: session.id,
    sessionName: session.name,
    sessionType: session.type,
    entryId: entry.id,
    exerciseId: entry.exerciseId,
    slug: entry.slug,
    name: entry.name,
    category: entry.category,
    date: new Date().toISOString(),
  };
}

const blankSet = () => ({ weight: null, reps: null, actualRpe: null, complete: false, at: null });

/** Plan + logged state for one session, which is what both logging screens read. */
router.get('/session/:programId/:week/:sessionId', async (req, res) => {
  const { program, weekIndex, session } = await locate(req.user.id, req.params);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const logs = await listLogs(req.user.id);
  const byEntry = new Map(
    logs
      .filter(
        (l) => l.programId === program.id && l.weekIndex === weekIndex && l.sessionId === session.id,
      )
      .map((l) => [l.entryId, l]),
  );

  const exercises = session.exercises.map((entry) => {
    const log = byEntry.get(entry.id) || null;
    const sets = Array.from({ length: entry.sets }, (_, i) => log?.sets?.[i] || blankSet());
    const history = exerciseHistory(logs, exerciseKey(entry)).filter(
      (p) => p.logId !== log?.id,
    );
    // `targetSets` is the planned count, `sets` the logged rows — keeping both
    // under one name is what makes half-migrated schemas break silently.
    const { sets: targetSets, ...plan } = entry;
    return {
      ...plan,
      key: exerciseKey(entry),
      targetSets,
      sets,
      completedSets: sets.filter((s) => s.complete).length,
      history,
    };
  });

  res.json({
    program: { id: program.id, name: program.name, totalWeeks: program.totalWeeks },
    weekIndex,
    session: { id: session.id, name: session.name, type: session.type, day: session.day },
    exercises,
    progress: sessionProgress(logs, program, weekIndex, session),
  });
});

/** Persist one set. Called the moment its check button is tapped. */
router.put('/session/:programId/:week/:sessionId/:entryId/sets/:setIndex', async (req, res) => {
  const { program, weekIndex, session } = await locate(req.user.id, req.params);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const entry = session.exercises.find((e) => e.id === req.params.entryId);
  if (!entry) return res.status(404).json({ error: 'Exercise not found' });

  const index = Number(req.params.setIndex);
  if (!Number.isInteger(index) || index < 0 || index >= entry.sets) {
    return res.status(400).json({ error: 'Set is outside the plan.' });
  }

  const weight = req.body?.weight === '' || req.body?.weight == null ? null : Number(req.body.weight);
  const reps = req.body?.reps === '' || req.body?.reps == null ? null : Number(req.body.reps);
  const actualRpe =
    req.body?.actualRpe === '' || req.body?.actualRpe == null ? null : Number(req.body.actualRpe);
  const complete = Boolean(req.body?.complete);

  if (complete && (!weight && weight !== 0 || !reps)) {
    return res.status(400).json({ error: 'Add weight and reps before checking the set off.' });
  }

  const existing = await findLog({
    userId: req.user.id, programId: program.id, weekIndex, sessionId: session.id, entryId: entry.id,
  });
  const log = existing
    || (await ensureLog(logShell(req.user.id, program, weekIndex, session, entry)));

  const saved = {
    weight,
    reps,
    actualRpe,
    complete,
    // Un-checking a set keeps the timestamp of when it was done, so a
    // correction does not rewrite when the work happened.
    at: complete ? new Date().toISOString() : (log.sets[index]?.at ?? null),
  };
  await putSet(log.id, index, saved);

  res.json({
    set: saved,
    progress: sessionProgress(await listLogs(req.user.id), program, weekIndex, session),
    restSeconds: entry.restSeconds,
  });
});

/** Everything this account has logged, for the Profile screen's export. */
router.get('/export', async (req, res) => {
  const logs = await listLogs(req.user.id);
  const programs = await listPrograms(req.user.id);
  res.json({
    exportedAt: new Date().toISOString(),
    account: { name: req.user.name, email: req.user.email, units: req.user.units },
    programs: programs.map(({ userId, ...rest }) => rest),
    logs: logs.map(({ userId, ...rest }) => rest),
  });
});

router.get('/history/:key', async (req, res) => {
  res.json({ history: exerciseHistory(await listLogs(req.user.id), req.params.key) });
});

export default router;
