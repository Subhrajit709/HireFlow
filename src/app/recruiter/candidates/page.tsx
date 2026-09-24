import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listApplicationSummaries, listJobs, type AppSummary } from "@/lib/data";
import { ACTIVE_STAGES, STAGES, type StageKey } from "@/lib/pipeline";
import { normSkill } from "@/lib/scoring";
import { PageHeader } from "@/components/ui";
import { CandidateTable } from "./CandidateTable";

export const metadata = { title: "Candidates" };

type SP = { q?: string; job?: string; stage?: string; band?: string; skill?: string; maxNotice?: string; minExp?: string; ko?: string; sort?: string; starred?: string };

function applyFilters(list: AppSummary[], sp: SP) {
  let out = list;
  const text = (sp.q || "").trim().toLowerCase();
  if (text) {
    out = out.filter((a) =>
      [a.candidate_name, a.candidate_email, a.headline, a.city, a.job_title, ...a.topSkills, ...a.fit.matched].join(" ").toLowerCase().includes(text)
    );
  }
  if (sp.job) out = out.filter((a) => a.job_id === Number(sp.job));
  if (sp.stage === "active") out = out.filter((a) => ACTIVE_STAGES.includes(a.stage));
  else if (sp.stage) out = out.filter((a) => a.stage === sp.stage);
  if (sp.band) out = out.filter((a) => a.fit.band === sp.band);
  if (sp.skill) {
    const s = normSkill(sp.skill);
    out = out.filter((a) => a.topSkills.some((x) => normSkill(x) === s) || a.fit.matched.some((x) => normSkill(x) === s));
  }
  if (sp.maxNotice) out = out.filter((a) => a.noticePeriodDays !== "" && Number(a.noticePeriodDays) <= Number(sp.maxNotice));
  if (sp.minExp) out = out.filter((a) => a.experienceYears >= Number(sp.minExp));
  if (sp.ko === "hide") out = out.filter((a) => !a.fit.knockoutsFailed.length);
  if (sp.ko === "only") out = out.filter((a) => a.fit.knockoutsFailed.length);
  if (sp.starred) out = out.filter((a) => a.starred);
  const sort = sp.sort || "fit";
  const by: Record<string, (a: AppSummary, b: AppSummary) => number> = {
    fit: (a, b) => b.fit.score - a.fit.score,
    recent: (a, b) => +new Date(b.submitted_at) - +new Date(a.submitted_at),
    rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
    exp: (a, b) => b.experienceYears - a.experienceYears,
    name: (a, b) => a.candidate_name.localeCompare(b.candidate_name),
  };
  return [...out].sort(by[sort] ?? by.fit);
}

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("recruiter");
  const sp = await searchParams;
  const [all, jobs] = await Promise.all([listApplicationSummaries(), listJobs()]);
  const list = applyFilters(all, sp);
  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/recruiter/candidates${p.toString() ? `?${p}` : ""}`;
  };
  const active = Object.entries(sp).filter(([k, v]) => v && k !== "sort").length;

  const quick: [string, Partial<SP>][] = [
    ["All", {}],
    ["New (to screen)", { stage: "applied" }],
    ["Strong matches", { band: "strong", stage: "active" }],
    ["Ready for test", { stage: "shortlisted" }],
    ["Ready for interview", { stage: "assessment" }],
    ["Interviewing", { stage: "interview" }],
    ["Knock-out failed", { ko: "only", stage: "active" }],
    ["★ Starred", { starred: "1" }],
  ];

  return (
    <>
      <PageHeader title="Candidates" sub={`${list.length} of ${all.length} applications`}>
        <Link href="/recruiter/board" className="btn">
          Board view
        </Link>
      </PageHeader>

      <div className="row mb" style={{ gap: 8, marginBottom: 14 }}>
        {quick.map(([label, patch]) => {
          const href = `/recruiter/candidates${Object.keys(patch).length ? `?${new URLSearchParams(patch as Record<string, string>)}` : ""}`;
          const on = JSON.stringify(Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== "sort"))) === JSON.stringify(patch);
          return (
            <Link key={label} href={href} className={`btn sm ${on ? "dark" : ""}`}>
              {label}
            </Link>
          );
        })}
      </div>

      <form className="card tight mb" method="get" style={{ marginBottom: 18 }}>
        <div className="row" style={{ gap: 10, alignItems: "flex-end" }}>
          <label className="field grow" style={{ minWidth: 200 }}>
            Search
            <input className="input sm" name="q" defaultValue={sp.q} placeholder="Name, email, skill, city…" />
          </label>
          <label className="field">
            Job
            <select className="select sm" name="job" defaultValue={sp.job ?? ""}>
              <option value="">All jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Stage
            <select className="select sm" name="stage" defaultValue={sp.stage ?? ""}>
              <option value="">Any stage</option>
              <option value="active">Active only</option>
              {(Object.keys(STAGES) as StageKey[]).map((k) => (
                <option key={k} value={k}>
                  {STAGES[k].label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Fit
            <select className="select sm" name="band" defaultValue={sp.band ?? ""}>
              <option value="">Any</option>
              <option value="strong">Strong (75+)</option>
              <option value="potential">Potential (50-74)</option>
              <option value="weak">Weak (&lt;50)</option>
            </select>
          </label>
          <label className="field" style={{ width: 120 }}>
            Has skill
            <input className="input sm" name="skill" defaultValue={sp.skill} placeholder="e.g. React" />
          </label>
          <label className="field" style={{ width: 100 }}>
            Min exp
            <input className="input sm" name="minExp" type="number" min={0} step={0.5} defaultValue={sp.minExp} />
          </label>
          <label className="field" style={{ width: 118 }}>
            Notice ≤ days
            <input className="input sm" name="maxNotice" type="number" min={0} defaultValue={sp.maxNotice} />
          </label>
          <label className="field">
            Knock-outs
            <select className="select sm" name="ko" defaultValue={sp.ko ?? ""}>
              <option value="">Show all</option>
              <option value="hide">Hide failed</option>
              <option value="only">Only failed</option>
            </select>
          </label>
          <label className="field">
            Sort
            <select className="select sm" name="sort" defaultValue={sp.sort ?? "fit"}>
              <option value="fit">Fit score</option>
              <option value="rating">Recruiter rating</option>
              <option value="recent">Most recent</option>
              <option value="exp">Experience</option>
              <option value="name">Name</option>
            </select>
          </label>
          <button className="btn dark sm">Apply</button>
          {active > 0 && (
            <Link href={qs({ q: "", job: "", stage: "", band: "", skill: "", maxNotice: "", minExp: "", ko: "", starred: "" })} className="btn ghost sm">
              Clear
            </Link>
          )}
        </div>
      </form>

      <CandidateTable rows={list} />
    </>
  );
}
