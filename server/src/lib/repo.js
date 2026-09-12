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
 * Hydrate a set of programs in four queries rather than one per week.
 *
 * The obvious shape — a join across programs, weeks, sessions and entries —
 * multiplies every program row by its entry count and then needs unpicking in
 * JS anyway. Four flat reads keyed by id are less clever and considerably less
 * code, and at one user's scale the difference is noise.
 */
async function hydrate(programRows) {
  const programs = programRows.map(rowToProgram);
  if (!programs.length) return programs;

  const ids = programs.map((p) => p.id);
  const weekRows = await sql`
    select * from weeks where program_id = any(${ids}) order by idx`;
  if (!weekRows.length) return programs;

  const weekIds = weekRows.map((w) => w.id);
  const sessionRows = await sql`
    select * from sessions where week_id = any(${weekIds}) order by position`;
  const sessionIds = sessionRows.map((s) => s.id);
  const entryRows = sessionIds.length
    ? await sql`select * from entries where session_id = any(${sessionIds}) order by position`
    : [];

  const entriesBySession = new Map();
  for (const row of entryRows) {
    if (!entriesBySession.has(row.session_id)) entriesBySession.set(row.session_id, []);
    entriesBySession.get(row.session_id).push(rowToEntry(row));
  }

  const sessionsByWeek = new Map();
  for (const row of sessionRows) {
    if (!sessionsByWeek.has(row.week_id)) sessionsByWeek.set(row.week_id, []);
    sessionsByWeek.get(row.week_id).push({
      id: row.id,
      name: row.name,
      type: row.type,
      day: row.day,
      exercises: entriesBySession.get(row.id) || [],
    });
  }

  const byId = new Map(programs.map((p) => [p.id, p]));
  for (const row of weekRows) {
    byId.get(row.program_id)?.weeks.push({
      index: row.idx,
      sessions: sessionsByWeek.get(row.id) || [],
    });
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

const rowToSet = (r) => ({
  weight: num(r.weight),
  reps: num(r.reps),
  actualRpe: num(r.actual_rpe),
  complete: r.complete,
  at: r.at instanceof Date ? r.at.toISOString() : r.at,
});

/**
 * Every log for a user, sets included.
 *
 * The progress aggregates — personal records, per-exercise history, muscle
 * balance, streaks — are a page of well-tested JavaScript that runs over this
 * array. Expressing them as SQL would be faster and is the right move once
 * anyone has years of history; at the scale of one lifter's training block it
 * would be rewriting working code for no measurable gain, so the query stays
 * simple and the aggregation stays where it is.
 */
export async function listLogs(userId) {
  const logRows = await sql`
    select * from logs where user_id = ${userId} order by logged_at`;
  if (!logRows.length) return [];
  const setRows = await sql`
    select * from log_sets where log_id = any(${logRows.map((l) => l.id)}) order by log_id, idx`;

  const byLog = new Map();
  for (const row of setRows) {
    if (!byLog.has(row.log_id)) byLog.set(row.log_id, []);
    const list = byLog.get(row.log_id);
    list[row.idx] = rowToSet(row);
  }
  return logRows.map((r) => rowToLog(r, [...(byLog.get(r.id) || [])]));
}

export async function findLog({ userId, programId, weekIndex, sessionId, entryId }) {
  const [row] = await sql`
    select * from logs
    where user_id = ${userId} and program_id = ${programId}
      and week_index = ${weekIndex} and session_id = ${sessionId} and entry_id = ${entryId}`;
  if (!row) return null;
  const setRows = await sql`select * from log_sets where log_id = ${row.id} order by idx`;
  const sets = [];
  for (const setRow of setRows) sets[setRow.idx] = rowToSet(setRow);
  return rowToLog(row, sets);
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
