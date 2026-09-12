/** Session-type badge palette. */
export const SESSION_TYPE = {
  Upper: { bg: '#FBEBE6', fg: '#B8401F' },
  Lower: { bg: '#E6F0FB', fg: '#1F5C9E' },
  Core: { bg: '#F5EBFB', fg: '#7A2FA8' },
  'Full Body': { bg: '#EAF6E8', fg: '#2E7A2B' },
};

/** The seven muscle colour families. */
export const MUSCLE_GROUP = {
  Chest: { bg: '#FBEBE6', fg: '#B8401F' },
  Back: { bg: '#E6F0FB', fg: '#1F5C9E' },
  Shoulders: { bg: '#FDF3E0', fg: '#9A6410' },
  Arms: { bg: '#F5EBFB', fg: '#7A2FA8' },
  Legs: { bg: '#EAF6E8', fg: '#2E7A2B' },
  Glutes: { bg: '#FBEAF2', fg: '#A82C63' },
  Core: { bg: '#EDEEF6', fg: '#464C8A' },
};

/** The 14 data categories collapse onto those seven families. */
export const CATEGORY_GROUP = {
  Chest: 'Chest',
  Back: 'Back',
  Traps: 'Back',
  Shoulders: 'Shoulders',
  Biceps: 'Arms',
  Triceps: 'Arms',
  Forearms: 'Arms',
  Quads: 'Legs',
  Hamstrings: 'Legs',
  Calves: 'Legs',
  Adductors: 'Legs',
  Abductors: 'Legs',
  Glutes: 'Glutes',
  Abs: 'Core',
};

export const groupOf = (category) => CATEGORY_GROUP[category] || category;

/** Colours for a category tag: family colour, category wording. */
export const categoryColor = (category) => MUSCLE_GROUP[groupOf(category)] || MUSCLE_GROUP.Chest;

export const sessionTypeColor = (type) => SESSION_TYPE[type] || SESSION_TYPE['Full Body'];

/** Solid bar colours for Muscle Group Balance. */
export const GROUP_BAR = {
  Chest: '#E2603A',
  Back: '#2F6FB5',
  Shoulders: '#C4870F',
  Arms: '#8A46B8',
  Legs: '#2E7A5B',
  Glutes: '#B8407A',
  Core: '#525899',
};

export const ACCENT = '#C6F24A';
export const INK = '#14150F';

/** Kept for callers that already import it; the curve itself lives in lib/motion.js. */
export { EASE as EASE_OUT_QUINT } from './motion.js';
