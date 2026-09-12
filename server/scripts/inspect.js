/** What is actually in the database this .env points at. */
import { sql } from '../src/lib/sql.js';

const [{ host }] = await sql`select inet_server_addr()::text as host`;
const rows = await sql`
  select 'users' as t, count(*)::int as n from users
  union all select 'programs', count(*)::int from programs where kind = 'program'
  union all select 'templates', count(*)::int from programs where kind = 'template'
  union all select 'logs', count(*)::int from logs
  union all select 'log_sets', count(*)::int from log_sets`;
const users = await sql`select email, created_at from users order by created_at`;

console.log('server addr :', host);
console.log('endpoint    :', new URL(process.env.DATABASE_URL).hostname);
for (const r of rows) console.log(`  ${r.t.padEnd(10)} ${r.n}`);
if (users.length) console.log('\naccounts:', users.map((u) => u.email).join(', '));
