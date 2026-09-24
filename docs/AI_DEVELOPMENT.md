# AI-assisted development log

This document records how AI was used to build HireFlow: the tools, the prompts, what each prompt was meant to achieve, what the AI produced, what was changed, the bugs found along the way, and what would come next.

> **Transparency note.** The application code, the tests and these docs were produced in a Claude Code session, directed by the prompt below. The bugs and fixes listed here all actually happened during that session. The section at the end is for adding your own follow-up prompts, manual edits and review notes, so the log stays complete.

---

## 1. AI tools used

| Tool | Used for |
| --- | --- |
| **Claude Code** (VS Code extension, Anthropic **Claude Opus 5.5** model) | Requirement analysis, product design, architecture, writing all code, running the dev server and builds, end-to-end testing, screenshot-based visual review, debugging, documentation |
| Headless **Google Chrome** via `puppeteer-core` (driven by Claude Code) | Screenshots of key pages at desktop and 400 px width, for visual QA |
| `@electric-sql/pglite-socket` (driven by Claude Code) | A local Postgres wire-protocol server, used to test the production database driver without Docker |

No UI generators or website builders were used. The design system is hand-written CSS.

---

## 2. The prompt

The whole assignment brief (candidate portal, recruiter portal, workflow, evaluation questions, documentation requirements) was pasted into Claude Code, followed by these constraints:

````text
# Role
You are a senior full-stack engineer and product designer building a production-grade
Recruitment Management Portal. You make and justify product decisions yourself, and you
verify your own work before calling anything done.

# Context
<brief>
{paste the full assignment brief here}
</brief>
The evaluators will judge product thinking, UX, workflow design, functionality, technical
quality, attention to detail and documentation, not just feature count.

# Hard constraints
- Next.js (latest, App Router) + React + TypeScript. Route handlers are the backend.
- Must deploy to Vercel as ONE project. The only external dependency allowed is a Postgres
  database (Neon via the Vercel integration). No separate API server, no file storage service.
- Must run locally with `npm install && npm run dev` and NOTHING else installed
  (no Docker, no local Postgres). Use an embedded Postgres fallback for local dev.
- Schema must be created automatically on first request; demo data seeded into an empty DB.
- UI: minimal neo-brutalism (thick ink borders, hard offset shadows, flat semantic colour,
  generous whitespace). Hand-written CSS, no UI library. Must work at 400px width.

# Product requirements (decide the details yourself, then document why)
1. Candidate: account, sectioned profile (personal, education incl. 10th/12th, experience
   or explicit "fresher", skills with proficiency, projects, links, availability/CTC),
   document uploads (resume, 10th, 12th, certificates, personality report), apply with
   screening questions, track status, reply to recruiter requests, edit where permitted,
   withdraw, notifications.
2. Recruiter: dashboard, search + filter + sort, one-screen candidate review, inline
   document viewer, scorecard, private notes, info requests, stage changes with
   candidate-facing messages, bulk actions, side-by-side compare, pipeline board,
   job editor with screening questions and knock-out rules.
3. Evaluation: an EXPLAINABLE 0–100 fit score per application against the job
   (show every point), red/amber/green flags, knock-outs that cap the score.
   Keep it separate from the human scorecard; the system must never auto-decide.
4. Workflow: a pipeline with server-enforced transitions, an audit history
   (actor, time, message, candidate-visible vs internal), and a "next action" for both
   recruiter and candidate at every stage. Improve on the brief's example order and justify it.

# Engineering rules
- Parameterised SQL only. Every API handler checks role AND ownership itself.
- Private recruiter notes and internal events must never reach candidate pages.
- Validate all input on the server. Cap upload size under Vercel's request limit.
- Business rules (pipeline, scoring, workflow) live in /lib as pure, reusable modules.
- Anything that differs between local and production (DB driver, env vars, concurrency
  on cold start) must be handled explicitly, not assumed.

# Working process
1. Before coding, write a short plan: architecture, data model, pipeline, scoring formula.
2. Build in vertical slices (data → API → UI) and type-check after each slice.
3. Write an end-to-end smoke test that drives the real HTTP API: every page renders,
   the full candidate → recruiter workflow, validation errors, and permission boundaries.
   No test step may skip silently.
