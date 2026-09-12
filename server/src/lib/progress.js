/**
 * Everything derived from logged sets.
 *
 * These used to reach into the JSON store and filter it by user on every call,
 * which meant a single request could scan the whole table a dozen times. They
 * now take the user's logs as their first argument: the route loads them once
 * and passes them down. The data dependency is visible in every signature,
 * which is the point — nothing in this file can read anything it was not given.
 *
 * The aggregation stays in JavaScript rather than moving into SQL. At the scale
 * of one lifter's training history the difference is unmeasurable, and this is
 * the logic every screen's numbers depend on; rewriting it as queries would be
 * risking tested behaviour for no gain. If someone ever accumulates years of
 * logs, `personalRecords` and `exerciseSummaries` are the two worth moving.
 */

/** Epley. */
export const est1RM = (weight, reps) => (!weight || !reps ? 0 : weight * (1 + reps / 30));

/** The stable identity an exercise is tracked under across programs. */
export const exerciseKey = (e) =>
  e.slug || String(e.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The tag palette groups the 14 data categories into 7 colour families. */
export const CATEGORY_GROUP = {
  Chest: 'Chest', Back: 'Back', Traps: 'Back', Shoulders: 'Shoulders',
  Biceps: 'Arms', Triceps: 'Arms', Forearms: 'Arms',
  Quads: 'Legs', Hamstrings: 'Legs', Calves: 'Legs',
  Adductors: 'Legs', Abductors: 'Legs',
  Glutes: 'Glutes', Abs: 'Core',
};

const completedSets = (log) => (log.sets || []).filter((s) => s && s.complete);
const setVolume = (s) => (Number(s.weight) || 0) * (Number(s.reps) || 0);
const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);

export const scopeToProgram = (logs, programId) =>
  programId ? logs.filter((l) => l.programId === programId) : logs;

// ---------------------------------------------------------------------------
// Personal records
// ---------------------------------------------------------------------------

/**
 * Best set per exercise, ranked by weight x reps — the headline PR metric the
 * Programs tab's trophy card shows, not total volume.
 */
