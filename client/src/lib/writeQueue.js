import { api } from './api.js';

/**
 * A set that failed to reach the server is kept, not lost.
 *
 * PRODUCT.md names poor connectivity as a defining condition — "Gyms have bad
 * signal. Every logged set is a write that may fail" — and until now a failed
 * write surfaced as a line of red text and then vanished. The set the lifter had
 * already done was simply gone.
 *
 * Writes are idempotent PUTs addressed by program / week / session / exercise /
 * set index, so replaying one is always safe: the last value wins, and the same
 * set queued twice collapses to one entry. That is what makes a naive queue
 * correct here rather than merely hopeful.
 */

const KEY = 'overload.writeQueue';

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = (items) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked; the in-flight save already reported its error */
  }
};

export const queuedCount = () => read().length;

/** Queue a failed write, replacing any earlier attempt at the same set. */
export function queueSetWrite(path, body) {
  const items = read().filter((item) => item.path !== path);
  items.push({ path, body, at: Date.now() });
  write(items);
}

/**
 * Replay everything queued, oldest first. Stops at the first failure and keeps
 * the remainder — a flush during a flaky reconnect should not drop the tail.
 * Returns how many were accepted.
 */
export async function flushWriteQueue() {
  const items = read();
  if (!items.length) return 0;

  let sent = 0;
  for (const item of items) {
    try {
      await api.put(item.path, item.body);
      sent += 1;
    } catch {
      break;
    }
  }
  if (sent) write(items.slice(sent));
  return sent;
}

/** Flush on reconnect and on tab focus, which is when a phone usually finds signal again. */
export function startWriteQueueSync(onFlushed) {
  const run = async () => {
    const sent = await flushWriteQueue();
    if (sent && onFlushed) onFlushed(sent);
  };
  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run();
  });
  run();
  return () => window.removeEventListener('online', run);
}
