import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getApplicationDetail } from "@/lib/data";
import { answerPasses, computeFit, knockoutText, scorecardAverage } from "@/lib/scoring";
import { STAGES, stage as getStage, type StageKey } from "@/lib/pipeline";
import { EVAL_CRITERIA, RECOMMENDATIONS, docCategoryLabel } from "@/lib/types";
import { externalUrl, fmtAgo, fmtDate } from "@/lib/format";
import { Avatar, Bar, FitScore, Flags, StageBadge, Stepper } from "@/components/ui";
import { ProfileView } from "@/components/ProfileView";
import { Timeline } from "@/components/Timeline";
import { AssessmentPanel, DocViewer, EvaluationForm, InfoRequestPanel, NextActions, NotesPanel, ReviewTabs, StarToggle } from "./ReviewPanels";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("recruiter");
  const d = await getApplicationDetail(Number((await params).id));
  if (!d) notFound();
  const { app, job, profile, docs, events, notes, evaluations, infoRequests, otherApps } = d;
  const st = app.stage as StageKey;
  const fit = computeFit(job, profile, app.answers || {}, docs);
  const mine = evaluations.find((e: any) => e.recruiter_id === me.id);
  const avgs = evaluations.map((e: any) => scorecardAverage(e.scores)).filter((x): x is number => x !== null);
  const avg = avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10 : null;
  const resume = docs.find((x) => x.category === "resume");
  const koFail = fit.knockoutsFailed.length > 0;

  /* ---------- tab contents (server-rendered, handed to the client tab switcher) ---------- */

  const overview = (
    <div className="stack lg">
      <div className="grid two">
        <section className="card">
          <p className="section-label">Fit score breakdown</p>
          <div className="stack" style={{ gap: 10 }}>
            {fit.breakdown.map((b) => (
              <div key={b.label}>
                <div className="row between small">
                  <b>{b.label}</b>
                  <span className="mono">
                    {b.got}/{b.max}
                  </span>
                </div>
                <Bar value={(b.got / b.max) * 100} color={b.got / b.max >= 0.75 ? "green" : "yellow"} />
                <div className="tiny muted">{b.detail}</div>
              </div>
            ))}
            {koFail && <div className="alert red small">A failed knock-out question caps the score at 40.</div>}
          </div>
        </section>
        <section className="card">
          <p className="section-label">Signals</p>
          <Flags flags={fit.flags} />
        </section>
      </div>

      <section className="card">
        <p className="section-label">Skills vs. job requirements</p>
        <div className="stack">
          <div>
            <p className="small mb-0" style={{ fontWeight: 700, marginBottom: 6 }}>
              Required ({fit.matched.length}/{job.required_skills.length})
            </p>
            <div className="chips">
              {job.required_skills.map((s) => (
                <span key={s} className={`chip ${fit.matched.includes(s) ? "match" : "miss"}`}>
                  {fit.matched.includes(s) ? "✓" : "✕"} {s}
                </span>
              ))}
            </div>
          </div>
          {job.nice_skills.length > 0 && (
            <div>
              <p className="small mb-0" style={{ fontWeight: 700, marginBottom: 6 }}>
                Nice to have ({fit.niceMatched.length}/{job.nice_skills.length})
              </p>
              <div className="chips">
                {job.nice_skills.map((s) => (
                  <span key={s} className={`chip ${fit.niceMatched.includes(s) ? "nice" : "miss"}`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <p className="section-label mb-0">Screening answers</p>
          {job.questions.some((q) => q.knockout) && (
            <span className={`badge ${koFail ? "bg-red" : "bg-green"}`}>{koFail ? `${fit.knockoutsFailed.length} knock-out failed` : "all knock-outs passed"}</span>
          )}
        </div>
        <div className="stack">
          {job.questions.map((q, i) => {
            const pass = answerPasses(q, app.answers?.[q.id]);
            return (
              <div key={q.id} className={`item ${pass === false ? "bg-red" : ""}`} style={pass === false ? { background: "#ffe0dc" } : undefined}>
                <div className="row between top">
                  <p className="small mb-0 grow" style={{ fontWeight: 700 }}>
                    {i + 1}. {q.text}
                  </p>
                  {pass === true && <span className="badge bg-green">pass</span>}
                  {pass === false && <span className="badge bg-red">fail</span>}
                </div>
                <p className="mb-0 pre">{app.answers?.[q.id] || <span className="muted">No answer</span>}</p>
                {q.knockout && <p className="tiny muted mb-0">Knock-out: {knockoutText(q)}</p>}
              </div>
            );
          })}
          {job.questions.length === 0 && <p className="muted small mb-0">No screening questions for this job.</p>}
        </div>
        {app.cover_note && (
          <>
            <hr />
            <p className="section-label">Cover note</p>
            <p className="pre mb-0">{app.cover_note}</p>
          </>
        )}
      </section>
    </div>
  );

  const evaluationTab = (
    <div className="stack lg">
      <section className="card">
        <h3>{mine ? "Your scorecard" : "Add your scorecard"}</h3>
        <p className="small muted">Score each criterion from 1 to 5 using the evidence in the profile, documents and screening answers. Your scorecard is separate from the automatic fit score.</p>
        <EvaluationForm appId={app.id} initial={mine ? { scores: mine.scores, recommendation: mine.recommendation, comments: mine.comments } : null} />
      </section>
      <section className="card">
        <h3>All scorecards ({evaluations.length})</h3>
        {evaluations.length === 0 ? (
          <p className="muted small mb-0">No one has scored this candidate yet.</p>
        ) : (
          <div className="table-wrap" style={{ boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Recruiter</th>
                  {EVAL_CRITERIA.map((c) => (
                    <th key={c.key} title={c.hint}>
                      {c.label.split(" ")[0]}
                    </th>
                  ))}
                  <th>Avg</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((e: any) => {
                  const rec = RECOMMENDATIONS.find((r) => r.key === e.recommendation);
                  return (
                    <tr key={e.id}>
                      <td>
                        <b className="small">{e.recruiter_name}</b>
                        <div className="tiny muted">{fmtAgo(e.updated_at)}</div>
                      </td>
                      {EVAL_CRITERIA.map((c) => (
                        <td key={c.key} className="mono">
                          {e.scores?.[c.key] || "—"}
                        </td>
                      ))}
                      <td className="mono">
                        <b>{scorecardAverage(e.scores) ?? "—"}</b>
                      </td>
                      <td>{rec && <span className={`badge bg-${rec.color}`}>{rec.label}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {evaluations.filter((e: any) => e.comments).map((e: any) => (
          <p key={e.id} className="small mt mb-0">
            <b>{e.recruiter_name}:</b> {e.comments}
          </p>
        ))}
      </section>
    </div>
  );

  const tabs = [
    { key: "overview", label: "Overview", content: overview },
    { key: "profile", label: "Full profile", content: <ProfileView profile={profile} requiredSkills={job.required_skills} niceSkills={job.nice_skills} email={app.candidate_email} /> },
    { key: "documents", label: "Documents", count: docs.length, content: <DocViewer docs={docs.map((x) => ({ ...x, categoryLabel: docCategoryLabel(x.category) }))} /> },
    { key: "evaluation", label: "Scorecard", count: evaluations.length, content: evaluationTab },
    { key: "notes", label: "Notes", count: notes.length, content: <NotesPanel appId={app.id} notes={notes as any} meId={me.id} /> },
    {
      key: "history",
      label: "History",
      content: (
        <section className="card">
          <p className="small muted">Every stage change, request and update, with who did it and when. Items marked internal are hidden from the candidate.</p>
          <Timeline events={events as any} audience="recruiter" />
        </section>
      ),
    },
  ];

  return (
    <>
      <p className="small">
        <Link href="/recruiter/candidates">← All candidates</Link>
      </p>

      <section className="card mb" style={{ marginBottom: 18 }}>
        <div className="row top" style={{ gap: 18 }}>
          <Avatar name={app.candidate_name} large />
          <div className="grow" style={{ minWidth: 240 }}>
            <div className="row" style={{ gap: 10 }}>
              <h1 className="mb-0">{app.candidate_name}</h1>
              <StarToggle appId={app.id} starred={app.starred} />
            </div>
            <p className="mb-0" style={{ fontWeight: 600 }}>
              {profile.personal.headline || "—"}
            </p>
            <p className="small muted mb-0">
              Applied for <b>{job.title}</b> · {fmtDate(app.submitted_at)} · profile updated {fmtAgo(d.profileUpdatedAt)}
            </p>
            <div className="row mt" style={{ gap: 8, marginTop: 12 }}>
              {resume && (
                <a href={`/api/documents/${resume.id}`} target="_blank" rel="noreferrer" className="btn sm primary">
                  Resume ↗
                </a>
              )}
              {profile.links.linkedin && (
                <a href={externalUrl(profile.links.linkedin)} target="_blank" rel="noreferrer" className="btn sm">
                  LinkedIn ↗
                </a>
              )}
              {profile.links.github && (
                <a href={externalUrl(profile.links.github)} target="_blank" rel="noreferrer" className="btn sm">
                  GitHub ↗
                </a>
              )}
              {profile.links.portfolio && (
                <a href={externalUrl(profile.links.portfolio)} target="_blank" rel="noreferrer" className="btn sm">
                  Portfolio ↗
                </a>
              )}
              <a href={`mailto:${app.candidate_email}`} className="btn sm ghost">
                {app.candidate_email}
              </a>
            </div>
          </div>
          <div className="row" style={{ gap: 14 }}>
            <div className="center">
              <FitScore fit={fit} large />
              <div className="caps" style={{ marginTop: 6 }}>
                Fit
              </div>
            </div>
            <div className="center">
              <span className="score lg bg-white">{avg ?? "—"}</span>
              <div className="caps" style={{ marginTop: 6 }}>
                Rating
              </div>
            </div>
          </div>
        </div>
        <hr style={{ margin: "18px 0" }} />
        <div className="grid four" style={{ gap: 10 }}>
          {[
            ["Experience", `${fit.experienceYears} yrs`, job.min_experience ? `needs ${job.min_experience}+` : "freshers ok"],
            ["Notice period", profile.additional.noticePeriodDays === "" ? "—" : `${profile.additional.noticePeriodDays} days`, profile.additional.availableFrom ? `from ${fmtDate(profile.additional.availableFrom)}` : ""],
            ["Expected CTC", profile.additional.expectedCtc ? `${profile.additional.expectedCtc} LPA` : "—", job.max_ctc ? `budget ${job.max_ctc} LPA` : ""],
            ["Location", profile.personal.city || "—", profile.additional.willingToRelocate === "yes" ? "open to relocate" : profile.additional.willingToRelocate === "no" ? "won't relocate" : ""],
          ].map(([k, v, sub]) => (
            <div key={k}>
              <div className="caps muted">{k}</div>
              <b>{v}</b>
              {sub && <div className="tiny muted">{sub}</div>}
            </div>
          ))}
        </div>
      </section>

      <section className="card mb" style={{ marginBottom: 18 }}>
        <Stepper stage={st} />
      </section>

      <div className="grid side">
        <div>
          <ReviewTabs tabs={tabs} />
        </div>
        <aside className="stack lg">
          <section className={`card bg-${getStage(st).color === "white" ? "yellow" : getStage(st).color}`}>
            <p className="section-label">Current stage: {STAGES[st].label}</p>
            <p className="small">
              <b>Next action:</b> {STAGES[st].recruiterNext}
            </p>
            <NextActions appId={app.id} stage={st} candidateName={app.candidate_name} recommendHint={fit.band} koFail={koFail} />
          </section>

          {(st === "assessment" || app.assessment) && <AssessmentPanel appId={app.id} assessment={app.assessment} />}

          {app.interview && (
            <section className="card">
              <p className="section-label">Interview</p>
              <dl className="kv" style={{ gridTemplateColumns: "90px 1fr" }}>
                <dt>When</dt>
                <dd>{app.interview.when ? fmtDate(app.interview.when, true) : "TBC"}</dd>
                <dt>Mode</dt>
                <dd>{app.interview.mode}</dd>
                <dt>Where</dt>
                <dd>{app.interview.location || "—"}</dd>
                <dt>Panel</dt>
                <dd>{app.interview.interviewers || "—"}</dd>
              </dl>
              {app.interview.notes && <p className="small pre mt mb-0">{app.interview.notes}</p>}
            </section>
          )}

          <InfoRequestPanel appId={app.id} requests={infoRequests as any} />

          <section className="card">
            <p className="section-label">Pre-interview checklist</p>
            <ul className="small stack" style={{ listStyle: "none", padding: 0, margin: 0, gap: 4 }}>
              <li>{resume ? "✓" : "✕"} Resume uploaded</li>
              <li>{docs.some((x) => x.category === "marksheet_10") && docs.some((x) => x.category === "marksheet_12") ? "✓" : "✕"} 10th & 12th certificates</li>
              <li>{koFail ? "✕" : "✓"} Knock-out questions passed</li>
              <li>{fit.missing.length === 0 ? "✓" : "✕"} All required skills present</li>
              <li>{evaluations.length ? "✓" : "✕"} At least one scorecard</li>
              <li>{app.assessment?.result === "pass" ? "✓" : app.assessment?.result === "fail" ? "✕" : "…"} Technical assessment passed</li>
              <li>{infoRequests.every((r: any) => r.response) ? "✓" : "…"} All info requests answered</li>
            </ul>
          </section>

          {otherApps.length > 0 && (
            <section className="card">
              <p className="section-label">Other applications</p>
              {otherApps.map((o: any) => (
                <Link key={o.id} href={`/recruiter/applications/${o.id}`} className="row between small" style={{ textDecoration: "none", padding: "4px 0" }}>
                  <span>{o.job_title}</span>
                  <StageBadge stage={o.stage} />
                </Link>
              ))}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
