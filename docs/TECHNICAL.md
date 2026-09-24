# Technical documentation

## Architecture

```
Browser ── React Server Components (pages) ──┐
   │                                          ├── src/lib (data, scoring, workflow, auth) ── Postgres
   └── Client components ── fetch ── /api/* ──┘
```

- **Next.js 16 App Router.** Pages are **server components** that query the database directly, so there is no client-side data fetching for reads. Interactive pieces (forms, tabs, board, modals) are small **client components**.
- **Route handlers** (`src/app/api/**`) serve as the backend for every mutation. After a mutation, the client calls `router.refresh()`, so server components re-render with fresh data.
- **Business rules live in `src/lib`**, not in the UI:
  - `pipeline.ts`: stages, allowed transitions, next-action copy (shared by server validation and UI)
  - `scoring.ts`: completeness, fit score, flags. Pure functions used by server lists, the review page and the candidate's own "your match"
  - `workflow.ts`: the stage-change service (validate transition → update → history event → notification)

Everything deploys as one Vercel project: static assets on the CDN, pages and API as serverless functions.

## Database

**PostgreSQL**, accessed through a ~60-line adapter (`src/lib/db.ts`) with one interface, `query(sql, params)`:

| Environment | Driver |
| --- | --- |
| Vercel / any `DATABASE_URL` | `postgres.js` (pooled; `prepare:false` for pgbouncer/Neon compatibility; SSL except on localhost) |
| Local, no `DATABASE_URL` | **PGlite**: real Postgres in WebAssembly, persisted to `./.data` |

The **schema is created idempotently** (`create table if not exists`) on the first query of each cold start, and demo data is seeded if `users` is empty. There is no migration step for reviewers. The seed claims its first row with `on conflict do nothing` so two instances cold-starting at once can't both seed.

All queries are **parameterised** (`$1, $2…`); user input is never interpolated into SQL.

### Data model

| Table | Purpose |
| --- | --- |
| `users` | id, email, bcrypt hash, name, role (`candidate` / `recruiter`) |
| `profiles` | one JSONB document per candidate (personal, education[], experience[], skills[], projects[], certifications[], links, additional) |
| `documents` | uploaded files (`bytea`) with category, mime, size |
| `jobs` | role details, required/nice skills (JSONB), min experience, budget, screening questions with knock-out rules (JSONB), status |
| `applications` | candidate × job (unique), stage, screening answers, cover note, assessment + interview details (JSONB), starred |
| `events` | append-only history: kind, from/to stage, message, actor, `visible_to_candidate` |
| `notes` | private recruiter notes |
| `evaluations` | scorecard per (application, recruiter), unique, upserted |
| `info_requests` | recruiter question → candidate response |
| `notifications` | in-app notifications per user |

**Why the profile is a JSONB document:** it's always read and written as a whole by one owner, its sub-lists (education, skills…) have no independent identity elsewhere, and it avoids 6 extra tables and N+1 writes. Things that *are* queried or related independently (applications, evaluations, events, documents) are proper relational tables.

**Why files are stored in Postgres:** it keeps deployment to a single dependency (the database). Files are capped at 4 MB (Vercel's serverless request limit is 4.5 MB), limited to 25 per user, and list queries never select the `data` column. At larger scale, the natural next step is object storage (Vercel Blob / S3) with the table keeping only metadata. The `documents` API is the only code that would change.

## Authentication & authorisation

- Passwords hashed with **bcrypt** (cost 10).
- Sessions are an **HS256 JWT** (`jose`) in an **httpOnly, SameSite=Lax, Secure (prod)** cookie, valid for 7 days.
- **Layouts guard pages** (`requireRole`): `/candidate/**` and `/recruiter/**` redirect anyone without the right role.
- **Every API handler checks the role itself** (`apiUser("recruiter")`); the layout guard is never relied on for APIs.
- **Ownership checks:** candidates can only read or modify their own profile, documents, applications and info requests. Other users' IDs return 404, not 403, to avoid leaking existence.
- Recruiter self-registration requires an **invite code**, so a candidate can't sign up as a recruiter.
- Private notes and internal events are **never queried** for candidate pages.

## Validation & hardening

- Server-side validation for every input: profile payload sanitised (string lengths, list sizes, depth), screening answers re-validated against the job's questions, job form parsed and normalised (`lib/jobInput.ts`), scorecard values clamped to 0–5.
- Uploads are checked for size (≤ 4 MB), allowed MIME types (PDF, images, Word) and per-user count. Files are served with `X-Content-Type-Options: nosniff` and an explicit `Content-Type`.
- Stage transitions are validated against `TRANSITIONS` on the server (409 on invalid moves). Bulk moves report skipped rows instead of failing the batch.
- A generic 500 message is returned to clients; details are logged server-side only.

## Trade-offs and scaling notes

| Current choice | Good for | When it should change |
| --- | --- | --- |
| Fit score computed on read | Always consistent with the latest profile/job edits, so there is no stale data | At thousands of applicants: store `fit_score` on `applications`, recompute on profile/job/answer change, filter and paginate in SQL |
| In-memory filtering of the candidate list | Simple, instant, hundreds of rows | Same as above: move filters to SQL with pagination |
| Files in Postgres | One-dependency deploy | Move to object storage at larger volumes |
| In-app notifications only | No email provider needed | Add email (e.g. Resend) on the same `notify()` call sites |
| Schema bootstrap on cold start | Zero-setup deploy | Versioned migrations once the schema starts evolving with real data |

## Testing strategy

- **Type-checking** (`npm run lint`) and the **production build** (`npm run build`) must pass.
- **End-to-end smoke test** (`npm run smoke`, 71 checks) exercises pages, the full candidate → recruiter workflow, validation and permission boundaries over real HTTP.
- It was run against **both database drivers**: PGlite, and `postgres.js` talking to a Postgres wire-protocol server (`@electric-sql/pglite-socket`). The second run caught a production-only JSONB bug; see [AI_DEVELOPMENT.md](AI_DEVELOPMENT.md#bugs-found-and-how-they-were-fixed).
- **Visual review:** headless-Chrome screenshots of key pages at desktop and 400 px mobile width were inspected after each UI pass. This caught a CSS cascade bug.
