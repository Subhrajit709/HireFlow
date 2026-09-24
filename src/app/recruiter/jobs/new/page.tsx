import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { JobForm } from "../JobForm";

export const metadata = { title: "New job" };

export default async function NewJob() {
  await requireRole("recruiter");
  return (
    <>
      <p className="small">
        <Link href="/recruiter/jobs">← Jobs</Link>
      </p>
      <PageHeader title="Create a job" sub="Everything here feeds the automatic fit score, so be specific about required skills." />
      <JobForm />
    </>
  );
}
