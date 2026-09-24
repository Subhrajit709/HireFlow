import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { dashboardStats, listApplicationSummaries, listJobs, type AppSummary } from "@/lib/data";
import { ACTIVE_STAGES, STAGES } from "@/lib/pipeline";
import { daysSince, fmtDate } from "@/lib/format";
import { Avatar, FitScore, PageHeader, StageBadge } from "@/components/ui";
import { q } from "@/lib/db";

export const metadata = { title: "Recruiter dashboard" };

function MiniRow({ a, extra }: { a: AppSummary; extra?: React.ReactNode }) {
  return (
    <Link href={`/recruiter/applications/${a.id}`} className="row between" style={{ textDecoration: "none", padding: "8px 0", borderTop: "1px dashed #ccc" }}>
      <span className="row grow" style={{ gap: 10, flexWrap: "nowrap", minWidth: 0 }}>
        <FitScore fit={a.fit} />
        <span className="grow" style={{ minWidth: 0 }}>
          <b className="small">{a.candidate_name}</b>
          <div className="tiny muted truncate">{a.job_title}</div>
        </span>
      </span>
      {extra}
    </Link>
  );
}

export default async function RecruiterDashboard() {
  const user = await requireRole("recruiter");
  const [stats, apps, jobs, interviews] = await Promise.all([
    dashboardStats(),
    listApplicationSummaries(),
    listJobs(),
    q<{ id: number; interview: any; name: string; title: string }>(
      `select a.id, a.interview, u.name, j.title from applications a join users u on u.id = a.candidate_id join jobs j on j.id = a.job_id
       where a.stage = 'interview' and a.interview is not null`
    ),
  ]);

  const toReview = apps.filter((a) => a.stage === "applied").sort((a, b) => b.fit.score - a.fit.score);
  const stale = apps.filter((a) => a.stage === "applied" && daysSince(a.submitted_at) >= 3);
  const readyForTest = apps.filter((a) => a.stage === "shortlisted");
  const readyForInterview = apps.filter((a) => a.stage === "assessment");
  const strongUnreviewed = apps.filter((a) => ["applied", "under_review"].includes(a.stage) && a.fit.band === "strong");
  const upcoming = interviews
    .filter((i) => i.interview?.when)
    .sort((a, b) => a.interview.when.localeCompare(b.interview.when))
    .slice(0, 5);
  const activeTotal = ACTIVE_STAGES.reduce((s, k) => s + (stats.byStage[k] ?? 0), 0);
  const maxStage = Math.max(1, ...ACTIVE_STAGES.map((k) => stats.byStage[k] ?? 0));

  return (
    <>
      <PageHeader title={`Good day, ${user.name.split(" ")[0]}`} sub="Your hiring at a glance: what's moving and what needs a decision.">
        <Link href="/recruiter/candidates?stage=applied" className="btn primary">
          Review new applicants ({toReview.length})
        </Link>
      </PageHeader>

      <div className="grid four mb" style={{ marginBottom: 24 }}>
        {[
          ["Active in pipeline", activeTotal, "bg-yellow"],
          ["New this week", stats.week, "bg-blue"],
          ["Open jobs", stats.jobs, "bg-purple"],
          ["Hired", stats.byStage.hired ?? 0, "bg-green"],
        ].map(([label, n, c]) => (
          <div key={label as string} className={`card ${c}`}>
            <div className="stat">
              <span className="caps">{label}</span>
              <b>{n}</b>
            </div>
          </div>
        ))}
      </div>

      <div className="grid side">
        <div className="stack lg">
          <section className="card">
            <div className="card-title">
              <h2>Pipeline</h2>
              <Link href="/recruiter/board" className="btn sm">
                Open board →
              </Link>
            </div>
            <div className="stack" style={{ gap: 8 }}>
              {[...ACTIVE_STAGES, "hired" as const, "on_hold" as const, "rejected" as const].map((k) => {
                const n = stats.byStage[k] ?? 0;
                return (
                  <Link key={k} href={`/recruiter/candidates?stage=${k}`} className="row" style={{ textDecoration: "none", flexWrap: "nowrap" }}>
                    <span style={{ width: 170 }} className="small">
                      <StageBadge stage={k} />
                    </span>
                    <span className="grow">
                      <span
                        className={`bg-${STAGES[k].color}`}
                        style={{ display: "block", height: 22, width: `${Math.max(3, (n / maxStage) * 100)}%`, border: "2px solid var(--ink)", borderRadius: 4 }}
                      />
                    </span>
                    <b className="mono" style={{ width: 30, textAlign: "right" }}>
                      {n}
                    </b>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="grid two">
            <section className="card">
              <div className="card-title">
                <h3>Ready for technical test</h3>
                <span className="badge bg-purple">{readyForTest.length}</span>
              </div>
              <p className="tiny muted">Shortlisted and waiting for an assessment.</p>
              {readyForTest.length ? readyForTest.slice(0, 5).map((a) => <MiniRow key={a.id} a={a} />) : <p className="small muted mb-0">No one waiting.</p>}
            </section>
            <section className="card">
              <div className="card-title">
                <h3>Decide on interview</h3>
                <span className="badge bg-orange">{readyForInterview.length}</span>
              </div>
              <p className="tiny muted">In assessment. Record the result, then move them on.</p>
              {readyForInterview.length ? (
                readyForInterview.slice(0, 5).map((a) => <MiniRow key={a.id} a={a} extra={a.rating !== null ? <span className="mono small">{a.rating}/5</span> : null} />)
              ) : (
                <p className="small muted mb-0">No one waiting.</p>
              )}
            </section>
          </div>

          <section className="card">
            <div className="card-title">
              <h2>Jobs</h2>
              <Link href="/recruiter/jobs/new" className="btn sm primary">
                + New job
              </Link>
            </div>
            <div className="table-wrap" style={{ boxShadow: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="right">Applicants</th>
                    <th className="right">To review</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <Link className="rowlink" href={`/recruiter/candidates?job=${j.id}`}>
                          {j.title}
                        </Link>
                        <div className="tiny muted">{j.location}</div>
                      </td>
                      <td>
                        <span className={`badge ${j.status === "open" ? "bg-green" : "bg-gray"}`}>{j.status}</span>
                      </td>
                      <td className="right mono">{j.applicant_count}</td>
                      <td className="right mono">{j.to_review ? <b>{j.to_review}</b> : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="stack lg">
          <section className="card bg-yellow">
            <h3>Needs attention</h3>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
              <li>
                <b>{toReview.length}</b> new application(s) to screen
              </li>
              <li>
                <b>{stale.length}</b> waiting 3+ days without review
              </li>
              <li>
                <b>{strongUnreviewed.length}</b> strong match(es) not yet shortlisted
              </li>
            </ul>
          </section>

          <section className="card">
            <h3>Top new applicants</h3>
            <p className="tiny muted">Sorted by fit score. Review the strongest first.</p>
            {toReview.length ? (
              toReview.slice(0, 6).map((a) => (
                <MiniRow key={a.id} a={a} extra={a.fit.knockoutsFailed.length ? <span className="badge bg-red">KO</span> : <span className="tiny muted">{daysSince(a.submitted_at)}d</span>} />
              ))
            ) : (
              <p className="small muted mb-0">Inbox zero 🎉</p>
            )}
          </section>

          <section className="card">
            <h3>Upcoming interviews</h3>
            {upcoming.length ? (
              upcoming.map((i) => (
                <Link key={i.id} href={`/recruiter/applications/${i.id}`} className="row" style={{ textDecoration: "none", padding: "8px 0", borderTop: "1px dashed #ccc", flexWrap: "nowrap" }}>
                  <Avatar name={i.name} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <b className="small">{i.name}</b>
                    <div className="tiny muted truncate">
                      {fmtDate(i.interview.when, true)} · {i.interview.mode}
                    </div>
                  </span>
                </Link>
              ))
            ) : (
              <p className="small muted mb-0">Nothing scheduled.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
