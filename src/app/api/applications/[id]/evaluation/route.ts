import { apiUser, handle, HttpError, readJson } from "@/lib/auth";
import { json, one, q } from "@/lib/db";
import { addEvent } from "@/lib/data";
import { EVAL_CRITERIA, RECOMMENDATIONS } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** Upsert the current recruiter's scorecard. One scorecard per recruiter per application. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const user = await apiUser("recruiter");
  const id = Number((await params).id);
  const b = await readJson<{ scores: Record<string, number>; recommendation: string; comments?: string }>(req);
  if (!(await one(`select 1 from applications where id = $1`, [id]))) throw new HttpError(404, "Application not found.");
  if (!RECOMMENDATIONS.some((r) => r.key === b.recommendation)) throw new HttpError(400, "Pick an overall recommendation.");
  const scores: Record<string, number> = {};
  for (const c of EVAL_CRITERIA) {
    const v = Number(b.scores?.[c.key] ?? 0);
    scores[c.key] = Number.isFinite(v) ? Math.min(5, Math.max(0, Math.round(v))) : 0;
  }
  if (!Object.values(scores).some((v) => v > 0)) throw new HttpError(400, "Score at least one criterion.");
  await q(
    `insert into evaluations (application_id, recruiter_id, scores, recommendation, comments, updated_at)
     values ($1, $2, $3::text::jsonb, $4, $5, now())
     on conflict (application_id, recruiter_id) do update
       set scores = excluded.scores, recommendation = excluded.recommendation, comments = excluded.comments, updated_at = now()`,
    [id, user.id, json(scores), b.recommendation, String(b.comments || "").slice(0, 3000)]
  );
  const label = RECOMMENDATIONS.find((r) => r.key === b.recommendation)!.label;
  await addEvent(id, user.id, "evaluation", { message: `Scorecard saved: ${label}`, visible: false });
  return Response.json({ ok: true });
});
