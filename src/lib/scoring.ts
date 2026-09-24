// Candidate evaluation engine — pure functions, safe on server and client.
//
// 1. profileCompleteness(): what's filled / what's mandatory before applying
// 2. computeFit(): an explainable 0-100 "fit score" against a specific job + red/amber/green flags
//
// The fit score is a *triage aid*, never an auto-decision: every point is traceable to a rule
// shown in the UI, and the recruiter's own scorecard is kept separate.

import type { DocumentMeta, Job, Profile, ScreeningQuestion } from "./types";

/* ---------------------------------------------------------------- skills */

const ALIASES: Record<string, string> = {
  js: "javascript",
  es6: "javascript",
  ts: "typescript",
  reactjs: "react",
  "react.js": "react",
  node: "node.js",
  nodejs: "node.js",
  "next.js": "nextjs",
  next: "nextjs",
  postgres: "postgresql",
  psql: "postgresql",
  mongo: "mongodb",
  "spring boot": "springboot",
  "spring-boot": "springboot",
  k8s: "kubernetes",
  py: "python",
  golang: "go",
  "c sharp": "c#",
  ml: "machine learning",
  "rest api": "rest",
  "rest apis": "rest",
  restful: "rest",
  css3: "css",
  html5: "html",
  aws: "aws",
  "amazon web services": "aws",
};

/** Knowing the left-hand skill implies the right-hand ones (e.g. PostgreSQL ⇒ SQL). */
const IMPLIES: Record<string, string[]> = {
  postgresql: ["sql"],
  mysql: ["sql"],
  oracle: ["sql"],
  sqlite: ["sql"],
  "sql server": ["sql"],
  nextjs: ["react"],
  typescript: ["javascript"],
  springboot: ["java", "spring"],
  pandas: ["python"],
  django: ["python"],
  flask: ["python"],
  express: ["node.js"],
  "express.js": ["node.js"],
};

export function expandSkills(skills: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const s of skills) {
    const n = normSkill(s);
    out.add(n);
    for (const i of IMPLIES[n] ?? []) out.add(i);
  }
  return out;
}

export function normSkill(s: string): string {
  const k = s.trim().toLowerCase().replace(/\s+/g, " ");
  return ALIASES[k] ?? k;
}

