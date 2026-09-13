import { sql } from './sql.js';

/**
 * Data access.
 *
 * Everything below returns the shapes the routes already speak — a program with
 * `weeks[].sessions[].exercises[]`, a log with `sets[]` — so the schema change
 * stops here rather than spreading through every screen's contract.
 *
 * Two different write strategies, chosen per aggregate rather than uniformly:
 *
 *   * **The plan is written whole.** Weeks, sessions and planned exercises are
 *     always edited as one object — adding a week, cloning a session, reordering
 *     exercises — and are only ever touched by their single owner. `replacePlan`
 *     swaps the lot inside one transaction. This keeps the plan-editing routes
 *     working on plain arrays, which is where all the tested logic lives.
 *
 *   * **Logs are written per row.** They are the hot path, they are appended to
 *     forever, and a set written in a basement gym must not depend on having
 *     read the whole history first. `putSet` touches exactly one row.
 *
 * The read-modify-write on plans is safe because a plan has exactly one writer.
 * If Overload ever grows shared or coached programs, that is the assumption that
 * breaks, and the plan writes have to become per-row like the logs.
 */

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const rowToUser = (r) =>
  r && {
    id: r.id,
    email: r.email,
    name: r.name,
    passwordHash: r.password_hash,
    units: r.units,
    restDefaultSeconds: r.rest_default_seconds,
    restPresentation: r.rest_presentation,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };

export const findUserByEmail = async (email) =>
  rowToUser((await sql`select * from users where email = ${email}`)[0]);

export const findUserById = async (id) =>
  rowToUser((await sql`select * from users where id = ${id}`)[0]);

export async function createUser(user) {
  const [row] = await sql`
    insert into users (id, email, name, password_hash, units, rest_default_seconds, rest_presentation)
    values (${user.id}, ${user.email}, ${user.name}, ${user.passwordHash},
            ${user.units}, ${user.restDefaultSeconds}, ${user.restPresentation})
    returning *`;
  return rowToUser(row);
}

export async function updateUser(id, patch) {
  const [row] = await sql`
    update users set
      name                 = coalesce(${patch.name ?? null}, name),
      units                = coalesce(${patch.units ?? null}, units),
      rest_default_seconds = coalesce(${patch.restDefaultSeconds ?? null}, rest_default_seconds),
      rest_presentation    = coalesce(${patch.restPresentation ?? null}, rest_presentation)
    where id = ${id}
    returning *`;
  return rowToUser(row);
}

// ---------------------------------------------------------------------------
// Programs and saved templates — the same shape, told apart by `kind`
// ---------------------------------------------------------------------------

const num = (v) => (v == null ? null : Number(v));

const rowToEntry = (r) => ({
  id: r.id,
  exerciseId: r.exercise_id,
  slug: r.slug,
  name: r.name,
  category: r.category,
  sets: r.sets,
  reps: num(r.reps),
  repsUnit: r.reps_unit,
  rpe: num(r.rpe),
  restSeconds: r.rest_seconds,
  note: r.note,
});

const rowToProgram = (r) => ({
  id: r.id,
  userId: r.user_id,
  kind: r.kind,
  name: r.name,
  source: r.source,
  templateId: r.template_id,
  savedTemplateId: r.saved_template_id,
  tagline: r.tagline,
  totalWeeks: r.total_weeks,
  daysPerWeek: r.days_per_week,
  isActive: r.is_active,
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  weeks: [],
});

/**
 * Hydrate a set of programs in one query.
 *
 * This used to be four flat reads — programs, then weeks, then sessions, then
 * entries — each one waiting on the ids the previous one returned. That is fine
 * when the database is next to the process. It is not fine here: the serverless
 * function and Neon talk over HTTP, so every `await sql` is a network round
 * trip, and four of them in a row was most of the time it took to open a screen.
 *
 * So the nesting happens in Postgres instead, via lateral joins that build the
 * `weeks[].sessions[].exercises[]` shape as JSON. The rows inside come back in
 * their raw column form, which is why the same `rowToEntry` mapper still runs
 * over them: only the number of round trips changed, not the contract.
 */
