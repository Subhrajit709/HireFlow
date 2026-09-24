import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDocs, getProfile, listJobs, listMyApplications, listNotifications } from "@/lib/data";
import { computeFit, profileCompleteness } from "@/lib/scoring";
import { stage } from "@/lib/pipeline";
import { fmtAgo } from "@/lib/format";
import { Bar, CandidateStageBadge, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function CandidateDashboard() {
  const user = await requireRole("candidate");
  const [{ profile }, docs, apps, notes, jobs] = await Promise.all([
    getProfile(user.id),
    getDocs(user.id),
    listMyApplications(user.id),
    listNotifications(user.id, 5),
    listJobs({ openOnly: true }),
  ]);
  const comp = profileCompleteness(profile, docs);
  const appliedJobIds = new Set(apps.map((a) => a.job_id));
  const suggestions = jobs
    .filter((j) => !appliedJobIds.has(j.id))
    .map((j) => ({ job: j, fit: computeFit(j, profile, {}, docs) }))
    .sort((a, b) => b.fit.matched.length / (b.job.required_skills.length || 1) - a.fit.matched.length / (a.job.required_skills.length || 1))
    .slice(0, 3);
  const pending = apps.reduce((a, x) => a + x.pending_info, 0);

  return (
    <>
      <PageHeader title={`Hi, ${user.name.split(" ")[0]} 👋`} sub="Here's where everything stands." />

      {pending > 0 && (
        <div className="alert yellow mb">
          <b>
            A recruiter is waiting on you: {pending} information request{pending > 1 ? "s" : ""}.
          </b>{" "}
          Open the application to reply.
        </div>
      )}

      <div className="grid side">
        <div className="stack lg">
          <section className="card">
            <div className="card-title">
              <h2>My applications</h2>
              <Link href="/candidate/jobs" className="btn sm">
                Browse jobs
              </Link>
            </div>
            {apps.length === 0 ? (
              <Empty title="No applications yet" action={{ href: "/candidate/jobs", label: "Find a job" }}>
                Complete your profile, then apply in a couple of clicks.
              </Empty>
            ) : (
              <div className="stack">
                {apps.map((a) => (
                  <Link key={a.id} href={`/candidate/applications/${a.id}`} className="item card hover flat" style={{ boxShadow: "var(--sh-sm)" }}>
                    <div className="row between">
                      <div className="grow">
                        <h3 className="mb-0">{a.job_title}</h3>
                        <p className="muted small mb-0">
                          {a.department} · {a.location} · updated {fmtAgo(a.updated_at)}
                        </p>
                      </div>
                      <CandidateStageBadge stage={a.stage} />
                    </div>
                    <p className="small mb-0 mt" style={{ marginTop: 10 }}>
                      {stage(a.stage).candidateText}
                    </p>
                    {a.pending_info > 0 && <span className="badge bg-yellow mt">Reply needed</span>}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-title">
              <h2>Suggested for you</h2>
            </div>
            {suggestions.length === 0 ? (
              <p className="muted mb-0">You&apos;ve applied to every open role. Nice!</p>
            ) : (
              <div className="grid three">
                {suggestions.map(({ job, fit }) => (
                  <Link key={job.id} href={`/candidate/jobs/${job.id}`} className="card hover tight">
                    <h3>{job.title}</h3>
                    <p className="muted small">
                      {job.location} · {job.work_mode}
                    </p>
                    <p className="small mb-0">
                      <b>
                        {fit.matched.length}/{job.required_skills.length}
                      </b>{" "}
                      required skills matched
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="stack lg">
          <section className={`card ${comp.canApply ? "" : "bg-yellow"}`}>
            <div className="row between">
              <h3 className="mb-0">Profile strength</h3>
              <b className="mono">{comp.percent}%</b>
            </div>
            <div className="mt" style={{ marginTop: 10 }}>
              <Bar value={comp.percent} color={comp.canApply ? "green" : undefined} />
            </div>
            {comp.missingRequired.length > 0 ? (
              <>
                <p className="small mt mb-0">
                  <b>Required before you can apply:</b>
                </p>
                <ul className="small" style={{ paddingLeft: 18, margin: "6px 0 12px" }}>
                  {comp.missingRequired.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="small mt">All required sections are complete, so you can apply to any role.</p>
            )}
            <Link href="/candidate/profile" className="btn block dark">
              {comp.canApply ? "Improve profile" : "Complete profile"}
            </Link>
          </section>

          <section className="card">
            <div className="card-title">
              <h3>Updates</h3>
              <Link href="/candidate/notifications" className="small">
                View all
              </Link>
            </div>
            {notes.length === 0 ? (
              <p className="muted small mb-0">Nothing yet.</p>
            ) : (
              <div className="stack">
                {notes.map((n) => (
                  <div key={n.id} className="small">
                    <b>{n.title}</b> {!n.read && <span className="badge bg-red">new</span>}
                    <div className="muted">{n.body}</div>
                    <div className="tiny muted">{fmtAgo(n.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
