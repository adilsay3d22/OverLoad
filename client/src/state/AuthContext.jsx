import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken, getToken, tokenUserId } from '../lib/api.js';
import { readCache, setCacheScope, writeCache } from '../lib/cache.js';

const AuthContext = createContext(null);

// At module load, before any component has rendered or fetched anything, so the
// first screen after a reload can be served from the phone rather than from the
// other side of the world. It has to happen here and in `adopt`/`logout` rather
// than in an effect: effects run children-first, and the screens below would
// have started fetching already.
setCacheScope(tokenUserId());

/** The account as it was last confirmed, if this device has seen it before. */
const remembered = () => (getToken() ? readCache('/auth/me')?.user ?? null : null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(remembered);
  // Knowing who is signed in is what every screen waits on, so a remembered
  // account starts the app authenticated rather than spending a round trip
  // proving something the phone already knows.
  const [status, setStatus] = useState(
    !getToken() ? 'anonymous' : remembered() ? 'authenticated' : 'loading',
  );

  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    api
      .get('/auth/me')
      .then(({ user: me }) => {
        if (cancelled) return;
        // The scope was guessed from the token's claim; this is the confirmed
        // answer. Identical in every ordinary case, and a no-op when it is.
        setCacheScope(me?.id ?? null);
        writeCache('/auth/me', { user: me });
        setUser(me);
        setStatus('authenticated');
      })
      .catch((err) => {
        if (cancelled) return;
        // Only the server saying no ends a session.
        //
        // Every failure used to, which meant that opening the app in a gym
        // with no signal signed you out — losing the one thing you were about
        // to need. A dropped request says nothing about whether the token is
        // still good, so an account this device has already seen stays signed
        // in and the app runs on what it has until the connection returns.
        if (err?.status === 401 || !remembered()) {
          setToken(null);
          setCacheScope(null);
          setUser(null);
          setStatus('anonymous');
        } else {
          setStatus('authenticated');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const adopt = useCallback(({ token, user: next }) => {
    setToken(token);
    // A different account means a different cache; the same account signing back
    // in keeps what it had. `setCacheScope` decides which of those this is.
    setCacheScope(next?.id ?? null);
    writeCache('/auth/me', { user: next });
    setUser(next);
    setStatus('authenticated');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      units: user?.units || 'kg',
      signup: async (body) => adopt(await api.post('/auth/signup', body)),
      login: async (body) => adopt(await api.post('/auth/login', body)),
      logout: () => {
        setToken(null);
        // Nothing this account read stays on the device for the next person.
        setCacheScope(null);
        setUser(null);
        setStatus('anonymous');
      },
      updateProfile: async (patch) => {
        const { user: next } = await api.patch('/auth/me', patch);
        // The write cleared the cache, so this puts the account back into it.
        writeCache('/auth/me', { user: next });
        setUser(next);
        return next;
      },
    }),
    [user, status, adopt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
