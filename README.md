# HireFlow: Recruitment Management Portal

A full-stack recruitment portal with a **candidate portal** and a **recruiter portal**, built with **Next.js 16 (App Router) + React 19 + TypeScript + PostgreSQL**. The whole stack (UI, API and database access) deploys to **Vercel** as one project.

Candidates build one complete recruitment profile, upload documents, answer screening questions and track every application. Recruiters get a ranked, filterable candidate list with an **explainable fit score**, **red/amber/green flags**, a structured **scorecard**, private notes, information requests, a drag-and-drop **pipeline board**, side-by-side **comparison** and a full audit **history** for each application.

The UI is minimal **neo-brutalism**: thick ink borders, hard offset shadows, flat colour and generous whitespace, all hand-written in CSS with no UI framework.

---

## Contents

- [Demo accounts](#demo-accounts)
- [Run locally](#run-locally)
- [Deploy to Vercel](#deploy-to-vercel)
- [Features](#features)
- [Recruitment workflow](#recruitment-workflow)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submission checklist](#submission-checklist)

---

## Demo accounts

On first start, an empty database is seeded automatically with 3 jobs and 9 candidates spread across every stage (disable this with `SEED_DEMO=false`).

| Role      | Email                | Password        |
| --------- | -------------------- | --------------- |
| Recruiter | `recruiter@demo.com` | `Recruiter@123` |
| Candidate | `candidate@demo.com` | `Candidate@123` |

All other seeded candidates (e.g. `sneha@demo.com`, `karthik@demo.com`) use `Candidate@123`.
New recruiter accounts can self-register with the invite code **`HIRE2026`** (configurable with `RECRUITER_INVITE_CODE`).

---

## Run locally

Requirements: **Node.js 20+**. You do **not** need a database installed.

```bash
npm install
npm run dev
# open http://localhost:3000
```

With no `DATABASE_URL`, the app uses **PGlite** (real PostgreSQL compiled to WebAssembly), stored in `./.data`. Delete that folder to reset the demo data.

To use a real Postgres locally instead, copy `.env.example` to `.env.local` and set `DATABASE_URL`.

| Command         | What it does                                                |
| --------------- | ----------------------------------------------------------- |
| `npm run dev`   | Development server                                          |
| `npm run build` | Production build (what Vercel runs)                         |
| `npm start`     | Serve the production build                                  |
| `npm run lint`  | TypeScript type-check                                       |
| `npm run smoke` | 71-check end-to-end test against a running server (see [Testing](#testing)) |

---

## Deploy to Vercel

1. Push this folder to a GitHub repository and **import it in Vercel** (framework preset: Next.js, no build settings needed).
2. In the Vercel project, open **Storage → Create / Connect Database → Neon (Postgres)**. This sets `DATABASE_URL` automatically. Any Postgres URL works (Neon, Supabase, RDS…).
3. Add an environment variable **`AUTH_SECRET`** with a long random string (e.g. `openssl rand -base64 32`).
4. Deploy. On the first request, the app creates its tables and seeds the demo data. There is no migration step.

| Variable                | Required | Default                    | Purpose                                         |
| ----------------------- | -------- | -------------------------- | ----------------------------------------------- |
| `DATABASE_URL`          | on Vercel | — (PGlite locally)        | Postgres connection string (`POSTGRES_URL` also accepted) |
| `AUTH_SECRET`           | yes (prod) | insecure dev fallback    | Signs session cookies                           |
| `SEED_DEMO`             | no       | `true`                     | Seed demo data into an empty database           |
| `RECRUITER_INVITE_CODE` | no       | `HIRE2026`                 | Gate for recruiter self-registration            |
| `PG_POOL_MAX`           | no       | `5`                        | Max Postgres connections per instance           |

**Why it is Vercel-friendly:** there is no filesystem state in production. Uploaded documents are stored in Postgres (`bytea`, max 4 MB each, under Vercel's 4.5 MB request limit), so the only external dependency is one database. The rationale is in [docs/TECHNICAL.md](docs/TECHNICAL.md).

---

## Features

### Candidate portal

- **Account & profile.** A sectioned profile editor with a live completeness meter and a clear list of what is mandatory before applying:
  - Personal & contact details, headline and summary
  - Education (10th, 12th, diploma, degrees, with scores)
  - Work experience, or "I'm a fresher"; internships count half toward total experience
  - Technical & professional skills with proficiency (1–4) and years
  - Projects (tech stack, live link, repo) and certifications
  - Links: LinkedIn, GitHub, portfolio, other
  - **Documents:** resume, **10th & 12th certificates** (required), degree, other certificates, personality/assessment report (e.g. DISC), other. PDF/JPG/PNG/WebP/DOC up to 4 MB
  - Availability: notice period, current/expected CTC, relocation, languages, source
- **"Preview as recruiter"** shows exactly what the recruiter will see.
- **Jobs:** browse open roles, with the skills you already have highlighted.
- **Apply:** answer the job's screening questions and add a cover note. Applying is blocked (client and server) until mandatory profile items are complete.
- **Track status:** a stepper, a plain-language "what's next" message, assessment and interview details, and a timeline of every candidate-visible event.
- **Recruiter requests:** reply to "please provide X" requests from the recruiter.
- **Edit where permitted:** the profile is always editable. Screening answers are editable **only until review starts**. You can **withdraw** at any time before a final decision.
- **Notifications:** an in-app bell with unread count for every status change, request and update.

### Recruiter portal

- **Dashboard:** pipeline counts, new-this-week, who is **ready for a technical test**, who is **ready for an interview decision**, top new applicants by fit, applications stale for 3+ days, and upcoming interviews.
- **Candidates list:** search by name, email, skill or city. Filter by job, stage, fit band, specific skill, minimum experience, maximum notice period, knock-out result or starred. Sort by fit, rating, recency, experience or name. One-click quick filters are included. **Bulk stage moves** and **compare 2–4 candidates** work from the selection.
- **Candidate review page (one screen):**
  - Summary header: fit score, average recruiter rating, experience, notice, expected CTC vs budget, location/relocation, and resume/LinkedIn/GitHub/portfolio buttons
  - **Overview:** fit score breakdown, flags, required/nice-to-have skills matched vs missing, and screening answers with **knock-out pass/fail**
  - **Full profile**, with job-relevant skills highlighted
  - **Documents** with an inline PDF/image viewer and download
  - **Scorecard:** 6 criteria scored 1–5, an overall recommendation (Strong yes / Yes / Maybe / No) and evidence comments. There is one per recruiter, and all are shown side by side
  - **Notes:** private and never shown to the candidate
  - **History:** full audit trail with actor and time. Internal-only events are marked
  - **Next action panel:** tells the recruiter what to do in this stage and offers only the valid transitions
  - **Stage change dialog:** a candidate-facing message template, assessment details (link, due date, instructions) or interview details (time, mode, link, panel, internal notes), and a notify toggle
  - **Assessment result** (score + pass/fail), **info requests** to the candidate, a **pre-interview checklist**, and the candidate's other applications
- **Pipeline board:** a Kanban with one column per stage. Drag-and-drop highlights only the columns you're allowed to drop into, and each card shows fit, rating, knock-out and "info pending" markers.
- **Compare:** 2–4 candidates side by side with the best value per row highlighted.
- **Jobs:** create/edit roles with required and nice-to-have skills, minimum experience, budget, openings, open/closed, and a **screening question builder** with knock-out rules (Yes/No, number ≥/≤, choice). Editing a job re-scores its applicants instantly.

---

## Recruitment workflow

```
Applied → Under Review → Shortlisted → Technical Assessment → Interview → Offer → Hired
                              └────────── skip to Interview ──────────┘
   On Hold  ·  Rejected (reopenable)  ·  Withdrawn (by candidate)
```

- Transitions are **enforced on the server** (e.g. `Applied → Interview` returns `409`), and the UI only offers valid ones.
- The technical assessment comes **before** the interview: a cheap, objective filter protects interviewer time. Recruiters can **skip to interview** for strong senior profiles, and can send **another assessment** after an interview.
- An **Offer** stage separates "we want them" from "they accepted".
- Every move is recorded in the history with who, when and the message, and the candidate is notified.

The full reasoning is in [docs/PRODUCT.md](docs/PRODUCT.md).

---

## Project structure

```
src/
  app/
    page.tsx                     Landing page
    login/, register/            Auth pages
    candidate/                   Candidate portal (dashboard, profile, jobs, applications, notifications)
    recruiter/                   Recruiter portal (dashboard, candidates, applications/[id], board, compare, jobs, notifications)
    api/                         Route handlers (the backend)
      auth/{login,register,logout}
      profile, documents, documents/[id]
      applications, applications/bulk, applications/[id]{,/stage,/notes,/evaluation,/info-requests}
      info-requests/[id], jobs, jobs/[id], notifications
  components/                    Shared UI (AppShell, ProfileView, Timeline, ui primitives, client helpers)
  lib/
    db.ts                        Postgres / PGlite adapter + schema bootstrap
    auth.ts                      Sessions (JWT cookie), role guards, API error handling
    pipeline.ts                  Stages, allowed transitions, next-action guidance
    scoring.ts                   Profile completeness, fit score, flags (pure, unit-testable)
    workflow.ts                  Stage change service (validation, history, notifications)
    data.ts                      Queries
    seed.ts, pdf.ts              Demo data (+ a tiny PDF generator for sample resumes)
scripts/smoke.mjs                End-to-end test
docs/                            Product, technical and AI-development documentation
```

---

## Testing

`scripts/smoke.mjs` drives the real HTTP API and pages like a user would, with **71 checks**:

- Every candidate and recruiter page renders (with filters)
- Sign-up → incomplete profile blocked → profile + documents → apply → duplicate blocked
- Validation: missing answers, disallowed file types, invalid job input
- **Permissions:** candidates can't move stages, create jobs, read others' documents, open others' applications or reach the recruiter area, and anonymous API calls return 401
- Full pipeline: invalid transitions rejected, answers lock after review starts, scorecard, notes (verified **not** visible to the candidate), info request → candidate reply, shortlist → assessment → result → interview, notifications, bulk-move skip reporting, withdrawal, closed jobs

```bash
npm run dev          # terminal 1
npm run smoke        # terminal 2  (or: BASE_URL=https://your-app.vercel.app npm run smoke)
```

It passes on both database drivers: PGlite (local) and `postgres.js` against a Postgres wire-protocol server (the production path). The smoke test creates real records, so run it against a demo database.

---

## Documentation

| Document | Contents |
| --- | --- |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Product decisions: what is collected and why, mandatory vs optional, fit score design, what recruiters score, workflow reasoning |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | Architecture, data model, security, trade-offs, scaling notes |
| [docs/AI_DEVELOPMENT.md](docs/AI_DEVELOPMENT.md) | AI tools used, prompts, how they were refined, what the AI produced, bugs found and fixed, and future improvements |

---

## Submission checklist

- [x] Working portal: candidate interface, recruiter interface, workflow/status management, candidate evaluation
- [x] Product, technical and AI-prompt documentation (`docs/`)
- [x] Run and deploy instructions (this file)
- [x] Source code
- [ ] Live Vercel URL: *add after deploying*
- [ ] **10th Certificate & 12th Certificate:** *attach your own documents to the submission*
- [ ] **DISC Personality Test Report:** *attach your own report to the submission*
