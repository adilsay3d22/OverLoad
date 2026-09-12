import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Fetch-on-mount with the three states every screen has to render:
 * loading, error and data. `refresh` re-runs without flashing a skeleton.
 */
export function useApi(path, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const latest = useRef(0);

  const run = useCallback(
    async ({ quiet = false } = {}) => {
      if (skip || !path) return undefined;
      const ticket = ++latest.current;
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const result = await api.get(path);
        if (ticket === latest.current) setData(result);
        return result;
      } catch (err) {
        if (ticket === latest.current) setError(err);
        return undefined;
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    },
    [path, skip],
  );

  useEffect(() => {
    run();
  }, [run]);

  return { data, error, loading, refresh: () => run({ quiet: true }), setData };
}
