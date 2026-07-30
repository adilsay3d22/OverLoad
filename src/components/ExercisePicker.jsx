import { useEffect, useMemo, useState } from 'react';
import EXERCISES from '../data/exercises.json';
import Modal from './Modal';

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads',
  'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Traps', 'Forearms',
  'Adductors', 'Abductors',
];

// Tiers that trigger the low-tier warning below. The user can still add
// one anyway — this is just a heads-up, not a hard block.
const LOW_TIERS = ['B', 'C', 'D', 'F'];

const TIER_RANK = { 'S+': 0, 'S': 1, 'A': 2, 'B': 3, 'C': 4, 'D': 5, 'F': 6 };

const TIER_STYLES = {
  'S+': 'bg-accent text-white',
  'S': 'bg-accent text-white',
  'A': 'bg-surface-2 text-text-2 border border-border-2',
  'B': 'bg-surface-2 text-text-3 border border-border-2',
  'C': 'bg-danger-dim text-danger',
  'D': 'bg-danger text-white',
  'F': 'bg-danger text-white',
};

function TierBadge({ tier }) {
  return (
    <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${TIER_STYLES[tier] || 'bg-surface-2 text-text-3'}`}>
      {tier}
    </span>
  );
}

// Finds up to `limit` good-tier (S+/S/A) alternatives, preferring exercises
// that hit the same specific region first (e.g. "Lower Chest") before
// widening to the rest of the muscle group (e.g. any "Chest" exercise).
// Already-added exercises and the exercise itself are never suggested back.
function getAlternatives(exercise, excludeIds, limit = 3) {
  const isGood = (e) => TIER_RANK[e.tier] <= 2;
  const notExcluded = (e) => e.id !== exercise.id && !excludeIds.has(e.id);
  const byTier = (a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier];

  const sameRegion = EXERCISES
    .filter((e) => e.region === exercise.region && isGood(e) && notExcluded(e))
    .sort(byTier)
    .map((e) => ({ ...e, matchType: 'region' }));

  if (sameRegion.length >= limit) return sameRegion.slice(0, limit);

  const usedIds = new Set(sameRegion.map((e) => e.id));
  const sameCategory = EXERCISES
    .filter((e) => e.category === exercise.category && !usedIds.has(e.id) && isGood(e) && notExcluded(e))
    .sort(byTier)
    .slice(0, limit - sameRegion.length)
    .map((e) => ({ ...e, matchType: 'category' }));

  return [...sameRegion, ...sameCategory];
}

// Embedded in the "add exercise" step of the custom builder: pick a muscle
// group, then search that group's list. If nothing matches what's typed,
// the typed text itself can be added as a custom exercise. Picking a
// low-tier (B/C) exercise surfaces a heads-up with better alternatives.
export default function ExercisePicker({ onSelect, excludeIds = [] }) {
  const [muscleGroup, setMuscleGroup] = useState(null);
  const [query, setQuery] = useState('');
  const [warnFor, setWarnFor] = useState(null); // exercise object pending confirmation

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  // Push a history entry when drilling into a muscle group's list, so the
  // device back button / edge-swipe gesture backs out to the group grid
  // instead of leaving the page.
  useEffect(() => {
    if (!muscleGroup) return;
    window.history.pushState({ overloadPicker: true }, '');
    const onPopState = () => setMuscleGroup(null);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [muscleGroup]);

  function goBackToGroups() {
    window.history.back();
  }

  const groupExercises = useMemo(
    () => (muscleGroup ? EXERCISES.filter((e) => e.category === muscleGroup) : []),
    [muscleGroup]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groupExercises;
    return groupExercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [groupExercises, query]);

  const exactMatch = matches.some((e) => e.name.toLowerCase() === query.trim().toLowerCase());

  function pick(exercise) {
    if (LOW_TIERS.includes(exercise.tier)) {
      setWarnFor(exercise);
      return;
    }
    onSelect({ name: exercise.name, exerciseId: exercise.id });
  }

  if (!muscleGroup) {
    return (
      <div>
        <p className="font-mono text-[10px] font-semibold tracking-[2px] uppercase text-text-3 mb-3">
          1. Choose a muscle group
        </p>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setMuscleGroup(g)}
              className="h-9 px-3.5 rounded-full border-[1.5px] border-border bg-surface
                         text-sm font-medium text-text-2 active:bg-bg-2"
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <button
          onClick={goBackToGroups}
          aria-label="Back to muscle groups"
          className="w-8 h-8 rounded-full bg-surface border border-border text-text-2
                     text-sm flex items-center justify-center shrink-0"
        >
          ←
        </button>
        <p className="font-mono text-[10px] font-semibold tracking-[2px] uppercase text-text-3">
          {muscleGroup} exercises
        </p>
      </div>

      <input
        className="w-full h-11 rounded-field border-[1.5px] border-border-2 bg-surface px-3.5
                   text-sm text-text mb-2 focus:border-accent focus:outline-none"
        placeholder={`Search ${muscleGroup.toLowerCase()} exercises...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="max-h-[220px] overflow-y-auto rounded-field border border-border divide-y divide-border">
        {matches.map((e) => (
          <button
            key={e.id}
            className="w-full text-left px-3.5 py-2.5 bg-surface active:bg-bg-2 flex items-center justify-between gap-2"
            onClick={() => pick(e)}
          >
            <span className="text-sm text-text truncate">
              {e.name}
              <span className="text-text-3 font-normal"> · {e.region}</span>
            </span>
            <TierBadge tier={e.tier} />
          </button>
        ))}

        {matches.length === 0 && (
          <div className="px-3.5 py-3 text-sm text-text-3">No matches in {muscleGroup}.</div>
        )}

        {query.trim() && !exactMatch && (
          <button
            className="w-full text-left px-3.5 py-2.5 bg-accent-dim active:bg-accent-bd"
            onClick={() => onSelect({ name: query.trim(), exerciseId: null })}
          >
            <span className="text-sm text-accent font-medium">
              Add "{query.trim()}" as a custom exercise
            </span>
          </button>
        )}
      </div>

      {warnFor && (
        <LowTierWarning
          exercise={warnFor}
          alternatives={getAlternatives(warnFor, excludeSet)}
          onUseAnyway={() => {
            onSelect({ name: warnFor.name, exerciseId: warnFor.id });
            setWarnFor(null);
          }}
          onSwap={(alt) => {
            onSelect({ name: alt.name, exerciseId: alt.id });
            setWarnFor(null);
          }}
          onClose={() => setWarnFor(null)}
        />
      )}
    </div>
  );
}

