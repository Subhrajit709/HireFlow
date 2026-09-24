import { apiUser, handle, HttpError, readJson } from "@/lib/auth";
import type { StageKey } from "@/lib/pipeline";
import { changeStage } from "@/lib/workflow";

/** Move several applications at once (e.g. reject all knock-out failures). Invalid moves are reported, not fatal. */
export const POST = handle(async (req: Request) => {
  const user = await apiUser("recruiter");
  const b = await readJson<{ ids: number[]; to: StageKey; message?: string }>(req);
  if (!Array.isArray(b.ids) || !b.ids.length || b.ids.length > 100) throw new HttpError(400, "Select between 1 and 100 applications.");
  let moved = 0;
  const skipped: number[] = [];
  for (const id of b.ids) {
    try {
      await changeStage(Number(id), user.id, b.to, { message: b.message });
      moved++;
    } catch {
      skipped.push(Number(id));
    }
  }
  return Response.json({ moved, skipped });
});
