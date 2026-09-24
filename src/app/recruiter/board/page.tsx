import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listApplicationSummaries, listJobs } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { Board } from "./Board";

export const metadata = { title: "Pipeline board" };

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ job?: string; closed?: string }> }) {
  await requireRole("recruiter");
  const sp = await searchParams;
  const [jobs, apps] = await Promise.all([listJobs(), listApplicationSummaries(sp.job ? { jobId: Number(sp.job) } : {})]);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/recruiter/board${p.toString() ? `?${p}` : ""}`;
  };
  return (
    <>
      <PageHeader title="Pipeline board" sub="Drag a card to another column to move it. Only valid next steps are accepted.">
        <Link href={qs({ closed: sp.closed ? undefined : "1" })} className="btn sm">
          {sp.closed ? "Hide closed" : "Show on hold / rejected"}
        </Link>
      </PageHeader>
      <div className="row mb" style={{ gap: 8, marginBottom: 16 }}>
        <Link href={qs({ job: undefined })} className={`btn sm ${!sp.job ? "dark" : ""}`}>
          All jobs
        </Link>
        {jobs.map((j) => (
          <Link key={j.id} href={qs({ job: String(j.id) })} className={`btn sm ${sp.job === String(j.id) ? "dark" : ""}`}>
            {j.title}
          </Link>
        ))}
      </div>
      <Board apps={apps} showClosed={!!sp.closed} />
    </>
  );
}
