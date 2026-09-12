import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MagnifyingGlass, CaretLeft, CaretRight, Plus, Warning } from '@phosphor-icons/react';

import { Sheet } from './Sheet.jsx';
import {
  CategoryTag, ErrorNote, Field, PillButton, Skeleton, Stepper, TogglePills, cx,
} from './ui.jsx';
import { Rule } from './programs.jsx';
import { api } from '../lib/api.js';
import { MUSCLE_GROUP } from '../lib/tokens.js';
import { EASE } from '../lib/motion.js';

/**
 * Tier grades reuse the muscle-family palette rather than restating it: every
 * value here already existed as a token, duplicated as a hex literal.
 */
const TIER_TONE = {
  'S+': MUSCLE_GROUP.Legs,
  S: MUSCLE_GROUP.Legs,
  A: { bg: 'var(--color-accent-wash)', fg: 'var(--color-accent-deep)' },
  B: MUSCLE_GROUP.Shoulders,
  C: MUSCLE_GROUP.Shoulders,
  D: MUSCLE_GROUP.Chest,
  F: MUSCLE_GROUP.Chest,
};

/** The counterpart to TierBadge for an exercise the library never rated. */
function YoursBadge() {
  return (
    <span
      className="shrink-0 rounded-pill bg-ink px-2 py-1 text-[9px] leading-none font-bold text-white uppercase"
      style={{ letterSpacing: '0.08em' }}
    >
      Yours
    </span>
  );
}

const LOW_TIERS = new Set(['C', 'D', 'F']);

function TierBadge({ tier }) {
  const tone = TIER_TONE[tier] || TIER_TONE.B;
  return (
    <span
      className="rounded-pill px-2 py-[3px] text-[9px] font-bold tracking-[0.06em]"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {tier}
    </span>
  );
}

const step = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -18 },
  transition: { duration: 0.2, ease: EASE },
};

