import "server-only";
import { q, one, json } from "./db";
import { computeFit, profileCompleteness, scorecardAverage, type FitResult } from "./scoring";
import { normalizeProfile, type DocumentMeta, type Job, type Profile, type Recommendation } from "./types";
import type { StageKey } from "./pipeline";

/* ---------------------------------------------------------------- jobs */

function toJob(r: any): Job {
  return {
    ...r,
    min_experience: Number(r.min_experience) || 0,
    max_ctc: r.max_ctc === null || r.max_ctc === undefined ? null : Number(r.max_ctc),
    required_skills: r.required_skills || [],
    nice_skills: r.nice_skills || [],
    questions: r.questions || [],
  };
}

export async function listJobs(opts: { openOnly?: boolean } = {}) {
  const rows = await q(
    `select j.*,
       (select count(*)::int from applications a where a.job_id = j.id) as applicant_count,
       (select count(*)::int from applications a where a.job_id = j.id and a.stage in ('applied','under_review')) as to_review
     from jobs j ${opts.openOnly ? "where j.status = 'open'" : ""}
     order by j.status asc, j.created_at desc`
  );
  return rows.map((r) => ({ ...toJob(r), applicant_count: r.applicant_count as number, to_review: r.to_review as number }));
}

export async function getJob(id: number): Promise<Job | null> {
  const r = await one(`select * from jobs where id = $1`, [id]);
  return r ? toJob(r) : null;
}

/* ------------------------------------------------------------- profile */

export async function getProfile(userId: number): Promise<{ profile: Profile; updatedAt: Date | null }> {
  const u = await one<{ name: string }>(`select name from users where id = $1`, [userId]);
  const r = await one<{ data: any; updated_at: Date }>(`select data, updated_at from profiles where user_id = $1`, [userId]);
  return { profile: normalizeProfile(r?.data, u?.name ?? ""), updatedAt: r?.updated_at ?? null };
}

export async function saveProfile(userId: number, profile: Profile) {
  await q(
    `insert into profiles (user_id, data, updated_at) values ($1, $2::text::jsonb, now())
     on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
    [userId, json(profile)]
  );
  if (profile.personal.fullName.trim()) {
    await q(`update users set name = $2 where id = $1`, [userId, profile.personal.fullName.trim()]);
  }
}

export async function getDocs(userId: number): Promise<DocumentMeta[]> {
  return q<DocumentMeta>(
    `select id, user_id, category, label, filename, mime, size, uploaded_at
     from documents where user_id = $1 order by uploaded_at desc`,
    [userId]
  );
}

/* -------------------------------------------------------- notifications */

export async function notify(userId: number, title: string, body = "", link: string | null = null) {
  await q(`insert into notifications (user_id, title, body, link) values ($1, $2, $3, $4)`, [userId, title, body, link]);
}

export async function notifyRecruiters(title: string, body = "", link: string | null = null) {
  await q(
    `insert into notifications (user_id, title, body, link) select id, $1, $2, $3 from users where role = 'recruiter'`,
    [title, body, link]
  );
}

export async function listNotifications(userId: number, limit = 50) {
  return q<{ id: number; title: string; body: string; link: string | null; read: boolean; created_at: Date }>(
    `select * from notifications where user_id = $1 order by created_at desc limit $2`,
    [userId, limit]
  );
}

export async function unreadCount(userId: number): Promise<number> {
  const r = await one<{ n: number }>(`select count(*)::int as n from notifications where user_id = $1 and not read`, [userId]);
  return r?.n ?? 0;
}

/* --------------------------------------------------------------- events */

export async function addEvent(
  applicationId: number,
  actorId: number | null,
  kind: string,
  opts: { from?: string | null; to?: string | null; message?: string; visible?: boolean } = {}
) {
  await q(
    `insert into events (application_id, actor_id, kind, from_stage, to_stage, message, visible_to_candidate)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [applicationId, actorId, kind, opts.from ?? null, opts.to ?? null, opts.message ?? "", opts.visible ?? true]
  );
}

/* ---------------------------------------------------------- applications */

