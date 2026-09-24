# Product decisions

This document explains **why** the portal works the way it does. The guiding question throughout was:

> *What does a recruiter need to see, and in what order, to decide in under two minutes whether this person deserves an interview or a technical test, and to defend that decision later?*

---

## 1. Who the users are and what they need

| User | Core job | What slows them down today | What the portal does about it |
| --- | --- | --- | --- |
| **Candidate** | "Apply once, know where I stand." | Re-typing the same data per job; silence after applying | One reusable profile; every status change is visible, explained, and notified |
| **Recruiter** | "Find the few strong applicants fast and move them forward." | Opening dozens of PDFs; inconsistent notes; no single place for status | Ranked list with an explainable fit score, flags, a structured scorecard, one review screen, full history |

---

## 2. What information is collected, and why

Everything collected maps to a recruiter decision. If a field doesn't help a decision, it isn't asked for.

| Section | Why the recruiter needs it |
| --- | --- |
| **Contact & headline** | Identify and reach the person; the headline is the one-line summary shown in lists |
| **Education (10th, 12th, degrees + scores)** | Academic baseline and field relevance; common eligibility checks in Indian hiring |
| **Work experience with dates** | Total experience is **calculated from dates**, not self-declared, so it can't be inflated. It also reveals career gaps and tenure patterns |
| **Skills with proficiency and years** | Matched against each job's requirements to drive the fit score |
| **Projects with tech stack + links** | The strongest evidence of skill, especially for freshers; tech stacks count as evidence for skill matching |
| **Links (GitHub, portfolio, LinkedIn)** | Lets the recruiter verify claims in one click |
| **Documents** | Resume for the full story; 10th/12th for verification; certificates and personality reports as supporting evidence |
| **Availability (notice, CTC, relocation)** | The practical deal-breakers. Better known before the interview than discovered after it |
| **Screening answers (per job)** | Job-specific must-haves, e.g. "willing to work from Bengaluru?" or "years of React?" |

### Mandatory vs optional

**Mandatory before applying** (enforced on both client and server):

1. Name, phone, city, headline, so the candidate is identifiable and contactable
2. At least one education entry
3. Work experience **or** an explicit "I'm a fresher". A fresher is a valid answer; silence is not
4. At least 3 skills, which the fit score needs to be meaningful
5. Resume
6. 10th & 12th certificates, a standard verification requirement (and requested in this assignment)
7. Notice period and expected CTC, the most common late-stage deal-breakers

**Optional** (they raise profile strength and create positive signals, but never block): projects, links, summary, certifications, degree certificate, personality report, DOB, state, languages, source.

**Deliberately not used for scoring:** gender (optional, "prefer not to say" is the default), date of birth and photo (not collected). These must not influence shortlisting.

The rule of thumb: **mandatory = needed to make or act on a decision; optional = improves the decision**. Asking for too much up front increases drop-off, so everything that is "nice to know" is optional but rewarded in the completeness meter.

---

## 3. What makes a candidate relevant for a role: the fit score

Each application gets an **explainable 0–100 fit score** against *that job's* requirements. It is a triage aid, not an auto-decision: every point is shown in a breakdown on the review screen.

| Component | Points | How it's computed |
| --- | --- | --- |
| Required skills | 45 | % of the job's required skills found in the candidate's skills **or project tech stacks** (with aliases like `ReactJS → React` and implications like `PostgreSQL ⇒ SQL`, `Next.js ⇒ React`) |
| Nice-to-have skills | 10 | % of nice-to-have skills matched |
| Experience | 20 | Calculated years ÷ required years (capped at 100%); internships count half; overlapping jobs aren't double counted |
| Screening | 15 | % of knock-out questions passed |
| Profile completeness | 10 | Weighted completeness of the profile |

**Knock-out rule:** failing any knock-out question (e.g. "not willing to relocate" for an on-site role) **caps the score at 40** and raises a red flag. This stops a strong-looking profile from hiding a deal-breaker.

**Bands:** Strong ≥ 75 (with no knock-out failures) · Potential 50–74 · Weak < 50.

### Flags: spotting strong or unsuitable applications at a glance

| 🔴 Red (likely unsuitable) | 🟠 Amber (probe in interview) | 🟢 Green (positive signal) |
| --- | --- | --- |
| Failed knock-out question | Slightly under required experience | Has every required skill |
| < 50% of required skills | Career gap ≥ 6 months | Projects prove the required skills |
| Experience well below requirement | Frequent job changes (avg tenure < 1 yr) | GitHub / portfolio present |
| No resume | Notice period > 60 days | Can join immediately |
| Expected CTC > 120% of budget | Expected CTC above budget | |
| | Required screening answer missing | |

Flags show as coloured counts in the candidate table, with detail on hover and in full on the review page.

---

## 4. How recruiters quickly compare candidates

- **Sort by fit score** by default, so the strongest applicants rise to the top of every list.
- **Quick filters:** New · Strong matches · Ready for test · Ready for interview · Interviewing · Knock-out failed · Starred.
- **Advanced filters:** job, stage, fit band, has-skill, minimum experience, maximum notice period, knock-out result.
- **Compare view** (2–4 candidates): fit, rating, recommendations, experience, education, required skills matched/missing, knock-outs, notice, CTC, location, completeness and signals, with the **best value per row highlighted**.
- **Pipeline board:** everyone in one view, sorted by fit within each stage, with days-in-stage visible to catch stalled candidates.

