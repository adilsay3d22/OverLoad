import { Router } from 'express';
import { getActiveProgram, listLogs } from '../lib/repo.js';
import { requireAuth } from '../lib/auth.js';
import { exercises } from '../lib/catalog.js';
import { muscleMap, muscleNames } from '../lib/muscles.js';
import {
  personalRecords, exerciseSummaries, exerciseHistory, muscleBalance,
  programStats, dayStreak, weekSummary, est1RM, sessionProgress, CATEGORY_GROUP,
} from '../lib/progress.js';
import { nextSession } from './programs.js';

const router = Router();
router.use(requireAuth);

/**
 * Every handler here needs the same two things, and both are one round trip:
 * the active program and the user's whole log history. Loading them once at the
 * top and threading them down is what let `progress.js` drop its own data
 * access entirely.
 */
const load = async (userId) => {
  const [program, logs] = await Promise.all([getActiveProgram(userId), listLogs(userId)]);
  return { program, logs };
};

/** Everything the Home digest needs in one round trip. */
router.get('/home', async (req, res) => {
  const { program, logs } = await load(req.user.id);
  const week = weekSummary(logs, program);
  const next = program ? nextSession(logs, program) : null;

  const currentWeekIndex = next?.weekIndex ?? 0;
  const weekSessions = program
    ? (program.weeks.find((w) => w.index === currentWeekIndex)?.sessions || []).map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        day: s.day,
        exerciseCount: s.exercises.length,
        setCount: s.exercises.reduce((n, e) => n + e.sets, 0),
        progress: sessionProgress(logs, program, currentWeekIndex, s),
      }))
    : [];

  // Home leads with the exact set the lifter is about to do, so it needs the
  // exercise logging would resume on — not just the session it sits in.
  const upNext = next ? next.session.exercises[next.progress.nextExerciseIndex] : null;

  res.json({
    program: program
      ? { id: program.id, name: program.name, totalWeeks: program.totalWeeks, source: program.source }
      : null,
    weekIndex: currentWeekIndex,
    hero: next
      ? {
          weekIndex: next.weekIndex,
          sessionId: next.session.id,
          name: next.session.name,
          type: next.session.type,
          exerciseCount: next.session.exercises.length,
          setsLogged: next.progress.loggedSets,
          setsPlanned: next.progress.plannedSets,
          exercisesDone: next.progress.exercisesDone,
          next: upNext
            ? {
                name: upNext.name,
                category: upNext.category,
                sets: upNext.sets,
                reps: upNext.reps,
                repsUnit: upNext.repsUnit,
                rpe: upNext.rpe,
                rest: upNext.rest,
                note: upNext.note || null,
              }
            : null,
        }
      : null,
    stats: {
      week: currentWeekIndex + 1,
      sessionsThisWeek: week.sessionsThisWeek,
      streak: dayStreak(logs),
    },
    weekStrip: week.setsByDay,
    weekStart: week.weekStart,
    sessions: weekSessions,
    recentPRs: personalRecords(logs).slice(0, 3),
  });
});

/** Progress tab, top to bottom. */
router.get('/', async (req, res) => {
  const { program, logs } = await load(req.user.id);
  const summaries = exerciseSummaries(logs);
  const prs = personalRecords(logs);
  res.json({
    overall: program
      ? {
          programId: program.id,
          programName: program.name,
          totalWeeks: program.totalWeeks,
          currentWeek: (nextSession(logs, program)?.weekIndex ?? 0) + 1,
          ...programStats(logs, program),
        }
      : null,
    recentPRs: prs.slice(0, 5),
    prCount: prs.length,
    exercises: summaries,
    groups: ['All', ...new Set(summaries.map((s) => s.group))],
    balance: muscleBalance(logs, 30),
    hasData: summaries.length > 0,
  });
});

router.get('/prs', async (req, res) => {
  const prs = personalRecords(await listLogs(req.user.id));
  res.json({
    prs: prs.map((p) => ({ ...p, group: CATEGORY_GROUP[p.category] || p.category })),
    groups: ['All', ...new Set(prs.map((p) => CATEGORY_GROUP[p.category] || p.category))],
  });
});

router.get('/exercise/:key', async (req, res) => {
  const logs = await listLogs(req.user.id);
  const history = exerciseHistory(logs, req.params.key);
  if (!history.length) return res.status(404).json({ error: 'Nothing logged for this exercise yet.' });

  const summary = exerciseSummaries(logs).find((s) => s.key === req.params.key);
  const library =
    exercises.find((e) => e.slug === req.params.key) ||
    exercises.find((e) => e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === req.params.key) ||
    null;
  const best = history.reduce((a, p) => (p.weight * p.reps > a.weight * a.reps ? p : a));

  res.json({
    exercise: {
      key: req.params.key,
      name: summary?.name || library?.name || req.params.key,
      category: summary?.category || library?.category || 'Chest',
      group: summary?.group || CATEGORY_GROUP[library?.category] || 'Chest',
      equipment: library?.equipment || [],
      tier: library?.tier || null,
      muscles: library ? muscleMap(library, library.category) : null,
      muscleNames: library ? muscleNames(library, library.category) : null,
    },
    stats: {
      best: { weight: best.weight, reps: best.reps },
      est1RM: Math.round(est1RM(best.weight, best.reps) * 10) / 10,
      totalSets: history.reduce((n, p) => n + p.setCount, 0),
      sessions: history.length,
      lastTrained: history[history.length - 1].date,
    },
    history,
  });
});

export default router;