export interface AppRow {
  id: number;
  stage: StageKey;
  starred: boolean;
  submitted_at: Date;
  updated_at: Date;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  job_id: number;
  job_title: string;
}

export interface AppSummary extends AppRow {
  headline: string;
  city: string;
  experienceYears: number;
  noticePeriodDays: string;
  expectedCtc: string;
  topSkills: string[];
  fit: FitResult;
  completeness: number;
  rating: number | null;
  evalCount: number;
  recommendations: Recommendation[];
  notesCount: number;
  pendingInfo: number;
  highestEducation: string;
  hasResume: boolean;
}

const EDU_RANK: Record<string, number> = { "10th": 1, "12th": 2, Diploma: 3, "Bachelor's": 4, "Master's": 5, PhD: 6 };

/** All applications with a computed fit + evaluation summary. Filtering happens in memory — fine for
 *  hundreds of applicants; see docs for how this would scale (materialised fit score column). */
export async function listApplicationSummaries(filter: { jobId?: number; candidateId?: number } = {}): Promise<AppSummary[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter.jobId) {
    params.push(filter.jobId);
    where.push(`a.job_id = $${params.length}`);
  }
  if (filter.candidateId) {
    params.push(filter.candidateId);
    where.push(`a.candidate_id = $${params.length}`);
  }
  const rows = await q(
    `select a.id, a.stage, a.starred, a.submitted_at, a.updated_at, a.answers,
            u.id as candidate_id, u.name as candidate_name, u.email as candidate_email,
            j.id as job_id, j.title as job_title, j.required_skills, j.nice_skills, j.min_experience, j.max_ctc, j.questions,
            p.data as profile,
            coalesce((select json_agg(d.category) from documents d where d.user_id = u.id), '[]'::json) as doc_cats,
            coalesce((select json_agg(json_build_object('scores', e.scores, 'rec', e.recommendation))
                      from evaluations e where e.application_id = a.id), '[]'::json) as evals,
            (select count(*)::int from notes n where n.application_id = a.id) as notes_count,
            (select count(*)::int from info_requests r where r.application_id = a.id and r.response is null) as pending_info
     from applications a
     join users u on u.id = a.candidate_id
     join jobs j on j.id = a.job_id
     left join profiles p on p.user_id = u.id
     ${where.length ? "where " + where.join(" and ") : ""}
     order by a.submitted_at desc`,
    params
  );

  return rows.map((r) => {
    const profile = normalizeProfile(r.profile, r.candidate_name);
    const docs = (r.doc_cats as string[]).map((category) => ({ category }));
    const job = toJob(r);
    const fit = computeFit(job, profile, r.answers || {}, docs);
    const evals = (r.evals as { scores: Record<string, number>; rec: Recommendation }[]) || [];
    const avgs = evals.map((e) => scorecardAverage(e.scores)).filter((x): x is number => x !== null);
    const edu = [...profile.education].sort((a, b) => (EDU_RANK[b.level] ?? 0) - (EDU_RANK[a.level] ?? 0))[0];
    return {
      id: r.id,
      stage: r.stage,
      starred: r.starred,
      submitted_at: r.submitted_at,
      updated_at: r.updated_at,
      candidate_id: r.candidate_id,
      candidate_name: r.candidate_name,
      candidate_email: r.candidate_email,
      job_id: r.job_id,
      job_title: r.job_title,
      headline: profile.personal.headline,
      city: profile.personal.city,
      experienceYears: fit.experienceYears,
      noticePeriodDays: profile.additional.noticePeriodDays,
      expectedCtc: profile.additional.expectedCtc,
      topSkills: [...profile.skills].sort((a, b) => b.level - a.level).slice(0, 6).map((s) => s.name),
      fit,
      completeness: profileCompleteness(profile, docs).percent,
      rating: avgs.length ? Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10 : null,
      evalCount: evals.length,
      recommendations: evals.map((e) => e.rec),
      notesCount: r.notes_count,
      pendingInfo: r.pending_info,
      highestEducation: edu ? [edu.degree || edu.level, edu.field].filter(Boolean).join(" · ") : "—",
      hasResume: docs.some((d) => d.category === "resume"),
    } satisfies AppSummary;
  });
}