4. Run the smoke test against BOTH database drivers: the local fallback and the
   production driver (e.g. through a Postgres wire-protocol server).
5. Take screenshots of key pages (desktop + mobile) and fix what looks wrong.
6. Run the production build.

# Definition of done
- `npm run build` passes, the smoke test passes on both drivers, screenshots reviewed.
- README: run locally, deploy to Vercel, env vars, demo accounts.
- docs/PRODUCT.md: what is collected and why, mandatory vs optional, fit score design,
  what recruiters score, workflow reasoning.
- docs/TECHNICAL.md: architecture, data model, security, trade-offs, scaling path.
- docs/AI_DEVELOPMENT.md: tools, prompts, refinements, bugs found and how they were fixed.

# Output style
Report progress briefly between steps. When you hit a bug, state the symptom,
the root cause and the fix. Never claim something works without having run it.
````

**What the refinement changes, and why:**

| Added to the prompt | Lesson from the first build |
| --- | --- |
| "Run the smoke test against BOTH database drivers" | The JSONB double-encoding bug (§5.5) only existed on the production driver |
| "No test step may skip silently" | A conditional test step hid a gap (§5.3) |
| "Take screenshots… and fix what looks wrong" | The white-badge CSS bug (§5.4) passed every automated check |
| "Concurrency on cold start must be handled explicitly" | The double-seed race (§5.7) |
| "EXPLAINABLE fit score… never auto-decide" | Makes the most important product principle a requirement, not a lucky outcome |
| "Definition of done" | Replaces "and all" with a checkable finish line |
| Role, context, constraints, process, output sections | Structured so each part can be reused or swapped for a different project |

---

## 3. How the work was broken down

Claude Code split the single prompt into phases. Each phase ended with a verification step before the next one started.

| # | Phase | Intent | Output |
| --- | --- | --- | --- |
| 1 | **Constraints → architecture** | Satisfy "deploy the full stack directly on Vercel" with the fewest moving parts | Next.js App Router with route handlers as the backend; Postgres as the only external dependency; **files stored in Postgres** (no Blob store needed); **PGlite fallback** so `npm run dev` works with no DB installed; schema auto-created on first request (no migration step) |
| 2 | **Domain model** | Turn the brief's questions ("what's mandatory?", "what should recruiters score?") into code-level rules | `types.ts` (profile shape, document categories, scorecard criteria), `pipeline.ts` (stages, transitions, next-action copy), `scoring.ts` (completeness, fit score, flags) |
| 3 | **Data + auth layer** | Secure, role-separated backend | `db.ts` adapter, `auth.ts` (bcrypt + JWT cookie + role guards), `data.ts` queries, `seed.ts` with realistic candidates across every stage (including deliberately weak and knock-out-failing ones) so the evaluation features are visible in the demo |
| 4 | **Design system** | Minimal neo-brutalism that stays readable | `globals.css`: tokens, cards, buttons, badges, stepper, tabs, timeline, kanban, tables. Colour is semantic per stage |
| 5 | **Candidate portal** | Profile → documents → apply → track | Sectioned profile editor, document uploads, job list with "your match", apply form, application tracker, info-request replies, withdraw, notifications |
| 6 | **Recruiter portal** | Evaluate fast and decide | Dashboard, filterable candidate table with bulk actions, one-screen review page, stage modal, scorecard, notes, board, compare, job editor with knock-out builder |
| 7 | **Verification** | Prove it works rather than assume it | Type-check → dev-server boot → 71-check end-to-end smoke test → screenshots → production build → the same test against the production DB driver |
| 8 | **Documentation** | Explain the decisions | README, PRODUCT, TECHNICAL, this log |

### How the approach was refined along the way

