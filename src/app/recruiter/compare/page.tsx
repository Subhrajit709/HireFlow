import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listApplicationSummaries } from "@/lib/data";
import { RECOMMENDATIONS } from "@/lib/types";
import { Avatar, Empty, FitScore, Flags, PageHeader, Rating, StageBadge } from "@/components/ui";

export const metadata = { title: "Compare candidates" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireRole("recruiter");
  const ids = ((await searchParams).ids || "").split(",").map(Number).filter(Boolean).slice(0, 4);
  const all = await listApplicationSummaries();
  const list = ids.map((id) => all.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a);
  if (list.length < 2) {
    return (
      <>
        <PageHeader title="Compare candidates" />
        <Empty title="Pick 2–4 candidates to compare" action={{ href: "/recruiter/candidates", label: "Go to candidates" }}>
          Tick the checkboxes in the candidates table, then press Compare.
        </Empty>
      </>
    );
  }
  const best = (vals: number[], higher = true) => (higher ? Math.max(...vals) : Math.min(...vals));
  const fitBest = best(list.map((a) => a.fit.score));
  const expBest = best(list.map((a) => a.experienceYears));
  const ratingBest = best(list.map((a) => a.rating ?? -1));
  const noticeBest = best(list.map((a) => (a.noticePeriodDays === "" ? 999 : Number(a.noticePeriodDays))), false);
  const hl = (on: boolean) => (on ? { background: "#dcf7e7" } : undefined);

  const rows: [string, (a: (typeof list)[number]) => React.ReactNode, ((a: (typeof list)[number]) => boolean)?][] = [
    ["Applied for", (a) => a.job_title],
    ["Stage", (a) => <StageBadge stage={a.stage} />],
    ["Fit score", (a) => <FitScore fit={a.fit} />, (a) => a.fit.score === fitBest],
    ["Recruiter rating", (a) => <Rating value={a.rating} />, (a) => a.rating !== null && a.rating === ratingBest],
    [
      "Recommendations",
      (a) =>
        a.recommendations.length ? (
          <div className="chips">
            {a.recommendations.map((r, i) => {
              const R = RECOMMENDATIONS.find((x) => x.key === r)!;
              return (
                <span key={i} className={`badge bg-${R.color}`}>
                  {R.label}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="muted">—</span>
        ),
    ],
    ["Experience", (a) => `${a.experienceYears} yrs`, (a) => a.experienceYears === expBest],
    ["Education", (a) => a.highestEducation],
    [
      "Required skills",
      (a) => (
        <div className="chips">
          {a.fit.matched.map((s) => (
            <span key={s} className="chip match">
              {s}
            </span>
          ))}
          {a.fit.missing.map((s) => (
            <span key={s} className="chip miss">
              {s}
            </span>
          ))}
        </div>
      ),
    ],
    ["Knock-outs", (a) => (a.fit.knockoutsFailed.length ? <span className="badge bg-red">{a.fit.knockoutsFailed.length} failed</span> : <span className="badge bg-green">passed</span>)],
    ["Notice period", (a) => (a.noticePeriodDays === "" ? "—" : `${a.noticePeriodDays} days`), (a) => a.noticePeriodDays !== "" && Number(a.noticePeriodDays) === noticeBest],
    ["Expected CTC", (a) => (a.expectedCtc ? `${a.expectedCtc} LPA` : "—")],
    ["Location", (a) => a.city || "—"],
    ["Profile completeness", (a) => `${a.completeness}%`],
    ["Signals", (a) => <Flags flags={a.fit.flags} limit={5} />],
  ];

  return (
    <>
      <p className="small">
        <Link href="/recruiter/candidates">← Candidates</Link>
      </p>
      <PageHeader title="Compare candidates" sub="Best value in each row is highlighted green." />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 160 }} />
              {list.map((a) => (
                <th key={a.id} style={{ textTransform: "none", letterSpacing: 0, fontFamily: "var(--font)", fontSize: 14, minWidth: 220 }}>
                  <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                    <Avatar name={a.candidate_name} />
                    <div>
                      <Link href={`/recruiter/applications/${a.id}`} className="rowlink">
                        {a.candidate_name}
                      </Link>
                      <div className="tiny muted" style={{ fontWeight: 500 }}>
                        {a.headline}
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, render, isBest]) => (
              <tr key={label}>
                <td className="caps">{label}</td>
                {list.map((a) => (
                  <td key={a.id} style={hl(!!isBest?.(a))}>
                    {render(a)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {list.map((a) => (
                <td key={a.id}>
                  <Link href={`/recruiter/applications/${a.id}`} className="btn sm primary">
                    Open review →
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