export async function getApplicationRow(id: number) {
  return one<{ id: number; candidate_id: number; job_id: number; stage: StageKey; answers: Record<string, string> }>(
    `select id, candidate_id, job_id, stage, answers from applications where id = $1`,
    [id]
  );
}

/** Everything a recruiter needs on the review screen. */
export async function getApplicationDetail(id: number) {
  const app = await one(
    `select a.*, u.name as candidate_name, u.email as candidate_email, u.created_at as candidate_since
     from applications a join users u on u.id = a.candidate_id where a.id = $1`,
    [id]
  );
  if (!app) return null;
  const [job, { profile, updatedAt }, docs, events, notes, evaluations, infoRequests, otherApps] = await Promise.all([
    getJob(app.job_id),
    getProfile(app.candidate_id),
    getDocs(app.candidate_id),
    q(
      `select e.*, u.name as actor_name, u.role as actor_role from events e
       left join users u on u.id = e.actor_id where e.application_id = $1 order by e.created_at desc, e.id desc`,
      [id]
    ),
    q(
      `select n.*, u.name as author_name from notes n left join users u on u.id = n.author_id
       where n.application_id = $1 order by n.created_at desc`,
      [id]
    ),
    q(
      `select e.*, u.name as recruiter_name from evaluations e join users u on u.id = e.recruiter_id
       where e.application_id = $1 order by e.updated_at desc`,
      [id]
    ),
    q(`select * from info_requests where application_id = $1 order by created_at desc`, [id]),
    q(
      `select a.id, a.stage, j.title as job_title from applications a join jobs j on j.id = a.job_id
       where a.candidate_id = $1 and a.id <> $2`,
      [app.candidate_id, id]
    ),
  ]);
  return {
    app: app as AppRow & {
      answers: Record<string, string>;
      cover_note: string;
      assessment: any;
      interview: any;
      candidate_since: Date;
    },
    job: job!,
    profile,
    profileUpdatedAt: updatedAt,
    docs,
    events,
    notes,
    evaluations,
    infoRequests,
    otherApps,
  };
}

/** Candidate-facing: their own applications (with job info). */
export async function listMyApplications(userId: number) {
  return q<{
    id: number;
    stage: StageKey;
    submitted_at: Date;
    updated_at: Date;
    job_id: number;
    job_title: string;
    department: string;
    location: string;
    pending_info: number;
  }>(
    `select a.id, a.stage, a.submitted_at, a.updated_at, j.id as job_id, j.title as job_title, j.department, j.location,
       (select count(*)::int from info_requests r where r.application_id = a.id and r.response is null) as pending_info
     from applications a join jobs j on j.id = a.job_id
     where a.candidate_id = $1 order by a.updated_at desc`,
    [userId]
  );
}

export async function getMyApplication(id: number, userId: number) {
  const app = await one(`select * from applications where id = $1 and candidate_id = $2`, [id, userId]);
  if (!app) return null;
  const [job, events, infoRequests] = await Promise.all([
    getJob(app.job_id),
    q(
      `select id, kind, from_stage, to_stage, message, created_at from events
       where application_id = $1 and visible_to_candidate order by created_at desc, id desc`,
      [id]
    ),
    q(`select id, question, response, created_at, responded_at from info_requests where application_id = $1 order by created_at desc`, [id]),
  ]);
  return { app, job: job!, events, infoRequests };
}

export async function dashboardStats() {
  const byStage = await q<{ stage: StageKey; n: number }>(`select stage, count(*)::int as n from applications group by stage`);
  const totals = await one<{ candidates: number; jobs: number; week: number }>(
    `select (select count(*)::int from users where role = 'candidate') as candidates,
            (select count(*)::int from jobs where status = 'open') as jobs,
            (select count(*)::int from applications where submitted_at > now() - interval '7 days') as week`
  );
  return { byStage: Object.fromEntries(byStage.map((r) => [r.stage, r.n])) as Partial<Record<StageKey, number>>, ...totals! };
}
