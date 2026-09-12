import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowCounterClockwise, ArrowClockwise, Pause, Play, ArrowsInSimple, X,
} from '@phosphor-icons/react';
import { useRestTimer } from '../state/RestTimerContext.jsx';
import { useAuth } from '../state/AuthContext.jsx';
import { clock, weightLabel } from '../lib/format.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { Sheet, SheetAction } from './Sheet.jsx';

/** One-tap rest lengths. */
const PRESETS = [
  { seconds: 60, label: '1 min' },
  { seconds: 90, label: '1.5 min' },
  { seconds: 120, label: '2 min' },
  { seconds: 180, label: '3 min' },
];

/**
 * The default presentation: a deliberate takeover between sets. Leaving it does
 * not stop the clock — the timer shrinks to the floating pill below so you can
 * keep using the app while you rest.
 */
/**
 * Rest, as the gap between two sets.
 *
 * The previous version was a tick dial with a seven-segment readout: a clock,
 * standing on its own, with nine controls beneath it. It treated rest as dead
 * time to be measured. It is not. Rest is programmed — the template prescribes
 * it per exercise — and it is the one moment in a session with nothing to do.
 *
 * So the screen shows the set that just closed above, the set the plan asks for
 * next below, and the time between them. The gap literally closes as the rest
 * runs down, which means you can read how long is left from the size of the
 * space without reading a digit — the only thing that works at arms length with
 * a bar in your hands. When the two rules meet, the set resumes.
 *
 * Rest is also where this product's claim becomes visible: what the set
 * actually felt like, directly above what the next one is asked to feel like.
 * Nowhere else in the app are those two numbers adjacent.
 */
