import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { playChime, primeChime } from '../lib/chime.js';
import { useAuth } from './AuthContext.jsx';

const RestTimerContext = createContext(null);
const STORAGE_KEY = 'overload.restTimer';

/**
 * One timer model, two presentations.
 *
 * Rest starts as a full-screen takeover — that is the default and the deliberate
 * moment between sets. Exiting it does not stop the clock: the timer shrinks to
 * a mini pill that floats over whatever screen you wander off to, and tapping
 * that pill goes back to full screen. Because the deadline is an absolute
 * timestamp mirrored into localStorage, the countdown stays honest across
 * navigation, remounts and reloads.
 *
 * It does not survive signing out. A countdown is a fact about a person mid
 * session, not about the device, and leaving one behind meant the next account
 * to sign in inherited a stranger's rest.
 */
const emptyState = {
  active: false,
  presentation: 'fullscreen',
  total: 180,
  endsAt: null,
  pausedRemaining: null,
  exerciseName: '',
  setLabel: '',
  sessionLabel: '',
  // Rest is the one moment in a session with nothing to do, which makes it the
  // right place to show the thing this product is about: what the set actually
  // felt like against what the plan asked for.
  lastSet: null,
  nextTarget: null,
};

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw?.active) return emptyState;
    if (raw.endsAt && raw.endsAt <= Date.now()) return emptyState;
    return { ...emptyState, ...raw };
  } catch {
    return emptyState;
  }
}

const remainingOf = (state) => {
  if (!state.active) return 0;
  if (state.pausedRemaining != null) return state.pausedRemaining;
  return Math.max(0, (state.endsAt - Date.now()) / 1000);
};

export function RestTimerProvider({ children }) {
  const { status } = useAuth();
  const [state, setState] = useState(readStored);
  const [remaining, setRemaining] = useState(() => remainingOf(readStored()));
  const onCompleteRef = useRef(null);

  useEffect(() => {
    if (status === 'loading' || status === 'authenticated') return;
    setState((prev) => (prev.active ? emptyState : prev));
  }, [status]);

  useEffect(() => {
    if (state.active) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  }, [state]);

  useEffect(() => {
    if (!state.active || state.pausedRemaining != null) {
      setRemaining(remainingOf(state));
      return undefined;
    }
    const tick = () => {
      const left = remainingOf(state);
      setRemaining(left);
      if (left <= 0) {
        // Vibration alone was silent on iOS, where `navigator.vibrate` does not
        // exist. Sound carries the moment on every platform; the haptic stays
        // for anyone with the ringer off.
        playChime();
        navigator.vibrate?.([120, 60, 120]);
        onCompleteRef.current?.();
        setState(emptyState);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state]);

  const start = useCallback((options) => {
    // Prime audio inside the tap that starts the timer: iOS will not resume a
    // suspended context later, when the countdown actually ends.
    primeChime();
    const total = Math.max(5, Math.round(options.total || 180));
    setState({
      ...emptyState,
      active: true,
      presentation: options.presentation || 'fullscreen',
      total,
      endsAt: Date.now() + total * 1000,
      exerciseName: options.exerciseName || '',
      setLabel: options.setLabel || '',
      lastSet: options.lastSet || null,
      nextTarget: options.nextTarget || null,
      sessionLabel: options.sessionLabel || '',
    });
    setRemaining(total);
  }, []);

  const adjust = useCallback((delta) => {
    setState((prev) => {
      if (!prev.active) return prev;
      const left = remainingOf(prev);
      const next = Math.max(0, left + delta);
      // "+15s" raises the total too, so the ring never overflows.
      const total = delta > 0 ? Math.max(prev.total, prev.total + delta) : prev.total;
      return prev.pausedRemaining != null
        ? { ...prev, total, pausedRemaining: next }
        : { ...prev, total, endsAt: Date.now() + next * 1000 };
    });
  }, []);

  /** One-tap preset: restart the rest at exactly this many seconds. */
  const setDuration = useCallback((seconds) => {
    const total = Math.max(15, Math.round(seconds));
    setState((prev) => {
      if (!prev.active) return prev;
      return prev.pausedRemaining != null
        ? { ...prev, total, pausedRemaining: total }
        : { ...prev, total, endsAt: Date.now() + total * 1000 };
    });
    setRemaining(total);
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => {
      if (!prev.active) return prev;
      if (prev.pausedRemaining != null) {
        return { ...prev, endsAt: Date.now() + prev.pausedRemaining * 1000, pausedRemaining: null };
      }
      return { ...prev, pausedRemaining: remainingOf(prev) };
    });
  }, []);

  const dismiss = useCallback(() => setState(emptyState), []);

  const setPresentation = useCallback(
    (presentation) => setState((prev) => (prev.active ? { ...prev, presentation } : prev)),
    [],
  );

  const value = useMemo(
    () => ({
      ...state,
      remaining,
      paused: state.pausedRemaining != null,
      progress: state.total ? 1 - Math.min(1, remaining / state.total) : 0,
      start,
      adjust,
      setDuration,
      togglePause,
      dismiss,
      expand: () => setPresentation('fullscreen'),
      collapse: () => setPresentation('mini'),
      onComplete: (fn) => {
        onCompleteRef.current = fn;
      },
    }),
    [state, remaining, start, adjust, setDuration, togglePause, dismiss, setPresentation],
  );

  return <RestTimerContext.Provider value={value}>{children}</RestTimerContext.Provider>;
}

export const useRestTimer = () => {
  const value = useContext(RestTimerContext);
  if (!value) throw new Error('useRestTimer must be used inside RestTimerProvider');
  return value;
};