async function hydrate(programRows) {
  const programs = programRows.map(rowToProgram);
  if (!programs.length) return programs;

  const ids = programs.map((p) => p.id);
  const rows = await sql`
    select
      p.id,
      coalesce(wk.weeks, '[]'::json) as weeks
    from programs p
    left join lateral (
      select json_agg(
        json_build_object('index', w.idx, 'sessions', coalesce(se.sessions, '[]'::json))
        order by w.idx
      ) as weeks
      from weeks w
      left join lateral (
        select json_agg(
          json_build_object(
            'id', s.id, 'name', s.name, 'type', s.type, 'day', s.day,
            'exercises', coalesce(en.entries, '[]'::json)
          )
          order by s.position
        ) as sessions
        from sessions s
        left join lateral (
          select json_agg(to_json(e) order by e.position) as entries
          from entries e
          where e.session_id = s.id
        ) en on true
        where s.week_id = w.id
      ) se on true
      where w.program_id = p.id
    ) wk on true
    where p.id = any(${ids})`;

  const weeksById = new Map(rows.map((r) => [r.id, r.weeks || []]));
  for (const program of programs) {
    program.weeks = (weeksById.get(program.id) || []).map((week) => ({
      index: week.index,
      sessions: (week.sessions || []).map((session) => ({
        id: session.id,
        name: session.name,
        type: session.type,
        day: session.day,
        exercises: (session.exercises || []).map(rowToEntry),
      })),
    }));
  }
  return programs;
}

export async function listPrograms(userId, kind = 'program') {
  const rows = await sql`
    select * from programs
    where user_id = ${userId} and kind = ${kind}
    order by created_at desc`;
  return hydrate(rows);
}

export async function getProgram(userId, id) {
  const rows = await sql`
    select * from programs where id = ${id} and user_id = ${userId}`;
  const [program] = await hydrate(rows);
  return program || null;
}

export async function getActiveProgram(userId) {
  const rows = await sql`
    select * from programs
    where user_id = ${userId} and kind = 'program' and is_active
    limit 1`;
  const [program] = await hydrate(rows);
  return program || null;
}

/** Statements that write one program's weeks, sessions and planned exercises. */
function planStatements(programId, weeks) {
  const out = [sql`delete from weeks where program_id = ${programId}`];
  for (const week of weeks) {
    out.push(sql`
      insert into weeks (program_id, idx) values (${programId}, ${week.index})`);
  }
  return out;
}

/**
 * Replace a program's whole plan.
 *
 * Two passes, because sessions need the generated week ids: the transaction
 * writes the weeks, then a second transaction writes everything hanging off
 * them. Splitting it means a crash between the two leaves a program with weeks
 * and no sessions — recoverable, and visibly wrong, which is better than the
 * alternative of holding a session open across the HTTP driver.
 */
export async function replacePlan(programId, weeks) {
  await sql.transaction(planStatements(programId, weeks));
  const weekRows = await sql`
    select id, idx from weeks where program_id = ${programId}`;
  const weekIdByIndex = new Map(weekRows.map((w) => [w.idx, w.id]));

  const statements = [];
  for (const week of weeks) {
    const weekId = weekIdByIndex.get(week.index);
    if (weekId == null) continue;
    (week.sessions || []).forEach((session, position) => {
      statements.push(sql`
        insert into sessions (id, week_id, position, name, type, day)
        values (${session.id}, ${weekId}, ${position}, ${session.name},
                ${session.type ?? null}, ${session.day ?? null})`);
      (session.exercises || []).forEach((entry, entryPosition) => {
        statements.push(sql`
          insert into entries (id, session_id, position, exercise_id, slug, name, category,
                               sets, reps, reps_unit, rpe, rest_seconds, note)
          values (${entry.id}, ${session.id}, ${entryPosition}, ${entry.exerciseId ?? null},
                  ${entry.slug ?? null}, ${entry.name}, ${entry.category},
                  ${entry.sets ?? 3}, ${entry.reps ?? 8}, ${entry.repsUnit || 'reps'},
                  ${entry.rpe ?? null}, ${entry.restSeconds ?? null}, ${entry.note ?? null})`);
      });
    });
  }
  if (statements.length) await sql.transaction(statements);
}

export async function createProgram(program) {
  await sql`
    insert into programs (id, user_id, kind, name, source, template_id, saved_template_id,
                          tagline, total_weeks, days_per_week, is_active, created_at)
    values (${program.id}, ${program.userId}, ${program.kind || 'program'}, ${program.name},
            ${program.source ?? null}, ${program.templateId ?? null},
            ${program.savedTemplateId ?? null}, ${program.tagline ?? null},
            ${program.totalWeeks}, ${program.daysPerWeek ?? null},
            ${program.isActive ?? false}, ${program.createdAt || new Date().toISOString()})`;
  await replacePlan(program.id, program.weeks || []);
  return program;
}

