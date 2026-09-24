import { apiUser, handle, readJson } from "@/lib/auth";
import { json, one } from "@/lib/db";
import { listJobs } from "@/lib/data";
import { parseJob } from "@/lib/jobInput";

export const GET = handle(async () => {
  await apiUser();
  return Response.json(await listJobs({ openOnly: true }));
});

export const POST = handle(async (req: Request) => {
  const user = await apiUser("recruiter");
  const j = parseJob(await readJson(req));
  const row = await one<{ id: number }>(
    `insert into jobs (title, department, location, employment_type, work_mode, description, required_skills, nice_skills,
                       min_experience, max_ctc, openings, questions, status, created_by)
     values ($1,$2,$3,$4,$5,$6,$7::text::jsonb,$8::text::jsonb,$9,$10,$11,$12::text::jsonb,$13,$14) returning id`,
    [j.title, j.department, j.location, j.employment_type, j.work_mode, j.description, json(j.required_skills), json(j.nice_skills),
     j.min_experience, j.max_ctc, j.openings, json(j.questions), j.status, user.id]
  );
  return Response.json({ id: row!.id });
});
