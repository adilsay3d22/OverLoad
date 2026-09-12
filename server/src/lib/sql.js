import { neon } from '@neondatabase/serverless';

// Vercel injects environment variables directly; locally they live in a .env
// file that nothing else reads, so this is a no-op in production.
if (!process.env.DATABASE_URL && !process.env.VERCEL) {
  const { config } = await import('dotenv');
  const { fileURLToPath } = await import('node:url');
  const { dirname, resolve } = await import('node:path');
  config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env') });
}

/**
 * The database handle.
 *
 * Neon's HTTP driver rather than a pooled `pg` client, because the deployment
 * target is Vercel's serverless runtime: every request may land on a fresh
 * instance, and a connection pool there is a way to exhaust the database's
 * connection limit rather than a way to save round trips. Each query here is a
 * single HTTPS request with no connection to keep alive.
 *
 * Used as a tagged template, which is also the parameterisation:
 *
 *     const rows = await sql`select * from users where email = ${email}`;
 *
 * The value is sent separately from the statement, so there is no string
 * concatenation anywhere in this codebase and no place for an injection to get
 * in. Never build a query by joining strings; if a query needs a dynamic list,
 * pass an array and use `= any(${ids})`.
 */

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Copy server/.env.example to .env and paste your Neon connection string.',
  );
}

export const sql = neon(url);

/**
 * Run several statements as one transaction.
 *
 * The HTTP driver has no session, so `begin`/`commit` cannot be issued as
 * separate queries — Neon exposes batching instead, and that batch is atomic.
 * Pass an array of queries built from the same `sql` tag.
 */
export const transaction = (queries) => sql.transaction(queries);

/** First row or null, for the many lookups that expect at most one. */
export const one = async (rows) => (Array.isArray(rows) ? rows[0] || null : null);
