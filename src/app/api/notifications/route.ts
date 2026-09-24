import { apiUser, handle, readJson } from "@/lib/auth";
import { q } from "@/lib/db";

/** Mark notifications read: { all: true } or { id }. */
export const POST = handle(async (req: Request) => {
  const user = await apiUser();
  const b = await readJson<{ all?: boolean; id?: number }>(req);
  if (b.all) await q(`update notifications set read = true where user_id = $1 and not read`, [user.id]);
  else if (b.id) await q(`update notifications set read = true where user_id = $1 and id = $2`, [user.id, Number(b.id)]);
  return Response.json({ ok: true });
});
