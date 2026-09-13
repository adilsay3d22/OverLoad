import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const ProgramContext = createContext(null);

/**
 * The active program is read by the tab bar's floating action button and by
 * several screens, so it is fetched once and shared rather than per screen.
 */
export function ProgramProvider({ children }) {
  const { status } = useAuth();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  // Every screen that mutates a program calls `refresh`. Counting those gives
  // anything downstream a single dependency meaning "the plans just changed",
  // which is what the session clock needs in order to notice that the program
  // it is counting against has been deleted.
  //
  // It counts changes, not refreshes. Bumping on every refresh meant the
  // session clock re-validated itself against the server each time any screen
  // reloaded the active program — several requests for one fact, all of them
  // answering a question nothing had asked. A refresh that comes back with the
  // plan it already had is not news.
  const [version, setVersion] = useState(0);
  const seen = useRef(null);

  const refresh = useCallback(async () => {
    let next = null;
    try {
      ({ program: next } = await api.get('/programs/active'));
    } catch {
      next = null;
    }
    setProgram(next);
    setLoading(false);
    const signature = next ? JSON.stringify(next) : '';
    if (signature !== seen.current) {
      seen.current = signature;
      setVersion((n) => n + 1);
    }
    return next;
  }, []);

  // Lives above the router so the tab bar can read it, so it has to sit out
  // until there is a session to fetch with.
  useEffect(() => {
    if (status === 'authenticated') {
      refresh();
    } else {
      setProgram(null);
      setLoading(status === 'loading');
    }
  }, [status, refresh]);

  const value = useMemo(() => {
    const next = program?.next;
    return {
      program,
      loading,
      version,
      refresh,
      setProgram,
      /**
       * Where the action button goes when nothing is being logged: straight
       * into the first unfinished exercise, rather than the plan screen.
       */
      actionTarget: !program || !next
        ? '/programs'
        : next.exerciseCount === 0
          // Nothing to log yet — send them to the plan so they can fill it.
          ? `/programs/${program.id}/weeks/${next.weekIndex}/sessions/${next.sessionId}`
          : `/log/${program.id}/${next.weekIndex}/${next.sessionId}/${next.exerciseIndex ?? 0}`,
    };
  }, [program, loading, version, refresh]);

  return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export const useProgram = () => {
  const value = useContext(ProgramContext);
  if (!value) throw new Error('useProgram must be used inside ProgramProvider');
  return value;
};