- **Scoring went from "count matching skills" to evidence-based.** The first version compared only declared skills. It was refined to also count **project tech stacks** as evidence, to handle **aliases** (`ReactJS` → `React`), and to handle **implied skills** (`PostgreSQL ⇒ SQL`) after noticing that a seeded candidate who listed PostgreSQL was being penalised for "missing SQL".
- **Experience went from self-declared to calculated.** It is computed from job dates, with internships at half weight. The first overlap-merge implementation was replaced with a simpler "set of months" algorithm, because the merge logic was hard to verify by reading it.
- **Workflow order was changed from the brief's example.** Technical assessment moved *before* interview, with "skip to interview" and "another assessment" escape hatches, plus Offer, On hold and reopenable Rejected. Reasoning is in PRODUCT.md §7.
- **Verification kept growing.** A passing type-check wasn't treated as proof. The smoke test was added, then screenshots, then a test against the production database driver. Each step found real bugs (below).

---

## 4. What the AI generated vs what was changed

| Area | First output | Change made, and why |
| --- | --- | --- |
| Skill matching | Exact normalised name match | Added aliases, implied skills and project-stack evidence (fairer to candidates, fewer false "missing skill" flags) |
| Experience calculation | Interval merge with a cursor | Rewritten as a month set: simpler and obviously correct |
| Bulk-move feedback | Injected a DOM element as a toast | Replaced with the app's toast context (consistent, no manual DOM) |
| Seed script | Contained a stray no-op line and an awkward phone generator | Cleaned up |
| Pre-interview checklist | Bullet list with ✓/✕ markers, which doubled the markers | Removed list bullets |
| File-writing approach | Bash heredocs | Switched to direct file writes after a heredoc quoting failure |
| JSONB parameters | `$n::jsonb` | Changed to `$n::text::jsonb` after the production-driver bug below |
| DB pool size | Hard-coded 5 | Configurable via `PG_POOL_MAX` |
| Seeding | Unconditional when the DB is empty | Made race-safe for concurrent serverless cold starts |

---

## 5. Bugs found and how they were fixed

Each of these came up during the session. They are listed in the order they were found.

### 5.1 PGlite couldn't create its data directory
- **Symptom:** the first login returned 500 with `ENOENT: no such file or directory, mkdir '.data\pglite'`.
- **Cause:** PGlite creates only the last path segment, so the `.data` parent folder didn't exist yet.
- **Fix:** `fs.mkdirSync(dir, { recursive: true })` before opening the database.

### 5.2 Shell quoting broke a multi-file write
- **Symptom:** a batch of file writes via bash heredocs failed with `unexpected EOF while looking for matching '`, and no files were written.
- **Fix:** switched to writing files directly, which removed shell parsing from the loop.

### 5.3 A test that silently skipped itself
- **Symptom:** the smoke test reported all checks passing, but the "candidate replies to info request" step never appeared in the output.
- **Cause:** the step was wrapped in `if (id)`, and the regex looking for the request ID never matched. The ID lives in the escaped React Server Component payload (`\"id\":1,\"question\":…`), not in plain HTML.
- **Fix:** inspected the raw payload, corrected the regex, and turned "found the ID" into its own check, so it can never silently skip again.
- **Lesson:** a conditional test step is a hidden pass. Guards should fail loudly.

### 5.4 Every coloured badge rendered white
- **Symptom:** found in screenshots. Stage badges, "pass" badges and flag counters were all white.
- **Cause:** CSS cascade order. `.badge { background: #fff }` was declared *after* the `.bg-*` colour utilities, and with equal specificity the later rule wins.
- **Fix:** moved the colour utilities to the end of the stylesheet, with a comment explaining why they must stay last.

### 5.5 Production-only bug: JSONB stored double-encoded ⚠️
- **How it was found:** everything passed locally on PGlite, but Vercel uses the `postgres.js` driver. Docker wasn't available, so the production server was run against **`pglite-socket`** (a real Postgres wire-protocol server) and the smoke test was re-run. 36 checks failed with `q.filter is not a function` and `required_skills.map is not a function`.
- **Cause:** even with `prepare: false`, `postgres.js` asks the server for parameter types. When it sees a `jsonb` parameter it applies its own `JSON.stringify`. The code was already passing a JSON string, so it was encoded twice, and Postgres stored a JSON **string** (`"[\"React\"]"`) instead of an array. PGlite passes strings through unchanged, so local tests could never catch this.
- **Fix:** every JSON parameter is now cast as `$n::text::jsonb`. The declared parameter type is `text`, so neither driver touches the value, and Postgres does the JSON parse. The reason is documented next to the `json()` helper in `db.ts`.
- **Result:** 71/71 on both drivers, and uploaded PDFs verified to round-trip byte-for-byte through `bytea`.
- **Lesson:** a local stand-in for production infrastructure must be tested through the *same driver* as production. This bug would have broken the deployed app completely.

