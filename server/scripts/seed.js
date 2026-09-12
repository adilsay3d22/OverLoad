/**
 * Development seed: one account, one template program, and three weeks of
 * logged sets with a believable progression and back-dated timestamps so the
 * Progress screens have real history to chart.
 *
 * Run with the API stopped:  npm run db:seed
 *
 * This wipes and rewrites the seeded account only. Other accounts in the same
 * database are untouched — it is a developer fixture, never shipped content,
 * and a first-time user must still see genuinely empty screens.
 */
import bcrypt from 'bcryptjs';
import { sql } from '../src/lib/sql.js';
import { createProgram, createUser, ensureLog, putSet } from '../src/lib/repo.js';
import { templates, uid } from '../src/lib/catalog.js';

/**
 * A guard, not a formality.
 *
 * This script writes three weeks of fabricated training history, and it very
 * nearly went into the production branch by accident. It now refuses to run
 * unless the environment says out loud that it is a development one, which the
 * dev `.env` does and a deployment never will. A fixture that cannot reach
 * production is worth more than one everybody remembers not to run.
 */
if (process.env.OVERLOAD_ALLOW_SEED !== '1') {
  console.error(`Refusing to seed: OVERLOAD_ALLOW_SEED is not set to 1.

This writes fabricated training history and must never touch a database that
real people use. Set OVERLOAD_ALLOW_SEED=1 in the .env of a development branch,
and never in a deployment.`);
  process.exit(1);
}

const EMAIL = 'dessa@ironwork.dev';
const PASSWORD = 'deadlift842';

const day = 86400000;
const at = (daysAgo, hour = 18) => {
  const d = new Date(Date.now() - daysAgo * day);
  d.setHours(hour, 12, 0, 0);
  return d.toISOString();
};

/** Starting load per exercise category, in kg. */
const OPENING_LOAD = {
  Chest: 60, Back: 52, Shoulders: 12, Biceps: 14, Triceps: 22, Traps: 60,
  Quads: 80, Hamstrings: 70, Glutes: 75, Calves: 60, Abs: 0,
  Adductors: 40, Abductors: 45, Forearms: 20,
};

const round = (n) => Math.round(n * 2) / 2;

// Start this account from scratch. `on delete cascade` takes the programs,
// weeks, sessions, entries and logged sets with the user row.
await sql`delete from users where email = ${EMAIL}`;

const user = {
  id: uid('u'),
  name: 'Dessa Okonkwo',
  email: EMAIL,
  passwordHash: bcrypt.hashSync(PASSWORD, 10),
  units: 'kg',
  restDefaultSeconds: 180,
  restPresentation: 'fullscreen',
  createdAt: at(30),
};
await createUser(user);

const template = templates.find((t) => t.id === 'upper-lower-program-nippard');
const program = {
  id: uid('p'),
  userId: user.id,
  name: template.name,
  source: 'template',
  templateId: template.id,
  tagline: template.tagline,
  totalWeeks: template.totalWeeks,
  daysPerWeek: template.daysPerWeek,
  isActive: true,
  createdAt: at(21),
  weeks: structuredClone(template.weeks).map((week) => ({
    index: week.index,
    sessions: week.sessions.map((s) => ({
      ...s,
      id: uid('s'),
      exercises: s.exercises.map((e) => ({ ...e, id: uid('ex') })),
    })),
  })),
};
await createProgram(program);

// Weeks 1 and 2 fully logged, week 3 part-way through — which is what the
// "Continue Training" and per-week completion states are built to show.
const pendingLogs = [];

const PLAN = [
  { week: 0, daysAgo: 21 },
  { week: 1, daysAgo: 14 },
  { week: 2, daysAgo: 7, stopAfterSessions: 3 },
];

let logCount = 0;

for (const phase of PLAN) {
  const week = program.weeks[phase.week];
  const sessions = phase.stopAfterSessions
    ? week.sessions.slice(0, phase.stopAfterSessions)
    : week.sessions;

  sessions.forEach((session, sessionIndex) => {
    const daysAgo = Math.max(1, phase.daysAgo - sessionIndex * 2);

    session.exercises.forEach((entry, exerciseIndex) => {
      const base = OPENING_LOAD[entry.category] ?? 30;
      // Roughly 2.5% a week, plus a little variation between movements.
      const load = base * (1 + phase.week * 0.035) * (1 - exerciseIndex * 0.015);

      const sets = Array.from({ length: entry.sets }, (_, setIndex) => {
        const fatigue = setIndex * 0.02;
        const weight = base === 0 ? 0 : round(Math.max(2.5, load * (1 - fatigue)));
        const reps = Math.max(1, entry.reps - (setIndex > 1 ? 1 : 0));
        return {
          weight,
          reps,
          actualRpe: Math.min(10, entry.rpe + setIndex * 0.5),
          complete: true,
          at: at(daysAgo, 18 + Math.min(2, exerciseIndex)),
        };
      });

      pendingLogs.push({
        id: uid('l'),
        userId: user.id,
        programId: program.id,
        programName: program.name,
        weekIndex: week.index,
        sessionId: session.id,
        sessionName: session.name,
        sessionType: session.type,
        entryId: entry.id,
        exerciseId: entry.exerciseId,
        slug: entry.slug,
        name: entry.name,
        category: entry.category,
        date: at(daysAgo),
        sets,
      });
      logCount += 1;
    });
  });
}

// A couple of sessions in the last three days keep the streak and the
// "this week" numbers alive.
const recent = program.weeks[2].sessions[3];
recent.exercises.forEach((entry, i) => {
  const base = OPENING_LOAD[entry.category] ?? 30;
  pendingLogs.push({
    id: uid('l'),
    userId: user.id,
    programId: program.id,
    programName: program.name,
    weekIndex: 2,
    sessionId: recent.id,
    sessionName: recent.name,
    sessionType: recent.type,
    entryId: entry.id,
    exerciseId: entry.exerciseId,
    slug: entry.slug,
    name: entry.name,
    category: entry.category,
    date: at(1),
    sets: Array.from({ length: Math.max(1, entry.sets - (i > 2 ? 1 : 0)) }, (_, s) => ({
      weight: base === 0 ? 0 : round(base * 1.08 * (1 - s * 0.02)),
      reps: entry.reps,
      actualRpe: entry.rpe + s * 0.5,
      complete: true,
      at: at(1, 19),
    })),
  });
  logCount += 1;
});

for (const log of pendingLogs) {
  const written = await ensureLog(log);
  const sets = log.sets || [];
  for (let i = 0; i < sets.length; i += 1) {
    if (sets[i]) await putSet(written.id, i, sets[i]);
  }
}

setTimeout(() => {
  console.log(`Seeded ${user.email} / ${PASSWORD}`);
  console.log(`  program: ${program.name}`);
  console.log(`  exercise logs: ${logCount}`);
}, 50);
