import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listMyApplications } from "@/lib/data";
import { stage } from "@/lib/pipeline";
import { fmtAgo, fmtDate } from "@/lib/format";
import { CandidateStageBadge, Empty, PageHeader, Stepper } from "@/components/ui";

export const metadata = { title: "My applications" };

export default async function MyApplications() {
  const user = await requireRole("candidate");
  const apps = await listMyApplications(user.id);
  return (
    <>
      <PageHeader title="My applications" sub="Track where each application stands and what happens next." />
      {apps.length === 0 ? (
        <Empty title="You haven't applied yet" action={{ href: "/candidate/jobs", label: "Browse open jobs" }} />
      ) : (
        <div className="stack lg">
          {apps.map((a) => (
            <Link key={a.id} href={`/candidate/applications/${a.id}`} className="card hover">
              <div className="row between top">
                <div className="grow">
                  <h2 style={{ marginBottom: 2 }}>{a.job_title}</h2>
                  <p className="muted small mb-0">
                    Applied {fmtDate(a.submitted_at)} · last update {fmtAgo(a.updated_at)}
                  </p>
                </div>
                <div className="row">
                  {a.pending_info > 0 && <span className="badge bg-yellow">Reply needed</span>}
                  <CandidateStageBadge stage={a.stage} />
                </div>
              </div>
              <div className="mt">
                <Stepper stage={a.stage} audience="candidate" />
              </div>
              <p className="small mb-0 mt">
                <b>What&apos;s next:</b> {stage(a.stage).candidateText}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
