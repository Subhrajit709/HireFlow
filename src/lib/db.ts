import "server-only";

/**
 * Database adapter.
 *
 * - Production / Vercel: real Postgres (Neon, Vercel Postgres, Supabase…) via `postgres.js`
 *   when DATABASE_URL or POSTGRES_URL is set.
 * - Local development: embedded PGlite (Postgres compiled to WASM) persisted in ./.data,
 *   so the project runs with zero setup.
 *
 * Both expose the same tiny interface: `query(sql, params)` with $1-style placeholders.
 * The schema is created idempotently on first use, and demo data is seeded if the DB is empty.
 */

type Row = Record<string, any>;

interface Driver {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
}

const SCHEMA = /* sql */ `
create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('candidate','recruiter')),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id int primary key references users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id serial primary key,
  title text not null,
  department text not null default '',
  location text not null default '',
  employment_type text not null default 'Full-time',
  work_mode text not null default 'On-site',
  description text not null default '',
  required_skills jsonb not null default '[]'::jsonb,
  nice_skills jsonb not null default '[]'::jsonb,
  min_experience numeric not null default 0,
  max_ctc numeric,
  openings int not null default 1,
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  created_by int references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  category text not null,
  label text not null default '',
  filename text not null,
  mime text not null,
  size int not null,
  data bytea not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists documents_user_idx on documents(user_id);

create table if not exists applications (
  id serial primary key,
  candidate_id int not null references users(id) on delete cascade,
  job_id int not null references jobs(id) on delete cascade,
  stage text not null default 'applied',
  answers jsonb not null default '{}'::jsonb,
  cover_note text not null default '',
  assessment jsonb,
  interview jsonb,
  starred boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, job_id)
);
create index if not exists applications_job_idx on applications(job_id);

create table if not exists events (
  id serial primary key,
  application_id int not null references applications(id) on delete cascade,
  actor_id int references users(id) on delete set null,
  kind text not null,
  from_stage text,
  to_stage text,
  message text not null default '',
  visible_to_candidate boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists events_app_idx on events(application_id);

create table if not exists notes (
  id serial primary key,
  application_id int not null references applications(id) on delete cascade,
  author_id int references users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists evaluations (
  id serial primary key,
  application_id int not null references applications(id) on delete cascade,
  recruiter_id int not null references users(id) on delete cascade,
  scores jsonb not null default '{}'::jsonb,
  recommendation text not null,
  comments text not null default '',
  updated_at timestamptz not null default now(),
  unique (application_id, recruiter_id)
);

create table if not exists info_requests (
  id serial primary key,
  application_id int not null references applications(id) on delete cascade,
  requested_by int references users(id) on delete set null,
  question text not null,
  response text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table if not exists notifications (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id);
`;

async function createDriver(): Promise<Driver> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, {
      max: Number(process.env.PG_POOL_MAX) || 5,
      idle_timeout: 20,
      prepare: false, // compatible with pgbouncer / Neon pooled connections
      onnotice: () => {},
      ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    });
    return {
      query: async (text, params = []) => (await sql.unsafe(text, params as any[])) as any,
      exec: async (text) => {
        await sql.unsafe(text);
      },
    };
  }

  if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. Add a Postgres database (e.g. Neon) to this Vercel project — see README."
    );
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const path = await import("node:path");
  const fs = await import("node:fs");
  const dir = path.join(process.cwd(), ".data");
  fs.mkdirSync(dir, { recursive: true }); // PGlite's own mkdir isn't recursive
  const db = new PGlite(path.join(dir, "pglite"));
  await db.waitReady;
  return {
    query: async (text, params = []) => (await db.query(text, params as any[])).rows as any,
    exec: async (text) => {
      await db.exec(text);
    },
  };
}

const g = globalThis as unknown as { __hfDb?: Promise<Driver> };

async function init(): Promise<Driver> {
  const driver = await createDriver();
  await driver.exec(SCHEMA);
  const [{ n }] = await driver.query<{ n: number }>("select count(*)::int as n from users");
  if (n === 0 && process.env.SEED_DEMO !== "false") {
    const { seed } = await import("./seed");
    await seed(driver.query);
  }
  return driver;
}

function getDriver(): Promise<Driver> {
  if (!g.__hfDb) {
    g.__hfDb = init().catch((err) => {
      g.__hfDb = undefined; // allow retry on next request
      throw err;
    });
  }
  return g.__hfDb;
}

export type QueryFn = <T = Row>(text: string, params?: unknown[]) => Promise<T[]>;

/** Run a parameterised query. Always use $1, $2… placeholders — never interpolate user input. */
export const q: QueryFn = async (text, params) => (await getDriver()).query(text, params);

/** Run a query that should return one row (or undefined). */
export async function one<T = Row>(text: string, params?: unknown[]): Promise<T | undefined> {
  const rows = await q<T>(text, params);
  return rows[0];
}

/** JSON-encode a value for a `$n::text::jsonb` parameter.
 *  Always cast via ::text: postgres.js would otherwise JSON.stringify the (already encoded) string a second
 *  time for jsonb-typed params, storing a JSON *string* instead of an object. */
export const json = (v: unknown) => JSON.stringify(v ?? null);
