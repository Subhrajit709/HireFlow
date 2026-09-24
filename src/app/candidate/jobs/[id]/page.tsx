import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import { getDocs, getJob, getProfile } from "@/lib/data";
import { computeFit, profileCompleteness } from "@/lib/scoring";
import { PageHeader } from "@/components/ui";
import { ApplyForm } from "./ApplyForm";

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("candidate");
  const job = await getJob(Number((await params).id));
  if (!job) notFound();
  const [{ profile }, docs, existing] = await Promise.all([
    getProfile(user.id),
    getDocs(user.id),
    one<{ id: number }>(`select id from applications where candidate_id = $1 and job_id = $2`, [user.id, job.id]),
  ]);
  const comp = profileCompleteness(profile, docs);
  const fit = computeFit(job, profile, {}, docs);

  return (
    <>
      <p className="small">
        <Link href="/candidate/jobs">← All jobs</Link>
      </p>
      <PageHeader title={job.title} sub={`${job.department} · ${job.location} · ${job.work_mode} · ${job.employment_type}`} />
      <div className="grid side">
        <div className="stack lg">
          <section className="card">
            <p className="section-label">About the role</p>
            <p className="pre">{job.description}</p>
            <hr />
            <div className="grid two">
              <div>
                <p className="section-label">Required skills</p>
                <div className="chips">
                  {job.required_skills.map((s) => (
                    <span key={s} className={`chip ${fit.matched.includes(s) ? "match" : ""}`}>
                      {fit.matched.includes(s) ? "✓ " : ""}
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="section-label">Nice to have</p>
                <div className="chips">
                  {job.nice_skills.length ? (
                    job.nice_skills.map((s) => (
                      <span key={s} className={`chip ${fit.niceMatched.includes(s) ? "nice" : ""}`}>
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="muted small">—</span>
                  )}
                </div>
              </div>
            </div>
            <dl className="kv mt-lg">
              <dt>Experience</dt>
              <dd>{job.min_experience > 0 ? `${job.min_experience}+ years` : "Freshers welcome"}</dd>
              <dt>Openings</dt>
              <dd>{job.openings}</dd>
            </dl>
          </section>

          {existing ? (
            <div className="card bg-green">
              <h3>You&apos;ve applied to this role</h3>
              <Link href={`/candidate/applications/${existing.id}`} className="btn dark">
                Track application →
              </Link>
            </div>
          ) : job.status !== "open" ? (
            <div className="alert">This position is closed to new applications.</div>
          ) : (
            <section className="card">
              <h2>Apply</h2>
              <p className="muted small">
                Your saved profile and documents are attached automatically. Answer the screening questions below. You can edit them until a
                recruiter starts reviewing.
              </p>
              <ApplyForm jobId={job.id} questions={job.questions} canApply={comp.canApply} missing={comp.missingRequired} />
            </section>
          )}
        </div>

        <aside className="stack lg sticky-top">
          <section className="card">
            <p className="section-label">Your match</p>
            <p className="mb-0">
              <b className="mono" style={{ fontSize: 26 }}>
                {fit.matched.length}/{job.required_skills.length}
              </b>{" "}
              required skills
            </p>
            {fit.missing.length > 0 && (
              <p className="small muted mt">
                Not on your profile: {fit.missing.join(", ")}. If you do have these, add them to your profile before applying.
              </p>
            )}
            <p className="small mb-0">
              Your experience: <b>{fit.experienceYears} yrs</b>
            </p>
          </section>
          <section className={`card ${comp.canApply ? "" : "bg-yellow"}`}>
            <p className="section-label">Profile readiness</p>
            <p className="mb-0">
              <b>{comp.percent}%</b> complete
            </p>
            {!comp.canApply && (
              <Link href="/candidate/profile" className="btn dark block mt">
                Finish profile
              </Link>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
