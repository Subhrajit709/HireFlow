import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listJobs } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Jobs" };

export default async function JobsAdmin() {
  await requireRole("recruiter");
  const jobs = await listJobs();
  return (
    <>
      <PageHeader title="Jobs" sub="Required skills, experience, budget and knock-out questions drive each applicant's fit score.">
        <Link href="/recruiter/jobs/new" className="btn primary">
          + New job
        </Link>
      </PageHeader>
      {jobs.length === 0 ? (
        <Empty title="No jobs yet" action={{ href: "/recruiter/jobs/new", label: "Create a job" }} />
      ) : (
        <div className="grid two">
          {jobs.map((j) => (
            <div key={j.id} className="card">
              <div className="row between top">
                <div className="grow">
                  <h2 style={{ marginBottom: 4 }}>{j.title}</h2>
                  <p className="small muted mb-0">
                    {j.department} · {j.location} · {j.work_mode} · posted {fmtDate(j.created_at)}
                  </p>
                </div>
                <span className={`badge ${j.status === "open" ? "bg-green" : "bg-gray"}`}>{j.status}</span>
              </div>
              <div className="chips mt">
                {j.required_skills.map((s) => (
                  <span key={s} className="chip">
                    {s}
                  </span>
                ))}
              </div>
              <p className="small mt mb-0">
                <b>{j.applicant_count}</b> applicants · <b>{j.to_review}</b> to review · {j.questions.length} screening questions ({j.questions.filter((q) => q.knockout).length} knock-out)
              </p>
              <div className="row mt">
                <Link href={`/recruiter/candidates?job=${j.id}`} className="btn sm dark">
                  View applicants
                </Link>
                <Link href={`/recruiter/board?job=${j.id}`} className="btn sm">
                  Board
                </Link>
                <Link href={`/recruiter/jobs/${j.id}/edit`} className="btn sm">
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
