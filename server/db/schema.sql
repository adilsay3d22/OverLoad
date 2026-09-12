-- Overload — relational schema.
--
-- Two product constraints shape almost every decision here, both from PRODUCT.md:
--
--   * Deleting a plan never deletes history. Logs therefore carry no foreign key
--     to programs, weeks, sessions or entries. They keep their own copies of the
--     program name, session name and exercise name, so a logged set stays
--     readable after everything that prescribed it has been deleted. This is
--     deliberate denormalisation, not an oversight.
--
--   * Weights are stored in kilograms. `numeric` throughout, never float:
--     2.5 kg plate steps and 0.5 RPE steps must not drift.
--
-- A saved template is a program with `kind = 'template'`. It is genuinely the
-- same shape — weeks holding sessions holding planned exercises — so it reuses
-- the same three tables rather than growing a parallel set of them. Templates
-- are never active and are never returned by the programs list.

create table if not exists users (
  id                   text primary key,
  email                text not null unique,
  name                 text not null,
  password_hash        text not null,
  units                text not null default 'kg' check (units in ('kg', 'lb')),
  rest_default_seconds integer not null default 180,
  rest_presentation    text not null default 'fullscreen'
                         check (rest_presentation in ('fullscreen', 'mini')),
  created_at           timestamptz not null default now()
);

create table if not exists programs (
  id                text primary key,
  user_id           text not null references users(id) on delete cascade,
  kind              text not null default 'program' check (kind in ('program', 'template')),
  name              text not null,
  source            text,
  template_id       text,
  saved_template_id text,
  tagline           text,
  total_weeks       integer not null,
  days_per_week     integer,
  is_active         boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists programs_user_idx on programs (user_id, kind, created_at desc);

-- One active program per user, enforced by the database rather than by whoever
-- remembers to call `deactivateOthers`.
create unique index if not exists programs_one_active_idx
  on programs (user_id) where is_active and kind = 'program';

create table if not exists weeks (
  id         bigint generated always as identity primary key,
  program_id text not null references programs(id) on delete cascade,
  idx        integer not null,
  unique (program_id, idx)
);

create table if not exists sessions (
  id       text primary key,
  week_id  bigint not null references weeks(id) on delete cascade,
  position integer not null,
  name     text not null,
  type     text,
  day      integer
);

create index if not exists sessions_week_idx on sessions (week_id, position);

-- A planned exercise: what the template asks for, before anyone lifts anything.
create table if not exists entries (
  id           text primary key,
  session_id   text not null references sessions(id) on delete cascade,
  position     integer not null,
  exercise_id  text,
  slug         text,
  name         text not null,
  category     text not null,
  sets         integer not null default 3,
  reps         numeric not null default 8,
  reps_unit    text not null default 'reps',
  rpe          numeric,
  rest_seconds integer,
  note         text
);

create index if not exists entries_session_idx on entries (session_id, position);

-- Logged work. No foreign keys to the plan: see the note at the top.
create table if not exists logs (
  id           text primary key,
  user_id      text not null references users(id) on delete cascade,
  program_id   text,
  program_name text,
  week_index   integer not null,
  session_id   text,
  session_name text,
  session_type text,
  entry_id     text,
  exercise_id  text,
  slug         text,
  name         text not null,
  category     text,
  logged_at    timestamptz not null default now(),
  unique (user_id, program_id, week_index, session_id, entry_id)
);

create index if not exists logs_user_idx on logs (user_id, logged_at);
create index if not exists logs_user_slug_idx on logs (user_id, slug);

create table if not exists log_sets (
  log_id     text not null references logs(id) on delete cascade,
  idx        integer not null,
  weight     numeric,
  reps       numeric,
  actual_rpe numeric,
  complete   boolean not null default false,
  at         timestamptz,
  primary key (log_id, idx)
);