export async function updateProgramMeta(id, patch) {
  await sql`
    update programs set
      name          = coalesce(${patch.name ?? null}, name),
      total_weeks   = coalesce(${patch.totalWeeks ?? null}, total_weeks),
      days_per_week = coalesce(${patch.daysPerWeek ?? null}, days_per_week)
    where id = ${id}`;
}

export const deleteProgram = (id) => sql`delete from programs where id = ${id}`;

/**
 * One active program per user. The unique index makes the database the
 * authority, so this clears the old one first rather than racing it.
 */
export async function setActiveProgram(userId, id) {
  await sql`
    update programs set is_active = false
    where user_id = ${userId} and kind = 'program' and is_active`;
  if (id) await sql`update programs set is_active = true where id = ${id}`;
}

// ---------------------------------------------------------------------------
// Logs — the part that outlives every plan
// ---------------------------------------------------------------------------

const rowToLog = (r, sets) => ({
  id: r.id,
  userId: r.user_id,
  programId: r.program_id,
  programName: r.program_name,
  weekIndex: r.week_index,
  sessionId: r.session_id,
  sessionName: r.session_name,
  sessionType: r.session_type,
  entryId: r.entry_id,
  exerciseId: r.exercise_id,
  slug: r.slug,
  name: r.name,
  category: r.category,
  date: r.logged_at instanceof Date ? r.logged_at.toISOString() : r.logged_at,
  sets: sets || [],
});

/**
 * Sets keyed by their planned index, not their position in the array.
 *
 * A lifter can check set 3 off before set 2 — correcting one, or skipping a
 * warm-up — so the gaps are real and the array has to stay sparse. Packing it
 * would silently slide every later set one place up the screen.
 */
function setsFromJson(json) {
  const sets = [];
  for (const row of json || []) sets[row.idx] = rowToSet(row);
  return sets;
}

/**
 * Timestamps arrive as a `Date` from a plain column read and as Postgres' own
 * `+00:00` text once the row has been through `to_json`. Both mean the same
 * instant; normalising keeps the shape the client has always been handed.
 */
const iso = (v) => {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? v : parsed.toISOString();
};

const rowToSet = (r) => ({
  weight: num(r.weight),
  reps: num(r.reps),
  actualRpe: num(r.actual_rpe),
  complete: r.complete,
  at: iso(r.at),
});

/**
 * Every log for a user, sets included, in one query.
 *
 * The progress aggregates — personal records, per-exercise history, muscle
 * balance, streaks — are a page of well-tested JavaScript that runs over this
 * array. Expressing them as SQL would be faster and is the right move once
 * anyone has years of history; at the scale of one lifter's training block it
 * would be rewriting working code for no measurable gain, so the query stays
 * simple and the aggregation stays where it is.
 *
 * The sets are gathered by a lateral join rather than by a second read keyed on
 * the ids the first one returned, for the same reason `hydrate` stopped doing
 * that: each `await sql` is a round trip to another continent, and this is on
 * the path of nearly every authenticated request in the app.
 */
export async function listLogs(userId) {
  const rows = await sql`
    select l.*, coalesce(ls.sets, '[]'::json) as sets
    from logs l
    left join lateral (
      select json_agg(to_json(x) order by x.idx) as sets
      from log_sets x
      where x.log_id = l.id
    ) ls on true
    where l.user_id = ${userId}
    order by l.logged_at`;
  return rows.map((r) => rowToLog(r, setsFromJson(r.sets)));
}

export async function findLog({ userId, programId, weekIndex, sessionId, entryId }) {
  const [row] = await sql`
    select l.*, coalesce(ls.sets, '[]'::json) as sets
    from logs l
    left join lateral (
      select json_agg(to_json(x) order by x.idx) as sets
      from log_sets x
      where x.log_id = l.id
    ) ls on true
    where l.user_id = ${userId} and l.program_id = ${programId}
      and l.week_index = ${weekIndex} and l.session_id = ${sessionId}
      and l.entry_id = ${entryId}`;
  if (!row) return null;
  return rowToLog(row, setsFromJson(row.sets));
}

/** Create the log row for an exercise the first time one of its sets is saved. */
export async function ensureLog(log) {
  await sql`
    insert into logs (id, user_id, program_id, program_name, week_index, session_id,
                      session_name, session_type, entry_id, exercise_id, slug, name,
                      category, logged_at)
    values (${log.id}, ${log.userId}, ${log.programId}, ${log.programName ?? null},
            ${log.weekIndex}, ${log.sessionId}, ${log.sessionName ?? null},
            ${log.sessionType ?? null}, ${log.entryId}, ${log.exerciseId ?? null},
            ${log.slug ?? null}, ${log.name}, ${log.category ?? null},
            ${log.date || new Date().toISOString()})
    on conflict (user_id, program_id, week_index, session_id, entry_id) do nothing`;
  return findLog(log);
}

