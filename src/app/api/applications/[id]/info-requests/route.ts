import { apiUser, handle, HttpError, readJson } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { addEvent, notify } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

/** Recruiter asks the candidate for additional information during recruitment. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await apiUser("recruiter");
  const id = Number((await params).id);
  const { question } = await readJson<{ question: string }>(req);
  const text = String(question || "").trim().slice(0, 1500);
  if (!text) throw new HttpError(400, "Write the question for the candidate.");
  const app = await one<{ candidate_id: number; job_title: string }>(
    `select a.candidate_id, j.title as job_title from applications a join jobs j on j.id = a.job_id where a.id = $1`,
    [id]
  );
  if (!app) throw new HttpError(404, "Application not found.");
  await q(`insert into info_requests (application_id, requested_by, question) values ($1, $2, $3)`, [id, user.id, text]);
  await addEvent(id, user.id, "info_request", { message: `Information requested: ${text}` });
  await notify(app.candidate_id, "Information requested", `The recruiter for ${app.job_title} asked: “${text}”`, `/candidate/applications/${id}`);
  return Response.json({ ok: true });
});
