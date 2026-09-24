import { apiUser, handle, HttpError, readJson } from "@/lib/auth";
import { json, q } from "@/lib/db";
import { parseJob } from "@/lib/jobInput";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  await apiUser("recruiter");
  const id = Number((await params).id);
  const j = parseJob(await readJson(req));
  const r = await q(
    `update jobs set title=$2, department=$3, location=$4, employment_type=$5, work_mode=$6, description=$7,
       required_skills=$8::text::jsonb, nice_skills=$9::text::jsonb, min_experience=$10, max_ctc=$11, openings=$12, questions=$13::text::jsonb, status=$14
     where id = $1 returning id`,
    [id, j.title, j.department, j.location, j.employment_type, j.work_mode, j.description, json(j.required_skills), json(j.nice_skills),
     j.min_experience, j.max_ctc, j.openings, json(j.questions), j.status]
  );
  if (!r.length) throw new HttpError(404, "Job not found.");
  return Response.json({ ok: true });
});
