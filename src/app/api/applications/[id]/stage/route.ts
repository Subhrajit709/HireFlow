import { apiUser, handle, readJson } from "@/lib/auth";
import type { StageKey } from "@/lib/pipeline";
import { changeStage } from "@/lib/workflow";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await apiUser("recruiter");
  const id = Number((await params).id);
  const b = await readJson<{ to: StageKey; message?: string; assessment?: unknown; interview?: unknown; notifyCandidate?: boolean }>(req);
  const r = await changeStage(id, user.id, b.to, b);
  return Response.json(r);
});
