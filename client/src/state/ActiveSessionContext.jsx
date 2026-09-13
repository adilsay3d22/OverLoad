import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { useProgram } from './ProgramContext.jsx';

const ActiveSessionContext = createContext(null);
const STORAGE_KEY = 'overload.activeSession';

/**
 * The session you are currently training.
 *
 * Started when you enter the logging flow and cleared when every planned set is
 * checked, this is what turns the tab bar's action button into a running clock.
 *
 * Elapsed time is `accumulated + (now - runningSince)` rather than
 * `now - startedAt`, so pausing can bank the time so far and resume without the
 * clock jumping. Both halves live in localStorage, so the count survives
 * navigation and reloads — including staying paused across one.
 *
 * Surviving a reload is the point, and it was also the bug. This state used to
 * outlive everything: deleting the program left its clock running against a
 * route that no longer existed, and logging out left it on the device for
 * whoever signed in next. Persistence has to be answerable to two things it
 * cannot see for itself — who is signed in, and whether the plan still exists —
 * so the record now carries a `userId` and is checked against the server.
 */
const empty = {
  active: false,
  /** Whose session this is. A clock is not a device-level fact. */
  userId: null,
  programId: null,
  weekIndex: null,
  sessionId: null,
  name: '',
  /** Where to drop back into logging. */
  exerciseIndex: 0,
  startedAt: null,
  accumulated: 0,
  runningSince: null,
};

/** A session left open overnight is abandoned, not a fourteen-hour workout. */
const STALE_AFTER = 6 * 60 * 60 * 1000;

const elapsedOf = (s) =>
  !s.active ? 0 : s.accumulated + (s.runningSince ? (Date.now() - s.runningSince) / 1000 : 0);

function readStored() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw?.active || !raw.startedAt) return empty;
    if (Date.now() - raw.startedAt > STALE_AFTER) return empty;
    return { ...empty, ...raw };
  } catch {
    return empty;
  }
}

export function ActiveSessionProvider({ children }) {
  const { status, user } = useAuth();
  const { program: activeProgram, loading: programLoading, version: programVersion } = useProgram();
  const [recheck, setRecheck] = useState(0);
  const [session, setSession] = useState(readStored);
  const [elapsed, setElapsed] = useState(() => elapsedOf(readStored()));

  useEffect(() => {
    if (session.active) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  // Signing out ends the session, and a session belonging to another account
  // never surfaces on this device. Both were possible before: the key was only
  // ever removed when a session ended on its own terms.
  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') {
      setSession((prev) => (prev.active ? empty : prev));
      return;
    }
    if (!user?.id) return;
    setSession((prev) => {
      if (!prev.active) return prev;
      if (prev.userId == null) return { ...prev, userId: user.id };
      return prev.userId === user.id ? prev : empty;
    });
  }, [status, user?.id]);

  // Coming back to the app can mean the plan changed on another device.
  //
  // Both events fire on a single return — `focus` and `visibilitychange` — so
  // without the guard one reappearance asked the server the same question
  // twice. Returning to the app is also not something that needs re-checking
  // several times a minute, hence the floor.
  useEffect(() => {
    let last = 0;
    const onBack = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - last < 30_000) return;
      last = now;
      setRecheck((n) => n + 1);
    };
    window.addEventListener('focus', onBack);
    document.addEventListener('visibilitychange', onBack);
    return () => {
      window.removeEventListener('focus', onBack);
      document.removeEventListener('visibilitychange', onBack);
    };
  }, []);

  // A program can be deleted while its clock is still running, and nothing on
  // this device can know that. Only a definite "it is gone" ends the session:
  // a dropped connection in a basement gym must not wipe the count, which is
  // why this turns on the status code rather than on any failure.
  //
  // `programVersion` is the dependency that makes this work. None of the other
  // values change when a program is deleted — the session is still active,
  // still pointing at the same ids — so without it the check ran once on mount,
  // passed while the program still existed, and never ran again.
  const { active, programId, weekIndex, sessionId } = session;
  const holds = (program) =>
    program?.weeks?.find((w) => w.index === weekIndex)?.sessions?.some((x) => x.id === sessionId);

  useEffect(() => {
    if (status !== 'authenticated' || !active || !programId) return undefined;
    // Nearly always, the session being timed belongs to the active program —
    // which the program context has already loaded and keeps current. Asking
    // the server for a plan we are holding a copy of was a request per screen
    // for an answer sitting in memory, so the copy answers it.
    if (activeProgram?.id === programId) {
      if (!holds(activeProgram)) setSession(empty);
      return undefined;
    }
    // Still loading, so nothing has been established either way yet.
    if (programLoading) return undefined;
    // A session against some other program — the active one changed underneath
    // it, or there is none. That is the case worth a request.
    let cancelled = false;
    api
      .get(`/programs/${programId}`)
      .then(({ program }) => {
        if (!cancelled && !holds(program)) setSession(empty);
      })
      .catch((err) => {
        if (!cancelled && err?.status === 404) setSession(empty);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    status, active, programId, weekIndex, sessionId,
    activeProgram, programLoading, programVersion, recheck,
  ]);

  useEffect(() => {
    setElapsed(elapsedOf(session));
    if (!session.active || !session.runningSince) return undefined;
    const id = setInterval(() => {
      if (Date.now() - session.startedAt > STALE_AFTER) setSession(empty);
      else setElapsed(elapsedOf(session));
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  /** Idempotent: re-entering the same session keeps its clock exactly as it is. */
  const start = useCallback((next) => {
    setSession((prev) => {
      if (prev.active && prev.sessionId === next.sessionId && prev.weekIndex === next.weekIndex) {
        return prev.exerciseIndex === (next.exerciseIndex ?? prev.exerciseIndex)
          ? prev
          : { ...prev, exerciseIndex: next.exerciseIndex };
      }
      return {
        ...empty,
        ...next,
        userId: user?.id ?? null,
        exerciseIndex: next.exerciseIndex ?? 0,
        active: true,
        startedAt: Date.now(),
        accumulated: 0,
        runningSince: Date.now(),
      };
    });
  }, [user?.id]);

  /** Remembers the screen you were on, so the action button returns you there. */
  const setExerciseIndex = useCallback((index) => {
    setSession((prev) =>
      prev.active && prev.exerciseIndex !== index ? { ...prev, exerciseIndex: index } : prev,
    );
  }, []);

  const togglePause = useCallback(() => {
    setSession((prev) => {
      if (!prev.active) return prev;
      return prev.runningSince
        ? { ...prev, accumulated: elapsedOf(prev), runningSince: null }
        : { ...prev, runningSince: Date.now() };
    });
  }, []);

  const end = useCallback(() => setSession((prev) => (prev.active ? empty : prev)), []);

  const value = useMemo(
    () => ({
      ...session,
      elapsed,
      paused: session.active && !session.runningSince,
      start,
      end,
      togglePause,
      setExerciseIndex,
      /** Where the action button goes while a session is running. */
      target: session.active
        ? `/log/${session.programId}/${session.weekIndex}/${session.sessionId}/${session.exerciseIndex}`
        : null,
    }),
    [session, elapsed, start, end, togglePause, setExerciseIndex],
  );

  return <ActiveSessionContext.Provider value={value}>{children}</ActiveSessionContext.Provider>;
}

export const useActiveSession = () => {
  const value = useContext(ActiveSessionContext);
  if (!value) throw new Error('useActiveSession must be used inside ActiveSessionProvider');
  return value;
};
