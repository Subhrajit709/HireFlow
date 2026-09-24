import { HttpError } from "./auth";
import type { ScreeningQuestion } from "./types";

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => s(x, 60)).filter(Boolean).slice(0, 30) : []);

/** Validate and normalise the job form payload. */
export function parseJob(b: any) {
  const title = s(b.title, 160);
  const location = s(b.location, 120);
  const description = s(b.description, 8000);
  if (!title || !location || !description) throw new HttpError(400, "Title, location and description are required.");
  const required_skills = list(b.required_skills);
  if (!required_skills.length) throw new HttpError(400, "Add at least one required skill.");
  const questions: ScreeningQuestion[] = (Array.isArray(b.questions) ? b.questions : []).slice(0, 20).map((q: any, i: number) => {
    const type = ["yesno", "number", "text", "choice"].includes(q.type) ? q.type : "text";
    const text = s(q.text, 400);
    if (!text) throw new HttpError(400, `Screening question ${i + 1} is empty.`);
    const options = type === "choice" ? list(q.options) : undefined;
    if (type === "choice" && (!options || options.length < 2)) throw new HttpError(400, `Question ${i + 1} needs at least two options.`);
    const ko = q.knockout && type !== "text" ? { op: ["eq", "gte", "lte"].includes(q.knockout.op) ? q.knockout.op : "eq", value: s(String(q.knockout.value ?? ""), 100) } : null;
    return { id: s(q.id, 40) || `q_${i}`, text, type, options, required: !!q.required, knockout: ko };
  });
  const num = (v: unknown, d: number) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));
  return {
    title,
    department: s(b.department, 120),
    location,
    employment_type: s(b.employment_type, 40) || "Full-time",
    work_mode: s(b.work_mode, 40) || "On-site",
    description,
    required_skills,
    nice_skills: list(b.nice_skills),
    min_experience: Math.max(0, num(b.min_experience, 0)),
    max_ctc: b.max_ctc === "" || b.max_ctc === null || b.max_ctc === undefined ? null : Math.max(0, num(b.max_ctc, 0)),
    openings: Math.max(1, Math.round(num(b.openings, 1))),
    status: b.status === "closed" ? "closed" : "open",
    questions,
  };
}
