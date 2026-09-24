import { apiUser, handle, HttpError } from "@/lib/auth";
import { one, q } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** Stream a document. Owners and recruiters can view; everyone else gets 404. */
export const GET = handle(async (req: Request, { params }: Ctx) => {
  const user = await apiUser();
  const id = Number((await params).id);
  const doc = await one<{ user_id: number; filename: string; mime: string; data: Uint8Array }>(
    `select user_id, filename, mime, data from documents where id = $1`,
    [id]
  );
  if (!doc || (user.role !== "recruiter" && doc.user_id !== user.id)) throw new HttpError(404, "Document not found.");
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const user = await apiUser("candidate");
  const id = Number((await params).id);
  const r = await q(`delete from documents where id = $1 and user_id = $2 returning id`, [id, user.id]);
  if (!r.length) throw new HttpError(404, "Document not found.");
  return Response.json({ ok: true });
});
