import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getDocs, getProfile, listJobs, listMyApplications } from "@/lib/data";
import { computeFit } from "@/lib/scoring";
import { CandidateStageBadge, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Open jobs" };

export default async function JobsPage() {
  const user = await requireRole("candidate");
  const [jobs, { profile }, docs, apps] = await Promise.all([listJobs({ openOnly: true }), getProfile(user.id), getDocs(user.id), listMyApplications(user.id)]);
  const appByJob = new Map(apps.map((a) => [a.job_id, a]));
  return (
    <>
      <PageHeader title="Open positions" sub="Green skills are ones you already have on your profile." />
      {jobs.length === 0 ? (
        <Empty title="No open positions right now">Check back soon.</Empty>
      ) : (
        <div className="grid two">
          {jobs.map((j) => {
            const fit = computeFit(j, profile, {}, docs);
            const applied = appByJob.get(j.id);
            return (
              <Link key={j.id} href={`/candidate/jobs/${j.id}`} className="card hover">
                <div className="row between top">
                  <div className="grow">
                    <h2 style={{ marginBottom: 4 }}>{j.title}</h2>
                    <p className="muted small mb-0">
                      {j.department} · {j.location} · {j.work_mode} · {j.employment_type}
                    </p>
                  </div>
                  {applied ? <CandidateStageBadge stage={applied.stage} /> : <span className="badge bg-yellow">Open</span>}
                </div>
                <p className="small mt">{j.description.split("\n")[0].slice(0, 180)}…</p>
                <div className="chips">
                  {j.required_skills.map((s) => (
                    <span key={s} className={`chip ${fit.matched.includes(s) ? "match" : ""}`}>
                      {s}
                    </span>
                  ))}
                </div>
                <p className="tiny muted mb-0 mt" style={{ marginTop: 12 }}>
                  {j.min_experience > 0 ? `${j.min_experience}+ yrs experience` : "Freshers welcome"} · {j.openings} opening{j.openings > 1 ? "s" : ""}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
