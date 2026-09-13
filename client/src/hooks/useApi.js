import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { readCache, writeCache } from '../lib/cache.js';

/**
 * Fetch-on-mount with the three states every screen has to render:
 * loading, error and data. `refresh` re-runs without flashing a skeleton.
 *
 * A screen that has been seen before starts from the cached answer instead of
 * from nothing, and the network read then happens behind it. Nearly every
 * arrival in this app is a return to a screen whose data has not changed —
 * Home, the plan, the exercise you are on — so the usual case becomes a screen
 * that is right immediately and confirmed a moment later, rather than a
 * skeleton for the length of a round trip.
 *
 * `loading` keeps its old meaning, which is what stops this from rippling into
 * every screen: it is "there is nothing to show yet", not "a request is in
 * flight". A revalidation over cached data is not loading, because the screen
 * is not empty. The one thing callers must not do is treat `loading === false`
 * as proof the data is fresh from the server.
 */
export function useApi(path, { skip = false } = {}) {
  const cached = !skip && path ? readCache(path) : undefined;
  const [data, setData] = useState(cached ?? null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!skip && cached === undefined);
  const latest = useRef(0);

  const run = useCallback(
    async ({ quiet = false } = {}) => {
      if (skip || !path) return undefined;
      const ticket = ++latest.current;
      const known = readCache(path);
      if (!quiet && known === undefined) setLoading(true);
      setError(null);
      try {
        const result = await api.get(path);
        writeCache(path, result);
        if (ticket === latest.current) setData(result);
        return result;
      } catch (err) {
        // A failed refresh over data already on screen is not worth replacing
        // that data with an error page: the numbers stay, and the write queue
        // is what actually protects anything unsaved.
        if (ticket === latest.current && known === undefined) setError(err);
        return undefined;
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    },
    [path, skip],
  );

  // Swapping to a path that is already cached shows it at once rather than
  // blanking the screen while the new one loads.
  useEffect(() => {
    if (skip || !path) return;
    const known = readCache(path);
    if (known !== undefined) {
      setData(known);
      setLoading(false);
    }
  }, [path, skip]);

  useEffect(() => {
    run();
  }, [run]);

  // A screen that edits its own copy — the logging screen writes each set into
  // `data` before the server has confirmed it — keeps the cache in step, so
  // leaving and coming back shows what you just did rather than what the last
  // fetch said.
  useEffect(() => {
    if (!skip && path && data !== null) writeCache(path, data);
  }, [path, skip, data]);

  return { data, error, loading, refresh: () => run({ quiet: true }), setData };
}
