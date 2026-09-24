import { apiUser, handle, HttpError, readJson } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { addEvent, notifyRecruiters } from "@/lib/data";

type Ctx = { params: Promise<{ id: string }> };

/** Candidate responds to an information request. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await apiUser("candidate");
  const id = Number((await params).id);
  const { response } = await readJson<{ response: string }>(req);
  const text = String(response || "").trim().slice(0, 3000);
  if (!text) throw new HttpError(400, "Please write a response.");
  const r = await one<{ application_id: number }>(
    `select r.application_id from info_requests r join applications a on a.id = r.application_id
     where r.id = $1 and a.candidate_id = $2`,
    [id, user.id]
  );
  if (!r) throw new HttpError(404, "Request not found.");
  await q(`update info_requests set response = $2, responded_at = now() where id = $1`, [id, text]);
  await addEvent(r.application_id, user.id, "info_response", { message: "Candidate responded to an information request" });
  await notifyRecruiters("Candidate replied", `${user.name} answered your information request.`, `/recruiter/applications/${r.application_id}`);
  return Response.json({ ok: true });
});