### 5.6 `ECONNRESET` while testing the production driver
- **Cause:** `pglite-socket` accepts only one connection, and the app's pool opens up to 5 (pages run queries in parallel).
- **Fix:** added `PG_POOL_MAX` (default 5; set to 1 for this test harness). It's also useful on real Postgres plans with low connection limits.

### 5.7 Concurrent cold starts could double-seed
- **Found by reasoning, not by a failure:** on Vercel, two serverless instances can start at the same moment against an empty database. Both would see `users = 0`, both would seed, and one would crash on the unique email.
- **Fix:** the seed inserts the demo recruiter with `on conflict (email) do nothing returning id`. Only the instance that gets a row back continues seeding.

### 5.8 Demo interview time shifted by the timezone offset
- **Symptom:** a seeded interview showed "5:46 am".
- **Cause:** a UTC ISO string was sliced into a `datetime-local` value, which is then read as local time.
- **Fix:** the seed sets a fixed local time (`…T11:00`).

### 5.9 Minor
- A TypeScript error (`Row[]` not assignable to `TimelineEvent[]`) was caught by the type-check and fixed with a cast at the boundary.
- A stray no-op line in the seed was removed.

---

## 6. Important technical decisions

| Decision | Alternatives considered | Why |
| --- | --- | --- |
| Next.js route handlers as the backend | Separate Express API | One project, one deploy, shared types and business logic |
| Postgres (Neon on Vercel) | SQLite, MongoDB, Firebase | Relational data (applications, events, scorecards) plus JSONB for the profile document; first-class Vercel integration |
| PGlite for local development | Require Docker/Postgres | Reviewers can run `npm install && npm run dev` with nothing else installed |
| Raw parameterised SQL through a tiny adapter | Prisma / Drizzle | No codegen or migration step at deploy time; one interface over two drivers; queries stay readable |
| Files in Postgres `bytea` | Vercel Blob / S3 | One external dependency; scaling path documented |
| JWT cookie sessions (`jose` + bcrypt) | NextAuth / Clerk | No third-party account needed; small, auditable code |
| Explainable fit score + separate human scorecard | Opaque AI ranking | Recruiters can see and defend why someone ranks high; the system never overrides a human |
| Hand-written CSS | Tailwind / component library | Full control over the neo-brutalist look, no build config |
| Server components for reads, small client islands for interaction | SPA with client fetching | Less JavaScript, simpler data flow, fresh data after `router.refresh()` |

---

## 7. What I would improve with more time

1. **Email notifications** (e.g. Resend) on the existing `notify()` calls, plus calendar invites for interviews.
2. **Materialised fit score + SQL pagination** for thousands of applicants.
3. **Object storage** for documents, with virus scanning on upload.
4. **Resume parsing** to prefill the profile from the uploaded CV, with the candidate confirming each field.
5. **AI-assisted review** (clearly labelled and optional): a summary of the profile against the job and suggested interview questions per flag. It would stay advisory, never a decision.
6. **Interview feedback forms** per round and panel member, with structured questions per role.
7. **Role-based recruiter permissions** (hiring manager vs recruiter vs admin) and team invites through the UI.
8. **Candidate data export and deletion** (privacy compliance), and anonymised review mode to reduce bias.
9. **Unit tests** for `scoring.ts` and `pipeline.ts` on top of the end-to-end test, run in CI on every push.
10. **Analytics:** time-in-stage, funnel conversion per job, source effectiveness.

---

## 8. Follow-up prompts and manual changes

*Add each later prompt and each manual change here, with its intent, the AI's output, and what you kept or changed.*

| # | Prompt / change | Intent | Result / what was changed |
| --- | --- | --- | --- |
| 1 | | | |