export function RestTakeover() {
  const timer = useRestTimer();
  const visible = timer.active && timer.presentation === 'fullscreen';
  const remainingFraction = timer.total ? Math.min(1, timer.remaining / timer.total) : 0;
  const trapRef = useFocusTrap(visible);
  const [pickingLength, setPickingLength] = useState(false);
  const { units } = useAuth();

  // Escape shrinks the takeover to the floating pill rather than cancelling the
  // rest: losing the countdown is not what the key means here.
  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') timer.collapse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, timer]);

  // The gap that closes, expressed as flex growth rather than a pixel padding:
  // it takes its height from whatever space the screen has spare, so on a short
  // phone the rest simply starts with a smaller gap instead of pushing the
  // controls off the bottom. 2.4 is what makes a full-length rest open the gap
  // to roughly a third of the free space on a 390x844 screen.
  const gapGrow = remainingFraction * 2.4;
  const under = timer.remaining < 60;
  const value = under ? String(Math.ceil(timer.remaining)) : clock(timer.remaining);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          ref={trapRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-0 z-50 flex flex-col bg-dark-bg text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Rest timer"
        >
          <div className="grid-texture absolute inset-0" aria-hidden />

          <div className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto px-[22px] pt-[calc(34px+env(safe-area-inset-top))] pb-[calc(26px+env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-3">
              <div
                className="min-w-0 text-[11px] font-semibold text-dark-muted uppercase"
                style={{ letterSpacing: '0.16em' }}
              >
                {timer.sessionLabel}
              </div>
              <button
                onClick={timer.collapse}
                aria-label="Exit rest timer and keep it running"
                className="press flex h-9 shrink-0 items-center gap-1.5 rounded-pill border border-dark-line-2 bg-dark-card-2 px-3.5 text-[11px] font-semibold text-dark-muted"
              >
                <ArrowsInSimple size={14} weight="bold" />
                Exit
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div aria-hidden style={{ flex: '1 0 0px' }} />

              {/* What just happened. */}
              <div>
                <div
                  className="text-[10px] font-semibold text-dark-muted uppercase"
                  style={{ letterSpacing: '0.16em' }}
                >
                  {timer.exerciseName || 'Last set'}
                </div>
                {timer.lastSet ? (
                  <div className="tabular mt-2 text-[22px] leading-none font-bold">
                    {weightLabel(timer.lastSet.weight, units)}
                    <span className="px-1 text-dark-muted">&times;</span>
                    {timer.lastSet.reps}
                    {timer.lastSet.rpe ? (
                      <span className="ml-2.5 text-[15px] font-semibold text-dark-muted">
                        felt RPE {timer.lastSet.rpe}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 text-[15px] font-semibold text-dark-muted">Set logged</div>
                )}
              </div>

              {/* The gap itself. The rules stay put; the two facts travel in
                  towards them as the rest runs down, so how much is left is
                  legible from the size of the space at arm's length, without
                  reading a digit. */}
              <div aria-hidden style={{ flexGrow: gapGrow, flexBasis: 0, flexShrink: 0, maxHeight: 96 }} />

              <div aria-hidden className="h-px w-full bg-dark-line-2" />

              {/* Three columns so the numeral sits on the centre line and the
                  unit hangs off it. Centring the pair instead would push every
                  digit left of centre by half the width of the word. */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-baseline py-5">
                <span aria-hidden />
                <span
                  className="tabular font-extrabold tracking-[-0.045em] text-white"
                  style={{ fontSize: under ? 104 : 84, lineHeight: 0.84 }}
                >
                  {value}
                </span>
                <span
                  className="justify-self-start pl-3 text-[12px] font-semibold text-dark-muted uppercase"
                  style={{ letterSpacing: '0.28em' }}
                >
                  {timer.paused ? 'held' : under ? 'sec' : 'min'}
                </span>
              </div>
              <span className="sr-only" role="status">
                {clock(timer.remaining)} of rest remaining
              </span>

              <div aria-hidden className="h-px w-full bg-dark-line-2" />

              <div aria-hidden style={{ flexGrow: gapGrow, flexBasis: 0, flexShrink: 0, maxHeight: 96 }} />

              {/* What the plan asks for next. */}
              <div>
                <div
                  className="text-[10px] font-semibold text-dark-muted uppercase"
                  style={{ letterSpacing: '0.16em' }}
                >
                  {timer.setLabel || 'Up next'}
                </div>
                {timer.nextTarget ? (
                  <div className="tabular mt-2 text-[22px] leading-none font-bold">
                    {timer.nextTarget.reps}
                    <span className="ml-1.5 text-[15px] font-semibold text-dark-muted">reps</span>
                    <span className="ml-2.5 text-[15px] font-semibold text-dark-muted">
                      target RPE {timer.nextTarget.rpe}
                    </span>
                  </div>
                ) : (
                  // The last set of the session still gets a bottom block, so
                  // the screen keeps its shape and the rest reads as earned
                  // rather than as a missing row.
                  <div className="mt-2 text-[22px] leading-none font-bold text-dark-muted">
                    Nothing left to lift
                  </div>
                )}
              </div>

              <div aria-hidden style={{ flex: '1 0 0px' }} />
            </div>

            <div className="mt-8 flex items-center justify-center gap-4">
              <DarkControl label="-15s" onClick={() => timer.adjust(-15)}>
                <ArrowCounterClockwise size={20} />
              </DarkControl>
              <DarkControl label={timer.paused ? 'Resume' : 'Hold'} onClick={timer.togglePause}>
                {timer.paused ? <Play size={20} weight="fill" /> : <Pause size={20} weight="fill" />}
              </DarkControl>
              <DarkControl label="+15s" onClick={() => timer.adjust(15)}>
                <ArrowClockwise size={20} />
              </DarkControl>
            </div>

            {/* The one lime thing: what you tap when you are ready. */}
            <button
              onClick={timer.dismiss}
              className="press mt-5 h-[54px] w-full rounded-pill bg-accent text-[15px] font-bold text-ink"
            >
              I am ready
            </button>

            <button
              onClick={() => setPickingLength(true)}
              aria-label={`Rest length ${clock(timer.total)}. Change it.`}
              className="press mx-auto mt-3.5 inline-flex items-center gap-2.5 rounded-pill px-4 py-2 text-[12px] font-semibold text-dark-muted hover:text-white"
            >
              <span className="tabular">{clock(timer.total)} rest</span>
              <span aria-hidden className="h-3 w-px bg-dark-line-2" />
              <span>Change</span>
            </button>
          </div>

          <Sheet
            open={pickingLength}
            onClose={() => setPickingLength(false)}
            title="Rest length"
            subtitle="Restarts this rest at the new length."
          >
            <div className="flex flex-col gap-2.5 pb-4">
              {PRESETS.map((preset) => (
                <SheetAction
                  key={preset.seconds}
                  label={preset.label}
                  description={
                    Math.round(timer.total) === preset.seconds ? 'Current length' : undefined
                  }
                  onClick={() => {
                    timer.setDuration(preset.seconds);
                    setPickingLength(false);
                  }}
                />
              ))}
            </div>
          </Sheet>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DarkControl({ children, label, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="press flex size-[62px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border border-dark-line-2 bg-dark-card-2 text-dark-muted"
    >
      {children}
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

/**
 * What the takeover collapses into. Floats above every screen so the countdown
 * follows you around the app; tapping it goes back to full screen.
 */
export function RestMiniTimer() {
  const timer = useRestTimer();
  const visible = timer.active && timer.presentation === 'mini';
  const size = 30;
  const r = 12;
  const circumference = 2 * Math.PI * r;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="pointer-events-none absolute inset-x-0 z-40 flex justify-center px-[22px]"
          style={{ top: 'calc(10px + env(safe-area-inset-top))' }}
        >
          <div className="pointer-events-auto flex items-center gap-1 rounded-pill bg-ink py-1.5 pr-1.5 pl-3 text-white shadow-float">
            <button
              onClick={timer.expand}
              aria-label={`Rest timer, ${clock(timer.remaining)} left. Open full screen.`}
              className="press flex items-center gap-2.5 pr-1"
            >
              <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-dark-track)" strokeWidth="3" />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * timer.progress}
                  style={{ transition: 'stroke-dashoffset 250ms linear' }}
                />
              </svg>
              <span className="flex flex-col items-start leading-none">
                <span className="tabular text-[16px] font-bold">{clock(timer.remaining)}</span>
                <span className="mt-0.5 text-[9px] font-semibold tracking-[0.12em] text-dark-muted">
                  {timer.paused ? 'PAUSED' : 'RESTING'}
                </span>
              </span>
            </button>

            <button
              onClick={timer.togglePause}
              aria-label={timer.paused ? 'Resume rest' : 'Pause rest'}
              className="press flex size-8 items-center justify-center rounded-full bg-dark-card-2 text-accent"
            >
              {timer.paused ? <Play size={13} weight="fill" /> : <Pause size={13} weight="fill" />}
            </button>

            <button
              onClick={timer.dismiss}
              aria-label="Skip rest"
              className="press flex size-8 items-center justify-center rounded-full bg-dark-card-2 text-dark-muted hover:text-white"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