export function splitList(s: string | undefined): string[] {
  return (s || "")
    .split(/[,;/|\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------ experience */

function monthsBetween(start: string, end: string): number {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  if (!sy || !ey) return 0;
  return Math.max(0, (ey - sy) * 12 + ((em || 1) - (sm || 1)) + 1);
}

function nowYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Total professional experience in years (internships count half). Overlaps are merged. */
export function totalExperienceYears(p: Profile): number {
  // Each calendar month counts once (overlapping jobs aren't double counted), weighted by the
  // highest-weight role active that month.
  const monthWeight = new Map<number, number>();
  const idx = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return y * 12 + ((m || 1) - 1);
  };
  for (const e of p.experience) {
    if (!e.start) continue;
    const w = /intern/i.test(e.type) ? 0.5 : 1;
    const from = idx(e.start);
    const to = idx(e.current || !e.end ? nowYm() : e.end);
    for (let i = from; i <= to && i - from < 600; i++) monthWeight.set(i, Math.max(monthWeight.get(i) ?? 0, w));
  }
  const months = [...monthWeight.values()].reduce((a, b) => a + b, 0);
  return Math.round((months / 12) * 10) / 10;
}

/** Longest gap (months) between consecutive full-time roles. */
function longestGapMonths(p: Profile): number {
  const roles = p.experience
    .filter((e) => e.start && !/intern/i.test(e.type))
    .map((e) => ({ s: e.start, e: e.current || !e.end ? nowYm() : e.end }))
    .sort((a, b) => a.s.localeCompare(b.s));
  let gap = 0;
  for (let i = 1; i < roles.length; i++) {
    const g = monthsBetween(roles[i - 1].e, roles[i].s) - 2;
    if (g > gap) gap = g;
  }
  return gap;
}

/* ---------------------------------------------------------- completeness */

export interface Completeness {
  percent: number;
  sections: { key: string; label: string; done: boolean; required: boolean }[];
  missingRequired: string[];
  canApply: boolean;
}

export function profileCompleteness(p: Profile, docs: Pick<DocumentMeta, "category">[]): Completeness {
  const has = (c: string) => docs.some((d) => d.category === c);
  const per = p.personal;
  const sections = [
    { key: "personal", label: "Personal & contact details", required: true, done: !!(per.fullName && per.phone && per.city && per.headline) },
    { key: "education", label: "Education (at least one entry)", required: true, done: p.education.length > 0 },
    { key: "experience", label: "Work experience (or mark as fresher)", required: true, done: p.experience.length > 0 || p.additional.isFresher },
    { key: "skills", label: "Skills (at least 3)", required: true, done: p.skills.length >= 3 },
    { key: "resume", label: "Resume / CV upload", required: true, done: has("resume") },
    { key: "academic", label: "10th & 12th certificates", required: true, done: has("marksheet_10") && has("marksheet_12") },
    { key: "additional", label: "Availability (notice period, expected CTC)", required: true, done: !!(p.additional.noticePeriodDays !== "" && p.additional.expectedCtc) },
    { key: "projects", label: "Projects", required: false, done: p.projects.length > 0 },
    { key: "links", label: "LinkedIn / GitHub / Portfolio", required: false, done: !!(p.links.linkedin || p.links.github || p.links.portfolio) },
    { key: "summary", label: "Professional summary", required: false, done: per.summary.trim().length >= 40 },
    { key: "certs", label: "Certifications", required: false, done: p.certifications.length > 0 || has("certificate") },
  ];
  const weight = (s: (typeof sections)[number]) => (s.required ? 2 : 1);
  const total = sections.reduce((a, s) => a + weight(s), 0);
  const got = sections.filter((s) => s.done).reduce((a, s) => a + weight(s), 0);
  const missingRequired = sections.filter((s) => s.required && !s.done).map((s) => s.label);
  return { percent: Math.round((got / total) * 100), sections, missingRequired, canApply: missingRequired.length === 0 };
}

/* ------------------------------------------------------------- screening */

export function answerPasses(q: ScreeningQuestion, answer: string | undefined): boolean | null {
  if (!q.knockout) return null;
  if (answer === undefined || answer === "") return false;
  const { op, value } = q.knockout;
  if (op === "eq") return answer.trim().toLowerCase() === value.trim().toLowerCase();
  const a = Number(answer);
  const v = Number(value);
  if (Number.isNaN(a)) return false;
  return op === "gte" ? a >= v : a <= v;
}

export function knockoutText(q: ScreeningQuestion): string {
  if (!q.knockout) return "";
  const { op, value } = q.knockout;
  return op === "eq" ? `expects "${value}"` : op === "gte" ? `expects ≥ ${value}` : `expects ≤ ${value}`;
}

/* ------------------------------------------------------------------- fit */

export type FlagLevel = "red" | "amber" | "green";
export interface Flag {
  level: FlagLevel;
  text: string;
}

export interface FitResult {
  score: number;
  band: "strong" | "potential" | "weak";
  breakdown: { label: string; got: number; max: number; detail: string }[];
  matched: string[];
  missing: string[];
  niceMatched: string[];
  experienceYears: number;
  knockoutsFailed: string[];
  flags: Flag[];
}

type FitJob = Pick<Job, "required_skills" | "nice_skills" | "min_experience" | "max_ctc" | "questions">;

export function computeFit(
  job: FitJob,
  p: Profile,
  answers: Record<string, string>,
  docs: Pick<DocumentMeta, "category">[]
): FitResult {
  const flags: Flag[] = [];
  const breakdown: FitResult["breakdown"] = [];

  // --- Skills (45 + 10) — declared skills, backed up by project tech stacks
  const declared = expandSkills(p.skills.map((s) => s.name));
  const evidenced = expandSkills(p.projects.flatMap((pr) => splitList(pr.tech)));
  const all = new Set([...declared, ...evidenced]);
  const req = job.required_skills || [];
  const matched = req.filter((s) => all.has(normSkill(s)));
  const missing = req.filter((s) => !all.has(normSkill(s)));
  const niceMatched = (job.nice_skills || []).filter((s) => all.has(normSkill(s)));
  const reqRatio = req.length ? matched.length / req.length : 1;
  const skillPts = Math.round(45 * reqRatio);
  breakdown.push({ label: "Required skills", got: skillPts, max: 45, detail: `${matched.length}/${req.length} matched` });
  const nicePts = job.nice_skills?.length ? Math.round(10 * (niceMatched.length / job.nice_skills.length)) : 10;
  breakdown.push({ label: "Nice-to-have skills", got: nicePts, max: 10, detail: `${niceMatched.length}/${job.nice_skills?.length || 0} matched` });

  if (req.length && reqRatio === 1) flags.push({ level: "green", text: "Has every required skill" });
  else if (reqRatio < 0.5) flags.push({ level: "red", text: `Only ${matched.length}/${req.length} required skills` });
  const provenByProject = matched.filter((s) => evidenced.has(normSkill(s)));
  if (provenByProject.length >= 2) flags.push({ level: "green", text: `Projects use ${provenByProject.slice(0, 3).join(", ")}` });

  // --- Experience (20)
  const years = totalExperienceYears(p);
  const min = Number(job.min_experience) || 0;
  const expPts = min === 0 ? 20 : Math.round(20 * Math.min(1, years / min));
  breakdown.push({ label: "Experience", got: expPts, max: 20, detail: `${years} yrs vs ${min} required` });
  if (min > 0 && years < min - 1) flags.push({ level: "red", text: `Experience ${years}y is well below the ${min}y requirement` });
  else if (min > 0 && years < min) flags.push({ level: "amber", text: `Slightly under experience (${years}y / ${min}y)` });
  const gap = longestGapMonths(p);
  if (gap >= 6) flags.push({ level: "amber", text: `Career gap of ~${gap} months` });
  const fullTime = p.experience.filter((e) => !/intern/i.test(e.type) && e.start);
  if (fullTime.length >= 3 && years / fullTime.length < 1) flags.push({ level: "amber", text: "Frequent job changes (avg tenure < 1 yr)" });

  // --- Screening (15)
  const qs = job.questions || [];
  const ko = qs.filter((q) => q.knockout);
  const knockoutsFailed = ko.filter((q) => answerPasses(q, answers[q.id]) === false).map((q) => q.text);
  const unanswered = qs.filter((q) => q.required && !(answers[q.id] ?? "").toString().trim()).length;
  const scrPts = ko.length ? Math.round(15 * ((ko.length - knockoutsFailed.length) / ko.length)) : 15;
  breakdown.push({ label: "Screening", got: scrPts, max: 15, detail: ko.length ? `${ko.length - knockoutsFailed.length}/${ko.length} criteria met` : "no knock-out criteria" });
  for (const t of knockoutsFailed) flags.push({ level: "red", text: `Knock-out failed: ${t}` });
  if (unanswered) flags.push({ level: "amber", text: `${unanswered} required screening answer(s) missing` });

  // --- Profile quality (10)
  const comp = profileCompleteness(p, docs);
  const qPts = Math.round(10 * (comp.percent / 100));
  breakdown.push({ label: "Profile completeness", got: qPts, max: 10, detail: `${comp.percent}% complete` });
  if (!docs.some((d) => d.category === "resume")) flags.push({ level: "red", text: "No resume uploaded" });
  if (p.links.github || p.links.portfolio) flags.push({ level: "green", text: "Has GitHub / portfolio" });

  // --- Logistics (no points; flags only)
  const notice = Number(p.additional.noticePeriodDays);
  if (!Number.isNaN(notice) && notice > 60) flags.push({ level: "amber", text: `Notice period ${notice} days` });
  if (p.additional.noticePeriodDays !== "" && notice === 0) flags.push({ level: "green", text: "Can join immediately" });
  const exp = Number(p.additional.expectedCtc);
  if (job.max_ctc && exp && exp > Number(job.max_ctc))
    flags.push({ level: exp > Number(job.max_ctc) * 1.2 ? "red" : "amber", text: `Expects ${exp} LPA (budget ${job.max_ctc} LPA)` });

  let score = breakdown.reduce((a, b) => a + b.got, 0);
  if (knockoutsFailed.length) score = Math.min(score, 40); // a failed knock-out caps the score
  const band: FitResult["band"] = score >= 75 && !knockoutsFailed.length ? "strong" : score >= 50 ? "potential" : "weak";

  const order = { red: 0, amber: 1, green: 2 };
  flags.sort((a, b) => order[a.level] - order[b.level]);
  return { score, band, breakdown, matched, missing, niceMatched, experienceYears: years, knockoutsFailed, flags };
}

/** Average of a recruiter scorecard (1-5 per criterion). */
export function scorecardAverage(scores: Record<string, number> | null | undefined): number | null {
  if (!scores) return null;
  const vals = Object.values(scores).filter((v) => typeof v === "number" && v > 0);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}
