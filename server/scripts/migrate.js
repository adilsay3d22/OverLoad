/**
 * Create the schema. Idempotent — every statement is `if not exists`, so this
 * is safe to run against a database that is already set up.
 *
 *   npm run db:migrate
 *
 * This is the one place that does not use the HTTP driver the app uses. DDL
 * wants a real session: the whole file goes over in a single transaction, so a
 * failure half way through leaves no partial schema behind. The HTTP driver
 * sends one statement per request and cannot hold a transaction open across
 * them, which is the right trade for request handlers and the wrong one here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, neonConfig } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  const { config } = await import('dotenv');
  config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });
}

// The session driver runs over a WebSocket; Node has had one built in since 22.
neonConfig.webSocketConstructor = WebSocket;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ddl = fs.readFileSync(path.resolve(HERE, '../db/schema.sql'), 'utf8');

const client = new Client(process.env.DATABASE_URL);
await client.connect();

try {
  await client.query('begin');
  await client.query(ddl);
  await client.query('commit');
  console.log('Schema applied.');
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error('\nMigration failed and was rolled back. Nothing changed.\n');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
