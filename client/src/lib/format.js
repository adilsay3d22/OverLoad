const KG_PER_LB = 0.45359237;

/** Weights are stored in kg; the profile toggle only changes presentation. */
export const toDisplayWeight = (kg, units) =>
  kg == null ? null : units === 'lb' ? kg / KG_PER_LB : kg;

export const toStoredWeight = (value, units) =>
  value == null || value === '' ? null : units === 'lb' ? Number(value) * KG_PER_LB : Number(value);

export const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

export function weightLabel(kg, units = 'kg', { decimals = 1 } = {}) {
  if (kg == null) return '—';
  const value = toDisplayWeight(kg, units);
  const rounded = Number(value.toFixed(decimals));
  return `${rounded}${units}`;
}

/**
 * Elapsed workout time for the action button. Minutes keep counting past 60
 * rather than rolling into hours, because "72:15" cannot be misread the way
 * "1:12" can in a control that also shows rest countdowns.
 */
export const sessionClock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const clock = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const restLabel = (seconds) => {
  if (!seconds) return '—';
  const m = seconds / 60;
  return m >= 1 ? `${Number(m.toFixed(m % 1 ? 1 : 0))} min` : `${seconds}s`;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const dayName = (index) => DAYS[((index % 7) + 7) % 7];
export const dayAbbr = (index) => dayName(index).slice(0, 3);

/** Monday-indexed weekday for a Date. */
export const weekdayIndex = (date = new Date()) => (date.getDay() + 6) % 7;

export function shortDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function relativeDay(iso) {
  if (!iso) return 'Not yet';
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  return shortDate(iso);
}

/**
 * "3 × 5 @ RPE 7" — the one prescription string used across every screen.
 * Plan entries carry a numeric `sets`; logging payloads split it into
 * `targetSets` plus a `sets` array of logged rows, so accept both.
 */
export const prescription = (e) => {
  const sets = e.targetSets ?? (Array.isArray(e.sets) ? e.sets.length : e.sets);
  return `${sets} × ${e.reps}${e.repsUnit === 'sec' ? 's' : ''} @ RPE ${e.rpe}`;
};

/** Planned set count regardless of which shape the exercise arrived in. */
export const targetSetCount = (e) =>
  e.targetSets ?? (Array.isArray(e.sets) ? e.sets.length : e.sets);

export const pluralize = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