export function personalRecords(logs, { programId } = {}) {
  const byExercise = new Map();
  for (const log of scopeToProgram(logs, programId)) {
    for (const set of completedSets(log)) {
      const score = setVolume(set);
      if (!score) continue;
      const key = exerciseKey(log);
      const current = byExercise.get(key);
      if (!current || score > current.score) {
        byExercise.set(key, {
          key,
          name: log.name,
          category: log.category,
          slug: log.slug || null,
          exerciseId: log.exerciseId || null,
          weight: Number(set.weight),
          reps: Number(set.reps),
          score,
          est1RM: Math.round(est1RM(Number(set.weight), Number(set.reps)) * 10) / 10,
          date: set.at || log.date,
        });
      }
    }
  }
  return [...byExercise.values()].sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ---------------------------------------------------------------------------
// Per-exercise history
// ---------------------------------------------------------------------------

/** One point per logged session for an exercise, oldest first. */
export function exerciseHistory(logs, key) {
  const points = [];
  for (const log of logs) {
    if (exerciseKey(log) !== key) continue;
    const sets = completedSets(log);
    if (!sets.length) continue;
    const topSet = sets.reduce((a, b) => (setVolume(b) > setVolume(a) ? b : a));
    const rated = sets.filter((s) => s.actualRpe);
    points.push({
      logId: log.id,
      date: log.date,
      weekIndex: log.weekIndex,
      programId: log.programId,
      sessionName: log.sessionName,
      weight: Number(topSet.weight) || 0,
      reps: Number(topSet.reps) || 0,
      volume: sets.reduce((n, s) => n + setVolume(s), 0),
      setCount: sets.length,
      avgRpe: rated.length
        ? Math.round((rated.reduce((n, s) => n + Number(s.actualRpe), 0) / rated.length) * 10) / 10
        : null,
      sets: sets.map((s) => ({
        weight: Number(s.weight),
        reps: Number(s.reps),
        actualRpe: s.actualRpe ?? null,
      })),
    });
  }
  return points.sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** Compact per-exercise rollup used by the Exercise Progress list. */
export function exerciseSummaries(logs) {
  const seen = new Map();
  for (const log of logs) {
    if (!completedSets(log).length) continue;
    seen.set(exerciseKey(log), log);
  }
  return [...seen.entries()]
    .map(([key, log]) => {
      const history = exerciseHistory(logs, key);
      const best = history.reduce(
        (a, p) => (p.weight * p.reps > a.weight * a.reps ? p : a),
        { weight: 0, reps: 0 },
      );
      const first = history[0];
      const last = history[history.length - 1];
      return {
        key,
        name: log.name,
        category: log.category,
        group: CATEGORY_GROUP[log.category] || log.category,
        slug: log.slug || null,
        sessions: history.length,
        totalSets: history.reduce((n, p) => n + p.setCount, 0),
        best: { weight: best.weight, reps: best.reps },
        est1RM: Math.round(est1RM(best.weight, best.reps) * 10) / 10,
        lastTrained: last?.date || null,
        trend:
          first && last && first.weight
            ? Math.round(((last.weight - first.weight) / first.weight) * 100)
            : 0,
        spark: history.slice(-8).map((p) => p.weight),
      };
    })
    .sort((a, b) => new Date(b.lastTrained) - new Date(a.lastTrained));
}

// ---------------------------------------------------------------------------
// Session + program aggregates
// ---------------------------------------------------------------------------

/** A session counts as done once every planned exercise has all its sets checked. */
export function sessionProgress(logs, program, weekIndex, session) {
  const scoped = logs.filter(
    (l) =>
      l.programId === program.id && l.weekIndex === weekIndex && l.sessionId === session.id,
  );
  const byEntry = new Map(scoped.map((l) => [l.entryId, l]));
  let done = 0;
  let plannedSets = 0;
  let loggedSets = 0;
  // Where logging should resume: the first exercise still missing sets.
  let nextExerciseIndex = -1;
  session.exercises.forEach((ex, index) => {
    plannedSets += ex.sets;
    const log = byEntry.get(ex.id);
    const n = log ? completedSets(log).length : 0;
    loggedSets += Math.min(n, ex.sets);
    if (n >= ex.sets) done += 1;
    else if (nextExerciseIndex === -1) nextExerciseIndex = index;
  });
  return {
    exercisesDone: done,
    exerciseCount: session.exercises.length,
    nextExerciseIndex: nextExerciseIndex === -1 ? 0 : nextExerciseIndex,
    plannedSets,
    loggedSets,
    complete: session.exercises.length > 0 && done === session.exercises.length,
    started: loggedSets > 0,
    lastLoggedAt: scoped.reduce((a, l) => (a && a > l.date ? a : l.date), null),
  };
}

export function countCompletedSessions(logs, program) {
  let n = 0;
  for (const week of program.weeks) {
    for (const session of week.sessions) {
      if (sessionProgress(logs, program, week.index, session).complete) n += 1;
    }
  }
  return n;
}

export function programStats(logs, program) {
  if (!program) return null;
  const scoped = scopeToProgram(logs, program.id);
  const setsLogged = scoped.reduce((n, l) => n + completedSets(l).length, 0);
  const sessionsCompleted = countCompletedSessions(logs, program);
  const totalSessions = program.weeks.reduce((n, w) => n + w.sessions.length, 0);
  const bestPR = personalRecords(logs, { programId: program.id }).reduce(
    (a, p) => (!a || p.score > a.score ? p : a),
    null,
  );
  return {
    sessionsCompleted,
    totalSessions,
    setsLogged,
    percentComplete: totalSessions ? Math.round((sessionsCompleted / totalSessions) * 100) : 0,
    bestPR,
    totalVolume: scoped.reduce(
      (n, l) => n + completedSets(l).reduce((m, s) => m + setVolume(s), 0),
      0,
    ),
  };
}

/** Consecutive days ending today (or yesterday) with at least one logged set. */
export function dayStreak(logs) {
  const days = new Set();
  for (const log of logs) {
    for (const set of completedSets(log)) days.add(dayKey(set.at || log.date));
  }
  if (!days.size) return 0;
  const cursor = new Date();
  cursor.setUTCHours(12, 0, 0, 0);
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** Share of sets per muscle-colour group over a trailing window. */
export function muscleBalance(logs, days = 30) {
  const since = Date.now() - days * 86400000;
  const counts = {};
  let total = 0;
  for (const log of logs) {
    for (const set of completedSets(log)) {
      if (new Date(set.at || log.date).getTime() < since) continue;
      const group = CATEGORY_GROUP[log.category] || log.category;
      counts[group] = (counts[group] || 0) + 1;
      total += 1;
    }
  }
  if (!total) return [];
  return Object.entries(counts)
    .map(([group, sets]) => ({ group, sets, percent: Math.round((sets / total) * 100) }))
    .sort((a, b) => b.sets - a.sets);
}

/** Sessions completed inside the current calendar week (Mon-Sun). */
export function weekSummary(logs, program) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  const startMs = start.getTime();

  const days = new Array(7).fill(0);
  for (const log of logs) {
    for (const set of completedSets(log)) {
      const t = new Date(set.at || log.date);
      const idx = Math.floor((t.getTime() - startMs) / 86400000);
      if (idx >= 0 && idx < 7) days[idx] += 1;
    }
  }
  return {
    weekStart: start.toISOString(),
    setsByDay: days,
    daysTrained: days.filter(Boolean).length,
    sessionsThisWeek: program ? countSessionsCompletedSince(logs, program, startMs) : 0,
  };
}

function countSessionsCompletedSince(logs, program, sinceMs) {
  let n = 0;
  for (const week of program.weeks) {
    for (const session of week.sessions) {
      const p = sessionProgress(logs, program, week.index, session);
      if (p.complete && p.lastLoggedAt && new Date(p.lastLoggedAt).getTime() >= sinceMs) n += 1;
    }
  }
  return n;
}
