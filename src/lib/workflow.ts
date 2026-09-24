import "server-only";
import { HttpError } from "./auth";
import { json, one, q } from "./db";
import { addEvent, notify } from "./data";
import { STAGES, TRANSITIONS, type StageKey } from "./pipeline";
import { fmtDate } from "./format";

export interface AssessmentInfo {
  title: string;
  link: string;
  due: string;
  instructions: string;
  score: string;
  result: "" | "pass" | "fail";
}
export interface InterviewInfo {
  when: string;
  mode: string;
  location: string;
  interviewers: string;
  notes: string;
}

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");

export function cleanAssessment(a: any): AssessmentInfo | null {
  if (!a) return null;
  return {
    title: str(a.title, 200),
    link: str(a.link, 500),
    due: str(a.due, 20),
    instructions: str(a.instructions, 2000),
    score: str(a.score, 20),
    result: a.result === "pass" || a.result === "fail" ? a.result : "",
  };
}
export function cleanInterview(i: any): InterviewInfo | null {
  if (!i) return null;
  return { when: str(i.when, 30), mode: str(i.mode, 50), location: str(i.location, 500), interviewers: str(i.interviewers, 300), notes: str(i.notes, 2000) };
}

/**
 * Move an application to a new stage. Validates the transition, records history,
 * stores assessment/interview details, and notifies the candidate.
 */
export async function changeStage(
  appId: number,
  actorId: number,
  to: StageKey,
  opts: { message?: string; assessment?: any; interview?: any; notifyCandidate?: boolean } = {}
) {
  const app = await one<{ id: number; stage: StageKey; candidate_id: number; job_title: string }>(
    `select a.id, a.stage, a.candidate_id, j.title as job_title from applications a join jobs j on j.id = a.job_id where a.id = $1`,
    [appId]
  );
  if (!app) throw new HttpError(404, "Application not found.");
  if (!STAGES[to]) throw new HttpError(400, "Unknown stage.");
  if (!TRANSITIONS[app.stage].includes(to)) {
    throw new HttpError(409, `Can't move from ${STAGES[app.stage].label} to ${STAGES[to].label}.`);
  }

  const assessment = to === "assessment" ? cleanAssessment(opts.assessment) : null;
  const interview = to === "interview" ? cleanInterview(opts.interview) : null;

  await q(
    `update applications set stage = $2, updated_at = now(),
       assessment = coalesce($3::text::jsonb, assessment), interview = coalesce($4::text::jsonb, interview)
     where id = $1`,
    [appId, to, assessment ? json(assessment) : null, interview ? json(interview) : null]
  );

  const message = str(opts.message, 2000);
  await addEvent(appId, actorId, "stage", { from: app.stage, to, message });

  if (opts.notifyCandidate !== false) {
    const s = STAGES[to];
    let body = `Your application for ${app.job_title} is now: ${s.candidateLabel}.`;
    if (assessment?.due) body += ` Assessment due ${fmtDate(assessment.due)}.`;
    if (interview?.when) body += ` Interview on ${fmtDate(interview.when, true)}.`;
    if (message) body += ` Message from the recruiter: “${message}”`;
    await notify(app.candidate_id, `Status update: ${s.candidateLabel}`, body, `/candidate/applications/${appId}`);
  }
  return { from: app.stage, to };
}
