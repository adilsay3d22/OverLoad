import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken, getToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(getToken() ? 'loading' : 'anonymous');

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    api
      .get('/auth/me')
      .then(({ user: me }) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setToken(null);
        setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const adopt = useCallback(({ token, user: next }) => {
    setToken(token);
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
        setUser(null);
        setStatus('anonymous');
      },
      updateProfile: async (patch) => {
        const { user: next } = await api.patch('/auth/me', patch);
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
