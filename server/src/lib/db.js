import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.OVERLOAD_DATA_DIR || path.resolve(HERE, '../../data');
const FILE = path.join(DATA_DIR, 'store.json');

const EMPTY = { users: [], programs: [], logs: [], templates: [] };

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { ...EMPTY, ...parsed };
  } catch {
    return structuredClone(EMPTY);
  }
}

let state = load();
let writeQueued = false;

/** Debounced atomic write — the gym-signal story is offline-first on the client. */
function flush() {
  if (writeQueued) return;
  writeQueued = true;
  queueMicrotask(() => {
    writeQueued = false;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, FILE);
  });
}

export const db = {
  get users() { return state.users; },
  get programs() { return state.programs; },
  get logs() { return state.logs; },
  /** Plans a user saved to start again later. Structure only, never logs. */
  get templates() { return state.templates; },
  save: flush,
  /** Test/reset hook. */
  reset() { state = structuredClone(EMPTY); flush(); },
};
