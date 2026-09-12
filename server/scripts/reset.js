/**
 * Empty the database this .env points at, keeping the schema.
 *
 *   node server/scripts/reset.js --yes
 *
 * Deleting the user rows is enough: `on delete cascade` takes their programs,
 * weeks, sessions, planned exercises, logs and logged sets with them. The
 * schema stays, so this leaves exactly the state a brand-new deployment has —
 * tables present, nothing in them, and a first-time visitor seeing genuinely
 * empty screens.
 *
 * Refuses to run without --yes, and prints what it is about to remove first.
 */
import { sql } from '../src/lib/sql.js';

const users = await sql`select email from users order by created_at`;
const [{ logs }] = await sql`select count(*)::int as logs from logs`;
const [{ sets }] = await sql`select count(*)::int as sets from log_sets`;
const [{ programs }] = await sql`select count(*)::int as programs from programs`;

console.log('endpoint:', new URL(process.env.DATABASE_URL).hostname);
console.log(`about to remove ${users.length} account(s), ${programs} program(s), ${logs} log(s), ${sets} set(s)`);
if (users.length) console.log('  ' + users.map((u) => u.email).join('\n  '));

if (!process.argv.includes('--yes')) {
  console.log('\nNothing done. Re-run with --yes to go ahead.');
  process.exit(0);
}

const removed = await sql`delete from users returning email`;
const [{ left }] = await sql`select count(*)::int as left from logs`;
console.log(`\nremoved ${removed.length} account(s). logs remaining: ${left}`);