function LowTierWarning({ exercise, alternatives, onUseAnyway, onSwap, onClose }) {
  return (
    <Modal onClose={onClose} labelledBy="low-tier-title">
      <div className="flex items-center gap-2 mb-1.5">
        <TierBadge tier={exercise.tier} />
        <h2 id="low-tier-title" className="font-display text-xl font-extrabold uppercase tracking-[-0.2px]">
          {exercise.name}
        </h2>
      </div>
      <p className="text-[13px] text-text-2 leading-relaxed mb-4">
        This one ranks low for {exercise.region.toLowerCase()} — usually down to a rough
        stimulus-to-fatigue ratio, awkward joint positioning, or a limited range of motion
        compared to better options for the same area.
      </p>

      {alternatives.length > 0 && (
        <div className="mb-4">
          <p className="font-mono text-[10px] font-semibold tracking-[2px] uppercase text-text-3 mb-2">
            Try instead
          </p>
          <div className="flex flex-col gap-2">
            {alternatives.map((alt) => (
              <button
                key={alt.id}
                className="w-full bg-surface-2 border border-border rounded-card p-3.5 text-left active:bg-bg-2"
                onClick={() => onSwap(alt)}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-text">{alt.name}</span>
                  <TierBadge tier={alt.tier} />
                </div>
                <span className="text-[11px] text-text-3">
                  {alt.matchType === 'region' ? alt.region : `${alt.category} · ${alt.region}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {alternatives.length === 0 && (
        <p className="text-[12px] text-text-3 mb-4">
          No better-tier alternatives left in {exercise.category} — you've either added them
          already or none exist yet.
        </p>
      )}

      <button className="btn btn-secondary" onClick={onUseAnyway}>
        Use {exercise.name} anyway
      </button>
    </Modal>
  );
}
