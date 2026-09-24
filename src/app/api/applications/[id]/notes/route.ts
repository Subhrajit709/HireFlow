import { apiUser, handle, HttpError, readJson } from "@/lib/auth";
import { one, q } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** Private recruiter notes — never shown to the candidate. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await apiUser("recruiter");
  const id = Number((await params).id);
  const { body } = await readJson<{ body: string }>(req);
  const text = String(body || "").trim().slice(0, 4000);
  if (!text) throw new HttpError(400, "Note can't be empty.");
  if (!(await one(`select 1 from applications where id = $1`, [id]))) throw new HttpError(404, "Application not found.");
  await q(`insert into notes (application_id, author_id, body) values ($1, $2, $3)`, [id, user.id, text]);
  return Response.json({ ok: true });
});

export const DELETE = handle(async (req: Request) => {
  const user = await apiUser("recruiter");
  const noteId = Number(new URL(req.url).searchParams.get("note"));
  const r = await q(`delete from notes where id = $1 and author_id = $2 returning id`, [noteId, user.id]);
  if (!r.length) throw new HttpError(404, "You can only delete your own notes.");
  return Response.json({ ok: true });
});
