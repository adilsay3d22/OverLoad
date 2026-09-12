import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Pause, Play } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { DumbbellGlyph } from './Brand.jsx';
import { useActiveSession } from '../state/ActiveSessionContext.jsx';
import { sessionClock } from '../lib/format.js';

const HOLD_MS = 550;
const SIZE = 62;
const R = 29;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * The raised centre action.
 *
 * Idle it opens straight into logging the current session's first unfinished
 * exercise — not the plan, which was a screen in the way. Mid-session it becomes
 * the workout clock and returns you to whichever exercise you left. Holding it
 * pauses and resumes, with a ring that fills over the hold so the gesture is
 * discoverable rather than hidden.
 */
export function SessionActionButton({ idleTarget }) {
  const navigate = useNavigate();
  const training = useActiveSession();
  const [holding, setHolding] = useState(false);
  const [flash, setFlash] = useState(0);
  const timer = useRef(null);
  const fired = useRef(false);

  const live = training.active;
  const paused = training.paused;

  const beginHold = () => {
    if (!live) return;
    fired.current = false;
    setHolding(true);
    timer.current = setTimeout(() => {
      fired.current = true;
      setHolding(false);
      navigator.vibrate?.(18);
      training.togglePause();
      setFlash((n) => n + 1);
    }, HOLD_MS);
  };

  const endHold = () => {
    clearTimeout(timer.current);
    setHolding(false);
  };

  const label = live
    ? `${training.name}, ${sessionClock(training.elapsed)} elapsed${paused ? ', paused' : ''}. ` +
      'Tap to return to logging, hold to ' + (paused ? 'resume.' : 'pause.')
    : 'Start logging the current session';

  return (
    <motion.button
      key={flash}
      whileTap={{ scale: 0.94 }}
      animate={flash ? { scale: [1, 0.86, 1.06, 1] } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      onPointerDown={beginHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        // The hold already did something; don't also navigate.
        if (fired.current) {
          fired.current = false;
          return;
        }
        navigate(live ? training.target : idleTarget);
      }}
      aria-label={label}
      className="absolute left-1/2 -top-[26px] flex size-[62px] -translate-x-1/2 touch-none items-center justify-center rounded-full text-ink shadow-float transition-colors"
      style={{ background: paused ? 'var(--color-accent-wash)' : 'var(--color-accent)' }}
    >
      {/* Live pulse, stilled while paused. */}
      {live && !paused ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-accent"
          animate={{ scale: [1, 1.28], opacity: [0.55, 0] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeOut' }}
        />
      ) : null}

      {/* Fills over the hold so the gesture shows itself. */}
      {live ? (
        <svg
          className="absolute inset-0 -rotate-90"
          width={SIZE}
          height={SIZE}
          aria-hidden
          style={{ opacity: holding ? 1 : 0, transition: 'opacity 120ms ease' }}
        >
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--color-accent-deep)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: holding ? 0 : CIRCUMFERENCE }}
            transition={{ duration: holding ? HOLD_MS / 1000 : 0.12, ease: 'linear' }}
          />
        </svg>
      ) : null}

      {live ? (
        <span className="relative flex flex-col items-center leading-none">
          <span className="tabular text-[15px] font-bold tracking-[-0.02em]">
            {sessionClock(training.elapsed)}
          </span>
          <span className="mt-[3px] flex items-center gap-[2px] text-[7px] font-bold tracking-[0.12em] text-accent-deep">
            {paused ? <Play size={6} weight="fill" /> : <Pause size={6} weight="fill" />}
            {paused ? 'HELD' : 'LIVE'}
          </span>
        </span>
      ) : (
        <DumbbellGlyph size={26} />
      )}
    </motion.button>
  );
}
