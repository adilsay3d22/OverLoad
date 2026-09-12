import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from '@phosphor-icons/react';

import { cx } from './ui.jsx';
import { Rule } from './programs.jsx';
import { round1, toDisplayWeight, toStoredWeight, weightLabel } from '../lib/format.js';
import { DUR, EASE } from '../lib/motion.js';

/**
 * Three sets, three numbers each, and nothing else.
 *
 * Two earlier attempts put a control between the lifter and the number: two
 * 70px ruler strips squeezed into a table row, then a bank of increment keys
 * under a register of numerals. Both spent a third of the screen teaching a
 * gesture, and both were slower than the thing every phone already has.
 *
 * So there is no control. Each number is the field — bare, centred, tabular,
 * with a hairline under it that goes to ink when the caret lands. The row you
 * are meant to fill is the only one carrying rules, which is how the screen
 * points at itself without a word of instruction.
 *
 * The ghost lives inside the field. Every set you have not logged yet opens
 * showing what that same set was last session, dimmed: your own logged value if
 * it exists, otherwise the same set last time, otherwise the set you just
 * closed. It is the number the decision actually turns on — you are not
 * choosing a weight in the abstract, you are choosing whether to repeat last
 * week's or beat it — and until now it lived on the Progress tab, two taps
 * away, at the one moment you cannot go and look.
 *
 * Dimmed is load-bearing, not decoration. A number stays muted until you touch
 * it or commit it, so a suggestion can never be read back as something you
 * logged; the moment a set is ticked its whole row resolves to full ink.
 *
 * A first pass put the ghost on its own line under each row, labelled LAST. It
 * worked, but it doubled the height of the register and printed every number
 * twice on the row that was already proposed. In the field is the same
 * information with none of the furniture.
 */

/**
 * Weight is the one field with no ceiling the app can defend — someone
 * somewhere really is loading a leg press — so it is never clamped. A value far
 * outside this lifter's own history asks once before it becomes their headline
 * PR, and the same control confirms it.
 */
const implausible = (kg, best) => {
  if (!Number.isFinite(kg) || kg <= 0) return false;
  if (best && kg > best * 2.5) return true;
  return kg > 400;
};

const clean = (raw, { decimals }) => {
  const stripped = raw.replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '');
  const [head, ...rest] = stripped.split('.');
  return rest.length ? `${head}.${rest.join('').slice(0, 1)}` : head;
};

/**
 * A number you fill in, with no box around it. The rule under the field is the
 * whole affordance: a hairline while it waits its turn, 2px of ink while the
 * caret is in it. The weight is drawn as a shadow rather than a thicker border
 * so nothing on the row shifts by a pixel when you tap.
 *
 * The app's global lime focus ring is suppressed here and replaced by that
 * ink rule: a 115px bar at 17:1 against the ground clears the focus-appearance
 * bar on its own, and a rounded outline around a bare number would put back
 * exactly the box this design exists to remove.
 */
