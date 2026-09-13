/**
 * A read-through cache for GET responses, so a screen you have already seen
 * renders from the phone rather than from the network.
 *
 * The app is a handful of screens the same person moves between all session —
 * Home, the plan, the exercise, Progress — and every arrival used to be a blank
 * skeleton waiting on a round trip to a database on another continent. Almost
 * none of that data had changed since the last time it was read. So reads now
 * paint the last known answer immediately and refresh it in the background: the
 * screen is right within a frame and current a moment later.
 *
 * Two things make that safe rather than merely fast.
 *
 * **It is scoped to one account.** Everything is written under the signed-in
 * user's id and the store is emptied on sign-out. A cache that outlived a
 * logout would hand one lifter's training to whoever picked up the phone next —
 * the same bug the session clock had, and worth being explicit about twice.
 *
 * **It is dropped on every write.** Any successful POST, PUT, PATCH or DELETE
 * empties it. Working out which cached reads a given write invalidates is a
 * standing invitation to show somebody a program they just deleted; throwing
 * the lot away costs one fetch on the next screen and cannot be wrong.
 */

const KEY = 'overload.cache';

/** Old enough that showing it first would be misleading rather than helpful. */
const MAX_AGE = 12 * 60 * 60 * 1000;

/** Responses past this are streamed straight to the screen and not kept. */
const MAX_ENTRY_BYTES = 256 * 1024;

let scope = null;
let memory = new Map();

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ scope, entries: [...memory] }));
  } catch {
    // Quota, private mode, or storage blocked. The cache is an optimisation;
    // losing it costs a network read and nothing else.
  }
};

/**
 * Point the cache at an account. Signing in as someone else, or out, empties it
 * rather than reinterpreting what is there.
 */
export function setCacheScope(userId) {
  const next = userId ?? null;
  if (next === scope) return;
  scope = next;
  memory = new Map();
  if (!next) {
    try {
      localStorage.removeItem(KEY);
    } catch { /* nothing to do */ }
    return;
  }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw?.scope === next) memory = new Map(raw.entries || []);
  } catch { /* unreadable store; start empty */ }
  persist();
}

export function readCache(path) {
  if (!scope) return undefined;
  const entry = memory.get(path);
  if (!entry) return undefined;
  if (Date.now() - entry.at > MAX_AGE) {
    memory.delete(path);
    return undefined;
  }
  return entry.value;
}

export function writeCache(path, value) {
  if (!scope) return;
  let encoded;
  try {
    encoded = JSON.stringify(value);
  } catch {
    return;
  }
  if (encoded.length > MAX_ENTRY_BYTES) return;
  memory.set(path, { at: Date.now(), value });
  persist();
}

/**
 * The account itself, which no write to a program or a log can invalidate —
 * and which the app needs in hand to open at all when there is no signal.
 * `updateProfile` is the only thing that changes it, and it writes it back.
 */
const ACCOUNT = '/auth/me';

/** Everything else, because a write's blast radius is not worth guessing at. */
export function clearCache() {
  if (!memory.size) return;
  const account = memory.get(ACCOUNT);
  memory = new Map(account ? [[ACCOUNT, account]] : []);
  persist();
}