/** One set. Idempotent by (log, index), which is what makes the client's
 *  offline replay queue safe to run more than once. */
export async function putSet(logId, index, set) {
  await sql`
    insert into log_sets (log_id, idx, weight, reps, actual_rpe, complete, at)
    values (${logId}, ${index}, ${set.weight ?? null}, ${set.reps ?? null},
            ${set.actualRpe ?? null}, ${set.complete ?? false}, ${set.at ?? null})
    on conflict (log_id, idx) do update set
      weight = excluded.weight, reps = excluded.reps, actual_rpe = excluded.actual_rpe,
      complete = excluded.complete, at = excluded.at`;
}

export const deleteLogSets = (logId) => sql`delete from log_sets where log_id = ${logId}`;

/**
 * Save one set, creating its parent log row if this is the first set of the
 * exercise, in a single statement.
 *
 * The sequence this replaces was three round trips — look the log up, insert it
 * if missing, then write the set — on the one request a lifter makes between
 * every pair of sets. Here the upsert on `logs` is a CTE whose `returning`
 * feeds the upsert on `log_sets`, so the parent is resolved and the child
 * written in one trip to the database.
 *
 * The `do update` on the log is deliberately a no-op that rewrites `entry_id`
 * with its own value. `do nothing` would return no row when another request had
 * already created the log, leaving nothing for the set to hang off; this way
 * the id comes back whether the insert or the conflict won, and the log's copy
 * of the program and session names still never changes after it is written.
 *
 * Both halves stay idempotent by (log, index), which is what makes the client's
 * offline replay queue safe to run more than once.
 */
export async function writeSet(shell, index, set) {
  const [row] = await sql`
    with up as (
      insert into logs (id, user_id, program_id, program_name, week_index, session_id,
                        session_name, session_type, entry_id, exercise_id, slug, name,
                        category, logged_at)
      values (${shell.id}, ${shell.userId}, ${shell.programId}, ${shell.programName ?? null},
              ${shell.weekIndex}, ${shell.sessionId}, ${shell.sessionName ?? null},
              ${shell.sessionType ?? null}, ${shell.entryId}, ${shell.exerciseId ?? null},
              ${shell.slug ?? null}, ${shell.name}, ${shell.category ?? null},
              ${shell.date || new Date().toISOString()})
      on conflict (user_id, program_id, week_index, session_id, entry_id)
        do update set entry_id = logs.entry_id
      returning id
    )
    insert into log_sets (log_id, idx, weight, reps, actual_rpe, complete, at)
    select up.id, ${index}, ${set.weight ?? null}, ${set.reps ?? null},
           ${set.actualRpe ?? null}, ${set.complete ?? false}, ${set.at ?? null}
    from up
    on conflict (log_id, idx) do update set
      weight = excluded.weight, reps = excluded.reps, actual_rpe = excluded.actual_rpe,
      complete = excluded.complete, at = excluded.at
    returning log_id`;
  return row?.log_id ?? shell.id;
}

// ---------------------------------------------------------------------------
// Custom exercises
// ---------------------------------------------------------------------------

const rowToCustom = (r) => ({
  // Prefixed so a custom id can never be mistaken for a library id, which is a
  // plain integer. The two are mixed in one search result list.
  id: r.id,
  custom: true,
  slug: r.slug,
  name: r.name,
  category: r.category,
  equipment: r.equipment || [],
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
});

export async function listCustomExercises(userId) {
  const rows = await sql`
    select * from custom_exercises where user_id = ${userId} order by name`;
  return rows.map(rowToCustom);
}

export async function createCustomExercise(exercise) {
  const rows = await sql`
    insert into custom_exercises (id, user_id, slug, name, category, equipment)
    values (${exercise.id}, ${exercise.userId}, ${exercise.slug}, ${exercise.name},
            ${exercise.category}, ${JSON.stringify(exercise.equipment || [])}::jsonb)
    on conflict (user_id, slug) do nothing
    returning *`;
  return rows.length ? rowToCustom(rows[0]) : null;
}

export async function deleteCustomExercise(userId, id) {
  const rows = await sql`
    delete from custom_exercises where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}
