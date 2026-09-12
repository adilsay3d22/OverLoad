/**
 * Prove the database is reachable and the schema is in place.
 *
 *   npm run db:check
 *
 * Run this first after setting DATABASE_URL. It is the difference between
 * "deployed" and "deployed and actually working", and it fails loudly rather
 * than letting the first signup be the thing that discovers a bad URL.
 */
import { sql } from '../src/lib/sql.js';

const EXPECTED = ['users', 'programs', 'weeks', 'sessions', 'entries', 'logs', 'log_sets'];

const [{ version }] = await sql`select version()`;
console.log('connected:', version.split(',')[0]);

const rows = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name`;
const present = new Set(rows.map((r) => r.table_name));

let missing = 0;
for (const table of EXPECTED) {
  const ok = present.has(table);
  if (!ok) missing += 1;
  console.log(`  ${ok ? 'ok  ' : 'MISSING'} ${table}`);
}

if (missing) {
  console.error(`\n${missing} table(s) missing — run: npm run db:migrate`);
  process.exit(1);
}

const [{ count: users }] = await sql`select count(*)::int as count from users`;
const [{ count: logs }] = await sql`select count(*)::int as count from logs`;
console.log(`\nschema complete. ${users} account(s), ${logs} exercise log(s).`);