/** Muscle group -> search -> sets/reps/RPE. Three states in one sheet. */
export function AddExerciseFlow({ open, onClose, onAdd }) {
  const [stage, setStage] = useState('group');
  const [groups, setGroups] = useState(null);
  const [group, setGroup] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [picked, setPicked] = useState(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(8);
  const [rpe, setRpe] = useState(7);
  const [busy, setBusy] = useState(false);
  // The "add your own" form.
  const [draft, setDraft] = useState({ name: '', category: '', equipment: '' });
  const [draftErrors, setDraftErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setStage('group');
    setGroup(null);
    setQuery('');
    setPicked(null);
    setSets(3);
    setReps(8);
    setRpe(7);
    setLoadError(null);
    setDraft({ name: '', category: '', equipment: '' });
    setDraftErrors({});
    api
      .get('/catalog/exercises/groups')
      .then(({ groups: g }) => setGroups(g))
      .catch((err) => setLoadError(err.message));
  }, [open]);

  useEffect(() => {
    if (stage !== 'search' || !group) return undefined;
    let cancelled = false;
    setResults(null);
    const id = setTimeout(() => {
      api
        .get(`/catalog/exercises?group=${encodeURIComponent(group)}&q=${encodeURIComponent(query)}`)
        .then(({ exercises }) => !cancelled && setResults(exercises))
        .catch((err) => {
          if (cancelled) return;
          setResults([]);
          setLoadError(err.message);
        });
    }, query ? 160 : 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [stage, group, query]);

  const title = {
    group: 'Add exercise', search: group, custom: 'Your own exercise', sets: picked?.name,
  }[stage];
  const subtitle = {
    group: 'Pick the muscle group you are training.',
    search: 'Ranked best-first. Tier reflects how much the exercise gives back.',
    custom: 'It joins your library and is searchable from then on.',
    sets: 'Set the prescription for this session.',
  }[stage];

  /** The categories inside the group being browsed, for the custom form. */
  const groupCategories = (groups || []).find((g) => g.name === group)?.categories || [];

  const lowTier = picked && LOW_TIERS.has(picked.tier);

  const back = useMemo(
    () => ({
      group: null,
      search: () => setStage('group'),
      custom: () => setStage('search'),
      sets: () => setStage(picked?.custom ? 'search' : 'search'),
    }),
    [picked],
  );

  return (
    <Sheet open={open} onClose={onClose} full>
      <div className="-mt-1 mb-4 flex items-start gap-3">
        {back[stage] ? (
          <button
            onClick={back[stage]}
            aria-label="Back a step"
            className="press mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
          >
            <CaretLeft size={15} weight="bold" />
          </button>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-[20px] font-semibold tracking-[-0.02em]">{title}</h2>
          <p className="mt-1 text-[13px] font-medium text-ink-muted">{subtitle}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {stage === 'group' ? (
          <motion.div key="group" {...step} className="grid grid-cols-2 gap-2.5 pb-6">
            {groups
              ? groups.map((g) => {
                  const tone = MUSCLE_GROUP[g.name] || MUSCLE_GROUP.Chest;
                  return (
                    <button
                      key={g.name}
                      onClick={() => {
                        setGroup(g.name);
                        setStage('search');
                      }}
                      className="press flex aspect-[1/0.62] flex-col justify-end rounded-card p-4 text-left"
                      style={{ background: tone.bg, color: tone.fg }}
                    >
                      <span className="text-[17px] font-bold tracking-[-0.02em]">{g.name}</span>
                      <span className="mt-0.5 text-[11px] font-semibold opacity-70">
                        {g.count} exercises
                      </span>
                    </button>
                  );
                })
              : Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="aspect-[1/0.62]" radius={26} />
                ))}
          </motion.div>
        ) : null}

        {loadError ? (

          <p role="alert" className="mb-3 rounded-input border border-danger-line bg-danger-wash px-3 py-2.5 text-[13px] font-semibold text-danger">

            {loadError} — check your connection and try again.

          </p>

        ) : null}

        {stage === 'search' ? (
          <motion.div key="search" {...step} className="pb-6">
            <label className="flex items-center gap-2.5 rounded-pill border border-line bg-surface px-4 py-3 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/40">
              <MagnifyingGlass size={17} className="shrink-0 text-ink-muted" />
              <input
                type="search"
                spellCheck={false}
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${group?.toLowerCase()} exercises`}
                className="w-full bg-transparent text-[14px] font-medium placeholder:text-ink-muted focus:outline-none"
              />
            </label>

            <div className="mt-3.5 flex flex-col gap-2">
              {results ? (
                results.length ? (
                  results.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => {
                        setPicked(exercise);
                        setStage('sets');
                      }}
                      className="press flex items-center gap-3 rounded-row border border-line bg-surface p-3.5 text-left hover:bg-accent-wash"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-semibold">{exercise.name}</span>
                          {exercise.custom ? <YoursBadge /> : <TierBadge tier={exercise.tier} />}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] font-medium text-ink-muted">
                          {exercise.equipment.join(' · ') || 'Bodyweight'}
                          {exercise.exerciseType ? ` · ${exercise.exerciseType}` : ''}
                        </span>
                      </span>
                      <CategoryTag category={exercise.category} />
                    </button>
                  ))
                ) : (
                  <p className="px-1 pt-8 pb-2 text-center text-[14px] font-medium text-ink-muted">
                    Nothing matches “{query}”. Try a shorter word, or the equipment name.
                  </p>
                )
              ) : (
                Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[68px]" />)
              )}
            </div>

            {/* The library is 160 exercises and every gym has something it does
                not. This sits under the results rather than beside the search
                box: it is the answer when searching did not work, and reads as
                one only in that position. */}
            {results ? (
              <>
                <Rule className="mt-4" />
                <button
                  type="button"
                  onClick={() => {
                    setDraft({
                      name: query.trim(),
                      category: groupCategories.length === 1 ? groupCategories[0] : '',
                      equipment: '',
                    });
                    setDraftErrors({});
                    setStage('custom');
                  }}
                  className="press flex w-full items-center gap-3 py-4 text-left"
                >
                  <Plus size={18} weight="bold" className="shrink-0 text-ink-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">
                      {query.trim() ? `Add “${query.trim()}” yourself` : 'Add your own exercise'}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-medium text-ink-muted">
                      Not in the library? Put it in yours.
                    </span>
                  </span>
                  <CaretRight size={16} weight="bold" className="shrink-0 text-ink-muted" />
                </button>
              </>
            ) : null}
          </motion.div>
        ) : null}

        {stage === 'custom' ? (
          <motion.div key="custom" {...step} className="pb-6">
            <Field
              label="Name"
              value={draft.name}
              maxLength={60}
              autoFocus
              error={draftErrors.name}
              placeholder="Landmine press"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />

            <div className="mt-5">
              <div className="caps mb-2.5">Which muscle does it train?</div>
              <TogglePills
                options={groupCategories.map((c) => ({ value: c, label: c }))}
                value={draft.category}
                onChange={(category) => setDraft((d) => ({ ...d, category }))}
              />
              {draftErrors.category ? (
                <p role="alert" className="mt-2 text-[12px] font-semibold text-danger">
                  {draftErrors.category}
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <Field
                label="Equipment"
                hint="Optional. Comma separated, so you can find it by kit later."
                value={draft.equipment}
                maxLength={60}
                placeholder="Barbell, landmine"
                onChange={(e) => setDraft((d) => ({ ...d, equipment: e.target.value }))}
              />
            </div>

            {draftErrors.form ? (
              <div className="mt-4">
                <ErrorNote>{draftErrors.form}</ErrorNote>
              </div>
            ) : null}

            <p className="mt-5 text-[12px] leading-[1.5] font-medium text-ink-muted">
              Your own exercises carry no tier — that rating is a judgement about the
              library's movements, and inventing one for yours would be making it up.
              Everything else works the same: it is searchable, and its history is
              tracked across every program you use it in.
            </p>

            <PillButton
              className="mt-5"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setDraftErrors({});
                try {
                  const { exercise } = await api.post('/catalog/custom', {
                    name: draft.name,
                    category: draft.category,
                    equipment: draft.equipment
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean),
                  });
                  setPicked(exercise);
                  setStage('sets');
                } catch (err) {
                  // A name that already exists — the user's or the library's —
                  // comes back with the existing one attached, so the answer is
                  // to use it rather than to try again.
                  if (err.existing) {
                    setPicked(err.existing);
                    setStage('sets');
                  } else {
                    setDraftErrors({ ...(err.errors || {}), form: err.errors ? null : err.message });
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Saving…' : 'Save and continue'}
            </PillButton>
          </motion.div>
        ) : null}

        {stage === 'sets' && picked ? (
          <motion.div key="sets" {...step} className="pb-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <CategoryTag category={picked.category} />
              {picked.custom ? <YoursBadge /> : <TierBadge tier={picked.tier} />}
              <span className="text-[12px] font-medium text-ink-muted">
                {picked.equipment.join(' · ') || 'Bodyweight'}
              </span>
            </div>

            {lowTier ? (
              <div className="mt-4 flex gap-2.5 rounded-row border border-danger-line bg-danger-wash p-3.5">
                <Warning size={18} className="mt-px shrink-0 text-danger" />
                <p className="text-[13px] leading-[1.45] font-medium text-danger">
                  Tier {picked.tier}. There are higher-return {picked.category.toLowerCase()}{' '}
                  exercises in the library — this one still works, it just costs more for less.
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2.5">
              <Stepper label="Sets" value={sets} onChange={setSets} min={1} max={10} />
              <Stepper label="Reps" value={reps} onChange={setReps} min={1} max={30} />
              <Stepper label="RPE" value={rpe} onChange={setRpe} min={5} max={10} step={0.5} />
            </div>

            <p className="mt-4 text-center text-[13px] font-medium text-ink-muted">
              {sets} × {reps} @ RPE {rpe}
            </p>

            <PillButton
              className="mt-5"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  // A custom exercise has no library id, so it is added by
                  // name and category — the same path the bundled templates
                  // take, which also ship without ids.
                  await onAdd(
                    picked.custom
                      ? { name: picked.name, category: picked.category, sets, reps, rpe }
                      : { exerciseId: picked.id, sets, reps, rpe },
                  );
                  onClose();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Adding…' : 'Add to Session'}
            </PillButton>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Sheet>
  );
}

export { cx };