function Field({ value, onChange, onCommit, open, size, muted, label, width, decimals }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      className={cx(
        'tabular w-full min-w-0 bg-transparent py-[7px] text-center font-bold tracking-[-0.03em]',
        'placeholder:font-semibold placeholder:text-line-strong',
        muted && !focused ? 'text-ink-muted' : 'text-ink',
      )}
      // The rule and the focus weight are written as real properties rather
      // than `focus:` utilities: Tailwind resolves competing utilities by
      // stylesheet order, not by the order of the class string, and the border
      // colour set for the resting row was winning over the focus variant.
      style={{
        fontSize: size,
        flex: `${width} 1 0`,
        outline: 'none',
        borderBottom: '1px solid',
        borderBottomColor: focused
          ? 'var(--color-ink)'
          : open
            ? 'var(--color-line-strong)'
            : 'transparent',
        boxShadow: focused ? '0 1px 0 0 var(--color-ink)' : 'none',
        transition: 'border-color 150ms ease, box-shadow 150ms ease, color 150ms ease',
      }}
      inputMode={decimals ? 'decimal' : 'numeric'}
      enterKeyHint="next"
      autoComplete="off"
      aria-label={label}
      placeholder="—"
      value={value}
      onFocus={() => setFocused(true)}
      onChange={(e) => onChange(clean(e.target.value, { decimals }))}
      onBlur={() => {
        setFocused(false);
        onCommit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

export function SetRegister({ exercise, units, lastSession, bestWeight, onSave }) {
  const repsWord = exercise.repsUnit === 'sec' ? 'Secs' : 'Reps';
  const count = exercise.sets.length;
  const nextOpen = Math.max(0, exercise.sets.findIndex((s) => !s.complete));

  const seeds = useMemo(() => {
    const out = [];
    const text = (n) => (n == null ? '' : String(n));
    for (let i = 0; i < count; i += 1) {
      const own = exercise.sets[i];
      const previous = lastSession?.sets?.[i];
      const earlier = [...out].reverse().find((r) => r.weight !== '');
      const ownWeight = own.weight != null ? round1(toDisplayWeight(own.weight, units)) : null;
      const proposal =
        previous?.weight != null
          ? round1(toDisplayWeight(previous.weight, units))
          : (earlier?.weight ?? null);
      out.push({
        weight: text(ownWeight ?? proposal),
        reps: text(own.reps ?? previous?.reps ?? exercise.reps),
        rpe: text(own.actualRpe ?? previous?.actualRpe ?? exercise.rpe),
        proposed: own.weight == null,
      });
    }
    return out;
  }, [exercise.sets, exercise.reps, exercise.rpe, lastSession, units, count, nextOpen]);

  const [draft, setDraft] = useState(seeds);
  const [edited, setEdited] = useState({});
  const seedKey = JSON.stringify(seeds);
  useEffect(() => {
    setDraft(seeds);
    setEdited({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const [invalid, setInvalid] = useState(null);
  const [confirmBig, setConfirmBig] = useState(null);
  const [busy, setBusy] = useState(null);

  const set = (index, field, value) => {
    setDraft((prev) => {
      const out = [...prev];
      out[index] = { ...out[index], [field]: value };
      return out;
    });
    setEdited((prev) => ({ ...prev, [`${index}-${field}`]: true }));
    setConfirmBig(null);
  };

  const payloadFor = (index) => {
    const r = draft[index];
    return {
      weight: toStoredWeight(r.weight, units),
      reps: Number(r.reps || exercise.reps),
      actualRpe: Number(r.rpe || exercise.rpe),
    };
  };

  /**
   * A logged set keeps itself current: leaving a field is enough to save it.
   *
   * This write is still `complete: true` — the set really is complete — but it
   * must not be mistaken for completing one. Only `commit` asks for the rest
   * timer, because rest belongs to the moment a set ends, not to correcting a
   * digit in one that ended ten minutes ago.
   */
  const persist = (index) => {
    if (!exercise.sets[index]?.complete) return;
    if (draft[index].weight === '') return;
    onSave(index, { ...payloadFor(index), complete: true });
  };

  async function commit(index) {
    const r = draft[index];
    const logged = exercise.sets[index].complete;
    if (!logged && r.weight === '') {
      setInvalid(index);
      navigator.vibrate?.(20);
      setTimeout(() => setInvalid((v) => (v === index ? null : v)), 2600);
      return;
    }
    const kg = toStoredWeight(r.weight, units);
    if (!logged && confirmBig !== index && implausible(kg, bestWeight)) {
      setConfirmBig(index);
      navigator.vibrate?.(12);
      return;
    }
    setConfirmBig(null);
    setBusy(index);
    try {
      await onSave(index, { ...payloadFor(index), complete: !logged }, { rest: !logged });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 pb-1.5">
        <span className="w-4 shrink-0" />
        {[`Weight ${units}`, repsWord, 'RPE'].map((label, i) => (
          <span
            key={label}
            style={{ flex: `${i === 0 ? 1.7 : 1} 1 0` }}
            className="text-center text-[9px] font-bold tracking-[0.1em] text-ink-muted uppercase"
          >
            {label}
          </span>
        ))}
        <span className="w-11 shrink-0" />
      </div>

      {draft.map((r, i) => {
        const logged = exercise.sets[i].complete;
        const open = i === nextOpen && !logged;
        const dim = (field) => r.proposed && !logged && !edited[`${i}-${field}`];
        return (
          <div key={i}>
            <Rule />
            <div className={cx('py-1.5', invalid === i && 'shake')}>
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    'tabular w-4 shrink-0 text-[12px] font-bold',
                    // The row you are on reads as strongly as the ones already
                    // logged; only the sets still waiting their turn recede.
                    logged || open ? 'text-ink' : 'text-ink-muted',
                  )}
                >
                  {i + 1}
                </span>

                <Field
                  decimals
                  width={1.7}
                  size="clamp(21px, 8.4cqw - 3px, 27px)"
                  open={open}
                  muted={dim('weight')}
                  label={`Set ${i + 1} weight in ${units}`}
                  value={r.weight}
                  onChange={(v) => set(i, 'weight', v)}
                  onCommit={() => persist(i)}
                />
                <Field
                  width={1}
                  size="clamp(18px, 6.8cqw - 2px, 22px)"
                  open={open}
                  muted={dim('reps')}
                  label={`Set ${i + 1} ${repsWord.toLowerCase()}`}
                  value={r.reps}
                  onChange={(v) => set(i, 'reps', v)}
                  onCommit={() => persist(i)}
                />
                <Field
                  decimals
                  width={1}
                  size="clamp(18px, 6.8cqw - 2px, 22px)"
                  open={open}
                  muted={dim('rpe')}
                  label={`Set ${i + 1} R P E actually felt`}
                  value={r.rpe}
                  onChange={(v) => set(i, 'rpe', v)}
                  onCommit={() => persist(i)}
                />

                {/* The set lands: the ring fills and the tick seats into it a
                    beat later — weight settling, never bouncing. */}
                <button
                  type="button"
                  onClick={() => commit(i)}
                  disabled={busy === i}
                  aria-pressed={logged}
                  aria-label={logged ? `Un-check set ${i + 1}` : `Complete set ${i + 1}`}
                  className="press flex size-11 shrink-0 items-center justify-center"
                >
                  <span
                    className={cx(
                      'flex size-[23px] items-center justify-center rounded-full',
                      logged ? 'bg-ink text-surface' : 'border border-line-strong',
                    )}
                    style={{ transition: `background-color ${DUR.feedback}s linear` }}
                  >
                    <AnimatePresence initial={false}>
                      {logged ? (
                        <motion.span
                          key="tick"
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.4, opacity: 0 }}
                          transition={{ duration: DUR.state, ease: EASE }}
                          className="flex"
                        >
                          <Check size={13} weight="bold" />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </span>
                </button>
              </div>

              {/* Named, not mimed. A shake alone says nothing to anyone, and
                  nothing at all to a screen reader. */}
              {invalid === i ? (
                <p role="alert" className="pt-1.5 pl-6 text-[12px] font-semibold text-danger">
                  Set a weight before checking this set off.
                </p>
              ) : null}

              {/* Asks, never blocks — the second tap on the same control
                  confirms, so a real heavy single costs one extra tap and a
                  typo costs none. */}
              {confirmBig === i ? (
                <p role="alert" className="pt-1.5 pl-6 text-[12px] leading-[1.45] font-semibold text-ink">
                  {weightLabel(toStoredWeight(r.weight, units), units)}? That is well above your
                  usual.
                  <span className="font-medium text-ink-muted"> Tap the circle again to confirm.</span>
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
      <Rule strong />
    </div>
  );
}
