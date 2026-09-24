import { apiUser, handle, HttpError, readJson } from "@/lib/auth";
import { json, q } from "@/lib/db";
import { addEvent, getApplicationRow, getJob, notifyRecruiters } from "@/lib/data";
import { canEditAnswers, canWithdraw } from "@/lib/pipeline";
import { cleanAssessment, cleanInterview } from "@/lib/workflow";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH is used by both roles:
 *  - candidate: { action: "answers", answers } | { action: "withdraw", reason }
 *  - recruiter: { action: "details", starred?, assessment?, interview? }
 */
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const user = await apiUser();
  const id = Number((await params).id);
  const app = await getApplicationRow(id);
  if (!app || (user.role === "candidate" && app.candidate_id !== user.id)) throw new HttpError(404, "Application not found.");
  const b = await readJson<any>(req);

  if (user.role === "candidate") {
    if (b.action === "answers") {
      if (!canEditAnswers(app.stage)) throw new HttpError(409, "Answers are locked once a recruiter starts reviewing your application.");
      const job = await getJob(app.job_id);
      const answers: Record<string, string> = {};
      for (const qn of job!.questions) {
        const v = String(b.answers?.[qn.id] ?? "").slice(0, 1500).trim();
        if (qn.required && !v) throw new HttpError(422, `Please answer: “${qn.text}”`);
        answers[qn.id] = v;
      }
      await q(`update applications set answers = $2::text::jsonb, updated_at = now() where id = $1`, [id, json(answers)]);
      await addEvent(id, user.id, "answers_updated", { message: "Screening answers updated" });
      return Response.json({ ok: true });
    }
    if (b.action === "withdraw") {
      if (!canWithdraw(app.stage)) throw new HttpError(409, "This application can no longer be withdrawn.");
      const reason = String(b.reason || "").slice(0, 500);
      await q(`update applications set stage = 'withdrawn', updated_at = now() where id = $1`, [id]);
      await addEvent(id, user.id, "stage", { from: app.stage, to: "withdrawn", message: reason });
      await notifyRecruiters("Application withdrawn", `${user.name} withdrew an application.${reason ? ` Reason: ${reason}` : ""}`, `/recruiter/applications/${id}`);
      return Response.json({ ok: true });
    }
    throw new HttpError(400, "Unknown action.");
  }

  // recruiter
  if (b.action !== "details") throw new HttpError(400, "Unknown action.");
  if (typeof b.starred === "boolean") await q(`update applications set starred = $2 where id = $1`, [id, b.starred]);
  if (b.assessment) {
    const a = cleanAssessment(b.assessment)!;
    await q(`update applications set assessment = $2::text::jsonb, updated_at = now() where id = $1`, [id, json(a)]);
    if (a.score || a.result) {
      await addEvent(id, user.id, "assessment", {
        message: `Assessment result recorded: ${a.score ? `score ${a.score}` : ""}${a.result ? ` (${a.result})` : ""}`,
        visible: false,
      });
    }
  }
  if (b.interview) {
    await q(`update applications set interview = $2::text::jsonb, updated_at = now() where id = $1`, [id, json(cleanInterview(b.interview))]);
    await addEvent(id, user.id, "interview", { message: "Interview details updated" });
  }
  return Response.json({ ok: true });
});