### What the candidate summary (list row / card) shows

Fit score · name + headline · city + highest education · job applied for + when · stage · calculated experience · required skills matched (and which are missing) · flags · recruiter rating · notice period.

These are the eight facts that decide whether a recruiter opens the profile.

---

## 5. What recruiters score: the scorecard

The fit score measures what's *on paper*. The **scorecard** records the recruiter's *judgement*. They are kept separate on purpose: the system never overrides a human.

| Criterion (1–5) | What to judge |
| --- | --- |
| Technical skills | Depth in the role's required stack |
| Relevant experience | Similar work, domain, scale |
| Projects & portfolio | Quality and ownership of shipped work |
| Education | Relevance and academic record |
| Communication | Clarity of profile, answers, resume |
| Motivation & fit | Interest in the role, availability, logistics |

Plus an **overall recommendation** (Strong yes / Yes / Maybe / No) and **evidence comments**. There is one scorecard per recruiter, so multiple interviewers can score independently and see each other's verdicts side by side. The average across recruiters is the **rating** shown in lists.

---

## 6. What is available before an interview

The review page puts all of this on one screen:

- Fit breakdown, flags, and skills matched vs missing
- Screening answers with knock-out pass/fail
- Resume and documents in an inline viewer
- Full profile with job-relevant skills highlighted
- Scorecards from every recruiter, plus private notes
- Assessment result (score, pass/fail)
- Answers to any information requests
- Candidate's other applications
- A **pre-interview checklist**: resume ✓, 10th & 12th ✓, knock-outs passed ✓, all required skills ✓, at least one scorecard ✓, assessment passed ✓, info requests answered ✓

When moving someone to **Interview**, the recruiter records time, mode, meeting link, panel and **internal notes for interviewers** ("probe the 8-month gap", "deep-dive on system design"), so interviewers walk in prepared.

**Missing something?** Recruiters can send an **information request** ("please upload your final semester marksheet", "is your notice period negotiable?"). The candidate is notified, replies in the portal, and the answer is stored on the application. This covers the "complete any additional information required during recruitment" requirement.

---

## 7. The workflow and why it's shaped this way

```
Applied → Under Review → Shortlisted → Technical Assessment → Interview → Offer → Hired
                              └──── skip to Interview (senior profiles) ────┘
Side states:  On Hold (resumable) · Rejected (reopenable) · Withdrawn (candidate-initiated)
```

| Decision | Reasoning |
| --- | --- |
| **Assessment before interview** (changed from the brief's example order) | A test is cheap and objective; interviews are expensive. Filtering first protects interviewer time |
| **"Skip to interview"** from Shortlisted | Strong senior candidates may decline take-home tests; the recruiter keeps that flexibility |
| **Another assessment** from Interview | Supports a second technical round without a messy workaround |
| **Separate "Offer" stage** | "We want them" and "they accepted" are different events; it avoids marking someone Hired too early |
| **On Hold** | Real pipelines park good candidates when a role freezes; it's neither rejection nor progress |
| **Rejected is reopenable** | Mistakes and changed circumstances happen; the reopen is recorded in the history |
| **Withdraw** by candidate | Candidates should be able to exit cleanly; recruiters are notified |
| **Screening answers lock** once review starts | Candidates can fix mistakes early, but can't change answers after a recruiter has read them |
| **Transitions enforced server-side** | The pipeline stays trustworthy even if the UI is bypassed |

**"Where does the candidate stand and what's next?"** is answered in every stage, for both audiences:

- The **recruiter** sees a *Next action* box (e.g. "Record the assessment score. Move to interview if passed, reject if not."), with only the valid buttons.
- The **candidate** sees a plain-language status (e.g. "Please complete the technical assessment shared with you before the deadline."), plus assessment/interview details when relevant.

### History and transparency

Every submission, stage change, answer edit, information request/response, scorecard, assessment result and interview update is an **event** with the actor and a timestamp. Events are flagged as candidate-visible or internal:

- Candidates see their own journey (stage changes, messages, requests).
- Recruiters see everything, with internal items marked.
- Private notes are never exposed to candidates (verified by the automated test).

---

## 8. UX decisions

- **Neo-brutalist, minimal UI:** high contrast, thick borders and hard shadows make interactive elements obvious. Colour is used **semantically**: each stage has one colour used consistently in badges, board columns, the stepper and the funnel. Green, yellow and red mean good, potential and weak everywhere.
- **Sectioned profile editor** with ticks per section and "Save & continue", so a long form feels manageable and progress is visible.
- **"Preview as recruiter"** helps candidates improve their own profile.
- **Honest feedback:** candidates see which of a job's required skills they have before applying.
- **Mobile-friendly:** layouts stack below 900 px; tables scroll horizontally in their own container.
- **Modal confirmations** for irreversible or candidate-facing actions (stage changes, withdrawal), with pre-written but editable messages, so communication stays consistent and kind.
