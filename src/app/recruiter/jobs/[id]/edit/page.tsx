import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getJob } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { JobForm } from "../../JobForm";

export const metadata = { title: "Edit job" };

export default async function EditJob({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("recruiter");
  const job = await getJob(Number((await params).id));
  if (!job) notFound();
  return (
    <>
      <p className="small">
        <Link href="/recruiter/jobs">← Jobs</Link>
      </p>
      <PageHeader title={`Edit: ${job.title}`} sub="Changes to skills or knock-outs re-score existing applicants instantly." />
      <JobForm job={job} />
    </>
  );
}
