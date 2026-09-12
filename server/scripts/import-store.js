/**
 * Move an existing `server/data/store.json` into Postgres.
 *
 * The JSON store was the only database this app had until now, so anyone with
 * an account already has their programs and every set they logged sitting in
 * that file. This reads it and writes the same data into the relational tables,
 * ids and timestamps intact.
 *
 * Safe to re-run: users are matched on email and skipped if present, and every
 * program and log is written by its own id, so a second pass changes nothing.
 *
 *   node server/scripts/migrate.js        # schema first
 *   node server/scripts/import-store.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from '../src/lib/sql.js';
import { createProgram, createUser, ensureLog, findUserByEmail, putSet } from '../src/lib/repo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.argv[2] || path.resolve(HERE, '../data/store.json');

if (!fs.existsSync(FILE)) {
  console.log(`No store at ${FILE} — nothing to import.`);
  process.exit(0);
}

const store = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const counts = { users: 0, programs: 0, templates: 0, logs: 0, sets: 0, skipped: 0 };

for (const user of store.users || []) {
  if (await findUserByEmail(user.email)) {
    counts.skipped += 1;
  } else {
    await createUser({
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      units: user.units || 'kg',
      restDefaultSeconds: user.restDefaultSeconds ?? 180,
      // 'banner' was this setting's name before the mini pill was called that.
      restPresentation: user.restPresentation === 'banner' ? 'mini' : (user.restPresentation || 'fullscreen'),
    });
    counts.users += 1;
  }
}

const writeProgram = async (record, kind) => {
  const [existing] = await sql`select id from programs where id = ${record.id}`;
  if (existing) return false;
  await createProgram({ ...record, kind, isActive: kind === 'program' ? !!record.isActive : false });
  return true;
};

for (const program of store.programs || []) {
  if (await writeProgram(program, 'program')) counts.programs += 1;
}

// Saved templates were their own collection in the JSON store; here they are
// programs with `kind = 'template'`, which is the same shape under one roof.
for (const template of store.templates || []) {
  if (await writeProgram(template, 'template')) counts.templates += 1;
}

for (const log of store.logs || []) {
  const written = await ensureLog(log);
  counts.logs += 1;
  const sets = log.sets || [];
  for (let i = 0; i < sets.length; i += 1) {
    if (!sets[i]) continue;
    await putSet(written.id, i, sets[i]);
    counts.sets += 1;
  }
}

console.log('Imported from', FILE);
console.table(counts);
console.log(
  '\nThe JSON store is untouched. Keep it until you have signed in against Postgres\n'
  + 'and seen your programs and history, then it is safe to delete.',
);
