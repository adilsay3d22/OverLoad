import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { muscleMap, muscleNames } from './muscles.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../../..');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** 160-exercise library, verbatim from the handoff bundle. */
export const exercises = readJson(path.join(ROOT, 'exercises.json'));

const rawTemplates = readJson(path.join(ROOT, 'templates.json'));

// ---------------------------------------------------------------------------
// Name resolution: template exercises ship `exerciseId: null`, so they are
// linked back to the library by fuzzy name match inside the same category.
// ---------------------------------------------------------------------------

const SYNONYMS = {
  flyes: 'fly', flys: 'fly', flye: 'fly', tricep: 'triceps', bicep: 'biceps',
  db: 'dumbbell', bb: 'barbell', extensions: 'extension', curls: 'curl',
  raises: 'raise', rows: 'row', presses: 'press',
};

const tokens = (s) =>
  new Set(
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
      .filter(Boolean).map((t) => SYNONYMS[t] || t)
  );

const indexed = exercises.map((e) => ({
  exercise: e,
  tokens: tokens(`${e.name} ${(e.aliases || []).join(' ')}`),
}));

const matchCache = new Map();

/** Best library match for a free-text exercise name, or null. */
export function resolveExercise(name, category) {
  const key = `${name}|${category}`;
  if (matchCache.has(key)) return matchCache.get(key);

  const q = tokens(name);
  let best = null;
  let bestScore = 0;
  for (const cand of indexed) {
    let intersection = 0;
    for (const w of q) if (cand.tokens.has(w)) intersection += 1;
    const extra = cand.tokens.size - intersection;
    // Coverage of the requested name, minus a penalty for variant qualifiers
    // the plan never asked for ("Guillotine", "Close-Grip", ...).
    let score = intersection / q.size - 0.4 * extra;
    if (category && cand.exercise.category === category) score += 0.15;
    if (score > bestScore) { bestScore = score; best = cand.exercise; }
  }
  const result = bestScore >= 0.5 ? best : null;
  matchCache.set(key, result);
  return result;
}

// ---------------------------------------------------------------------------
// Session typing + rest parsing
// ---------------------------------------------------------------------------

const UPPER = new Set(['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Traps']);
const LOWER = new Set(['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Adductors', 'Abductors']);

/** Templates carry no session type; derive it from the exercise mix. */
export function sessionType(exercises_) {
  const list = exercises_ || [];
  if (!list.length) return 'Full Body';
  let upper = 0, lower = 0, core = 0;
  for (const e of list) {
    if (UPPER.has(e.category)) upper += 1;
    else if (LOWER.has(e.category)) lower += 1;
    else core += 1;
  }
  const total = list.length;
  if (core / total > 0.6) return 'Core';
  if (upper / (upper + lower || 1) >= 0.75) return 'Upper';
  if (lower / (upper + lower || 1) >= 0.75) return 'Lower';
  return 'Full Body';
}

/** "3–4 min" -> 210 seconds. */
export function parseRest(rest) {
  if (typeof rest === 'number') return rest;
  if (!rest) return 180;
  const nums = String(rest).match(/\d+(\.\d+)?/g);
  if (!nums) return 180;
  const values = nums.map(Number);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(/sec|s\b/i.test(rest) && !/min/i.test(rest) ? avg : avg * 60);
}

// ---------------------------------------------------------------------------
// Normalisation: repsMin/repsMax collapse into a single `reps` + `rpe`
// (requirements §4.1) so template and custom-built exercises share one shape.
// ---------------------------------------------------------------------------

let seq = 0;
export const uid = (prefix = 'x') =>
  `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function normalizeExerciseEntry(raw) {
  const category = raw.category || 'Chest';
  const library = raw.exerciseId
    ? exercises.find((e) => e.id === raw.exerciseId) || null
    : resolveExercise(raw.name, category);

  const reps = raw.reps ?? raw.repsMax ?? raw.repsMin ?? 8;

  // A cross-category fuzzy hit ("Cable Tricep Kickback" -> the glute kickback)
  // is still useful for linking to a library page, but its muscles would be
  // wrong on the diagram. Only trust the library's anatomy when the categories
  // agree; otherwise fall back to the plan's own category.
  const anatomy = library && library.category === category ? library : null;

  return {
    id: raw.id || uid('ex'),
    exerciseId: library ? library.id : null,
    slug: library ? library.slug : null,
    name: raw.name,
    category,
    sets: raw.sets ?? 3,
    reps,
    repsUnit: raw.repsUnit || 'reps',
    rpe: raw.rpe ?? 7,
    restSeconds: parseRest(raw.restSeconds ?? raw.rest),
    note: raw.note || null,
    muscles: muscleMap(anatomy, category),
    muscleNames: muscleNames(anatomy, category),
  };
}

function normalizeSession(raw, weekIndex, dayFallback) {
  const list = (raw.exercises || []).map(normalizeExerciseEntry);
  return {
    id: raw.id || uid('s'),
    day: raw.day ?? dayFallback,
    name: raw.name,
    type: raw.type || sessionType(list),
    weekIndex,
    exercises: list,
  };
}

function normalizeProgramShape(raw) {
  return {
    ...raw,
    weeks: (raw.weeks || []).map((w, wi) => ({
      index: wi,
      sessions: (w.sessions || []).map((s, si) => normalizeSession(s, wi, si)),
    })),
  };
}

/** Templates with the normalised schema, ready to clone into a user program. */
export const templates = rawTemplates.map((t) => {
  const shaped = normalizeProgramShape(t);
  const first = shaped.weeks[0]?.sessions || [];
  return {
    id: t.id,
    name: t.name,
    tagline: t.tagline,
    totalWeeks: t.totalWeeks,
    daysPerWeek: first.length,
    sessionTypes: [...new Set(first.map((s) => s.type))],
    exerciseCount: first.reduce((n, s) => n + s.exercises.length, 0),
    weeks: shaped.weeks,
  };
});

export { normalizeProgramShape };
