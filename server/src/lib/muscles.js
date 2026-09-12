// Muscle-map dataset (requirements §4.4).
//
// The exercise library ships `primaryMuscle` + `secondaryMuscles` but no
// tertiary concept, and template-authored exercises carry no library link at
// all. This module turns both shapes into the primary/secondary/tertiary
// region keys the body diagram renders.

/** Region keys the body-diagram SVG knows how to fill. */
export const REGIONS = [
  'traps', 'delts_front', 'delts_side', 'delts_rear', 'chest', 'biceps',
  'triceps', 'forearms', 'abs', 'obliques', 'lats', 'rhomboids', 'erectors',
  'glutes', 'quads', 'hamstrings', 'adductors', 'calves',
];

/** Anatomical muscle name (as used in exercises.json) -> region keys. */
const MUSCLE_REGIONS = {
  'Pectoralis Major': ['chest'],
  'Deltoid': ['delts_front', 'delts_side', 'delts_rear'],
  'Triceps Brachii': ['triceps'],
  'Biceps Brachii': ['biceps'],
  'Brachioradialis': ['forearms'],
  'Forearms': ['forearms'],
  'Latissimus Dorsi': ['lats'],
  'Rhomboids': ['rhomboids'],
  'Trapezius': ['traps'],
  'Erector Spinae': ['erectors'],
  'Rectus Abdominis': ['abs'],
  'Quadriceps Femoris': ['quads'],
  'Biceps Femoris': ['hamstrings'],
  'Gluteus Maximus': ['glutes'],
  'Gluteus Medius': ['glutes'],
  'Adductor Magnus': ['adductors'],
  'Gastrocnemius': ['calves'],
};

/**
 * Fallback for exercises with no library match: the category alone is enough
 * to place the highlight on the right muscle group.
 */
const CATEGORY_MUSCLES = {
  Chest: { primary: 'Pectoralis Major', secondary: ['Deltoid', 'Triceps Brachii'] },
  Back: { primary: 'Latissimus Dorsi', secondary: ['Biceps Brachii', 'Rhomboids', 'Trapezius'] },
  Shoulders: { primary: 'Deltoid', secondary: ['Trapezius', 'Triceps Brachii'] },
  Biceps: { primary: 'Biceps Brachii', secondary: ['Brachioradialis'] },
  Triceps: { primary: 'Triceps Brachii', secondary: ['Deltoid'] },
  Forearms: { primary: 'Brachioradialis', secondary: ['Biceps Brachii'] },
  Traps: { primary: 'Trapezius', secondary: ['Rhomboids', 'Deltoid'] },
  Quads: { primary: 'Quadriceps Femoris', secondary: ['Gluteus Maximus', 'Adductor Magnus'] },
  Hamstrings: { primary: 'Biceps Femoris', secondary: ['Gluteus Maximus', 'Erector Spinae'] },
  Glutes: { primary: 'Gluteus Maximus', secondary: ['Biceps Femoris', 'Erector Spinae'] },
  Calves: { primary: 'Gastrocnemius', secondary: [] },
  Adductors: { primary: 'Adductor Magnus', secondary: ['Quadriceps Femoris'] },
  Abductors: { primary: 'Gluteus Medius', secondary: ['Gluteus Maximus'] },
  Abs: { primary: 'Rectus Abdominis', secondary: [] },
};

/**
 * Stabilisers that earn a tertiary highlight. Compound lifts brace the trunk;
 * anything you hold onto works grip.
 */
function tertiaryRegions(exercise) {
  const out = new Set();
  if (exercise?.compound) {
    out.add('abs');
    out.add('erectors');
  }
  if (exercise?.force === 'Pull' || exercise?.movementPattern?.includes('Pull')) {
    out.add('forearms');
  }
  if (exercise?.category === 'Abs') out.add('obliques');
  const pattern = exercise?.movementPattern || '';
  if (pattern.includes('Squat') || pattern.includes('Hinge') || pattern.includes('Lunge')) {
    out.add('calves');
    out.add('glutes');
  }
  return out;
}

const expand = (names) => {
  const out = new Set();
  for (const n of names || []) for (const r of MUSCLE_REGIONS[n] || []) out.add(r);
  return out;
};

/**
 * Build the diagram highlight map for one exercise.
 * @param {object|null} libraryExercise resolved entry from exercises.json
 * @param {string} category the plan entry's own category (always present)
 * @returns {{primary: string[], secondary: string[], tertiary: string[]}}
 */
export function muscleMap(libraryExercise, category) {
  const fallback = CATEGORY_MUSCLES[category] || CATEGORY_MUSCLES.Chest;
  const primaryName = libraryExercise?.primaryMuscle || fallback.primary;
  const secondaryNames = libraryExercise?.secondaryMuscles?.length
    ? libraryExercise.secondaryMuscles
    : fallback.secondary;

  const primary = expand([primaryName]);
  const secondary = expand(secondaryNames);
  const tertiary = tertiaryRegions(libraryExercise || { category, compound: true });

  // A region only appears at its strongest tier.
  for (const r of primary) { secondary.delete(r); tertiary.delete(r); }
  for (const r of secondary) tertiary.delete(r);

  return {
    primary: [...primary],
    secondary: [...secondary],
    tertiary: [...tertiary],
  };
}

/** Human-readable muscle names for the diagram caption. */
export function muscleNames(libraryExercise, category) {
  const fallback = CATEGORY_MUSCLES[category] || CATEGORY_MUSCLES.Chest;
  return {
    primary: libraryExercise?.primaryMuscle || fallback.primary,
    secondary: libraryExercise?.secondaryMuscles?.length
      ? libraryExercise.secondaryMuscles
      : fallback.secondary,
  };
}
