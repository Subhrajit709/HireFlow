import { apiUser, handle, HttpError, readJson } from "@/lib/auth";
import { json, one } from "@/lib/db";
import { addEvent, getDocs, getJob, getProfile, notify, notifyRecruiters } from "@/lib/data";
import { profileCompleteness } from "@/lib/scoring";

/** Candidate submits an application for a job. */
export const POST = handle(async (req: Request) => {
  const user = await apiUser("candidate");
  const b = await readJson<{ jobId: number; answers: Record<string, string>; coverNote?: string }>(req);
  const job = await getJob(Number(b.jobId));
  if (!job) throw new HttpError(404, "Job not found.");
  if (job.status !== "open") throw new HttpError(409, "This position is no longer accepting applications.");

  const [{ profile }, docs] = await Promise.all([getProfile(user.id), getDocs(user.id)]);
  const comp = profileCompleteness(profile, docs);
  if (!comp.canApply) throw new HttpError(422, `Please complete your profile first: ${comp.missingRequired.join(", ")}.`);

  const answers: Record<string, string> = {};
  for (const qn of job.questions) {
    const v = String(b.answers?.[qn.id] ?? "").slice(0, 1500).trim();
    if (qn.required && !v) throw new HttpError(422, `Please answer: “${qn.text}”`);
    answers[qn.id] = v;
  }

  if (await one(`select 1 from applications where candidate_id = $1 and job_id = $2`, [user.id, job.id])) {
    throw new HttpError(409, "You've already applied to this job.");
  }
  const app = await one<{ id: number }>(
    `insert into applications (candidate_id, job_id, answers, cover_note) values ($1, $2, $3::text::jsonb, $4) returning id`,
    [user.id, job.id, json(answers), String(b.coverNote || "").slice(0, 2000)]
  );
  await addEvent(app!.id, user.id, "submitted", { to: "applied", message: "Application submitted" });
  await notify(user.id, "Application received", `We've received your application for ${job.title}. You can track it here.`, `/candidate/applications/${app!.id}`);
  await notifyRecruiters("New application", `${user.name} applied for ${job.title}.`, `/recruiter/applications/${app!.id}`);
  return Response.json({ id: app!.id });
});
