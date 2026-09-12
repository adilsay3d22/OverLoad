# Deploying Overload

Vercel for the app, Neon for the database. Both free, neither asks for a card,
and together they cost nothing at this scale.

- **Vercel** serves the built client from its CDN and runs the Express API as a
  single serverless function. No idle spin-down, so opening the app mid-workout
  does not wait for a machine to wake up.
- **Neon** is a managed Postgres with a free tier of 0.5 GB. It auto-suspends
  when idle and wakes on the next query in well under a second.

Total setup is about ten minutes, most of it waiting for a build.

---

## 1. Create the database

1. Sign up at [neon.tech](https://neon.tech) and create a project. Pick the
   region closest to you — every API request makes a round trip to it.

   **Whichever region you pick, match it in `vercel.json`.** The `regions` key
   pins the API function to the same place as the database; Vercel otherwise
   defaults to Washington DC, which would put an ocean between the two on every
   query. It is currently set to `sin1` (Singapore) to match an AWS Asia
   Pacific 1 project. Neon's region is shown under Project settings, and
   Vercel's codes are `sin1`, `iad1`, `fra1`, `syd1` and so on.
2. Open **Connection Details** and copy the **pooled** connection string. It has
   `-pooler` in the hostname. This matters: the app talks to Neon over HTTP, and
   the pooled endpoint is the one that serves it.

## 2. Branch it, so production stays clean

Neon gives you ten branches on the free tier, and a branch is a copy-on-write
fork of the database — instant, and it costs nothing until it diverges. Use two:

| Branch | Holds | `.env` points at it? |
|---|---|---|
| `production` | real accounts only. Never seeded, never reset. | no |
| `dev` | the developer fixture and whatever you break | yes |

In the Neon dashboard: **Branches → New branch**, name it `dev`, parent
`production`. Then open it, click **Connect**, keep *Connection pooling* on, and
copy the string.

That separation is the only thing standing between a fixture and a database real
people use. `npm run db:seed` now refuses to run unless `OVERLOAD_ALLOW_SEED=1`
is set, which belongs in the dev branch's `.env` and in no deployment ever.

## 3. Set up locally first

Never let the deployment be the thing that discovers a bad connection string.

```bash
cp server/.env.example server/.env
```

Put the **dev branch's** string in `DATABASE_URL`, then generate a secret:

```bash
openssl rand -base64 48
```

Paste it into `OVERLOAD_JWT_SECRET` — the same value goes into Vercel later, so
a token issued locally still works against the deployed app. Then:

```bash
npm run db:migrate   # creates the tables
npm run db:check     # proves the connection and the schema
npm run db:seed      # the developer fixture: a full program and 3 weeks of history
```

`db:check` prints the Postgres version and ticks off every table. If it fails,
nothing else will work, and the message says which of the two things is wrong.

Run `db:migrate` against **both** branches — once now for `dev`, and once with
`DATABASE_URL` set to production. A branch created before a schema change does
not inherit it.

### The other database scripts

```bash
npm run db:inspect   # what is actually in the database .env points at
npm run db:reset     # empty it, keeping the schema (needs --yes)
npm run db:import    # move server/data/store.json in, ids and timestamps intact
```

`db:import` matches accounts on email and skips ones already present, and writes
every program and log by its own id, so running it twice changes nothing. The
JSON file is left untouched.

To point any of them at production deliberately:

```bash
DATABASE_URL=$PRODUCTION_DATABASE_URL npm run db:inspect
```

## 4. Deploy

Push the repository to GitHub, then:

1. [vercel.com/new](https://vercel.com/new) → import the repository.
2. Leave the build settings alone. `vercel.json` already sets the build command,
   the output directory and the rewrites.
3. Add two **Environment Variables**, for all three environments:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the **production** branch's pooled string |
   | `OVERLOAD_JWT_SECRET` | the secret from `server/.env` |

   Do **not** add `OVERLOAD_ALLOW_SEED`. Its absence is what stops the fixture
   script ever running against real accounts.

4. Deploy.

The API refuses to start in production without `OVERLOAD_JWT_SECRET`. That is
deliberate: a deployed build signing sessions with a public constant is not
authentication, so it fails the build rather than quietly shipping.

## 5. Check it

```
https://<your-app>.vercel.app/api/health   ->  {"ok":true}
```

Then sign up in the app and log a set. If the health check passes but signup
fails, it is the database — check the Vercel function logs and re-run
`npm run db:check` locally against the same URL.

---

## How it fits together

```
  browser
    |
    |  /            -> Vercel CDN            client/dist (static Vite build)
    |  /api/*       -> Vercel function       api/index.js -> server/src/app.js
    |                                             |
    |                                             |  HTTPS per query
    v                                             v
                                            Neon Postgres
```

`api/index.js` hands every request to the same Express app that runs locally, so
routing, middleware and error handling exist in one place rather than being
reimplemented per function. `server/src/index.js` is the local server and is
never loaded on Vercel.

## The free tiers, and where they actually end

| | Free allowance | What you would hit first |
|---|---|---|
| Vercel Hobby | 100 GB bandwidth/month, 1M function calls | Nothing, at personal scale |
| Neon | 0.5 GB storage, 190 compute-hours/month | Storage, after several years of logs |

Neon's free project auto-suspends after five minutes idle. The first request
after that pays a wake-up of a few hundred milliseconds. Worth knowing before
you decide it feels slow.

## What is deliberately not automated

- **No migration framework.** `server/db/schema.sql` is the whole schema and
  every statement is `if not exists`, so `db:migrate` is safe to re-run. When a
  column needs changing, add the `alter table` to the file. A migration tool is
  worth adding the first time a change cannot be expressed that way.
- **No connection pooling in the app.** Neon's HTTP driver makes one request per
  query and keeps nothing open, which is what makes it safe in a serverless
  runtime where a pool would exhaust the connection limit instead of saving
  round trips.
