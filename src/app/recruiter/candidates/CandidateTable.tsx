"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction, useToast } from "@/components/client";
import { FitScore, FlagDots, Rating, StageBadge } from "@/components/ui";
import { STAGES, type StageKey } from "@/lib/pipeline";
import { fmtAgo } from "@/lib/format";
import type { AppSummary } from "@/lib/data";

export function CandidateTable({ rows }: { rows: AppSummary[] }) {
  const router = useRouter();
  const { run, busy } = useAction();
  const toast = useToast();
  const [sel, setSel] = useState<number[]>([]);
  const [bulkTo, setBulkTo] = useState<StageKey | "">("");
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOn = rows.length > 0 && rows.every((r) => sel.includes(r.id));

  if (!rows.length) return <div className="empty">No candidates match these filters.</div>;

  return (
    <>
      {sel.length > 0 && (
        <div className="card tight bg-yellow row between mb sticky-top" style={{ marginBottom: 14, zIndex: 5 }}>
          <b>{sel.length} selected</b>
          <div className="row">
            <button className="btn sm" disabled={sel.length < 2 || sel.length > 4} title="Select 2–4 candidates" onClick={() => router.push(`/recruiter/compare?ids=${sel.join(",")}`)}>
              Compare {sel.length >= 2 && sel.length <= 4 ? `(${sel.length})` : "(2–4)"}
            </button>
            <select className="select sm" style={{ width: 190 }} value={bulkTo} onChange={(e) => setBulkTo(e.target.value as StageKey)}>
              <option value="">Move to stage…</option>
              {(["under_review", "shortlisted", "on_hold", "rejected"] as StageKey[]).map((k) => (
                <option key={k} value={k}>
                  {STAGES[k].label}
                </option>
              ))}
            </select>
            <button
              className="btn dark sm"
              disabled={!bulkTo || busy}
              onClick={async () => {
                const r = await run<{ moved: number; skipped: number[] }>("/api/applications/bulk", "POST", { ids: sel, to: bulkTo });
                if (r) {
                  // Invalid moves for some rows (e.g. Offer → On hold) are skipped server-side, not fatal.
                  toast(
                    r.skipped.length ? `Moved ${r.moved}; ${r.skipped.length} skipped (not allowed from their current stage)` : `Moved ${r.moved} candidate(s)`,
                    r.skipped.length ? "error" : "ok"
                  );
                  setSel([]);
                  setBulkTo("");
                }
              }}
            >
              Apply
            </button>
            <button className="btn ghost sm" onClick={() => setSel([])}>
              Clear
            </button>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" aria-label="Select all" checked={allOn} onChange={() => setSel(allOn ? [] : rows.map((r) => r.id))} />
              </th>
              <th>Fit</th>
              <th>Candidate</th>
              <th>Applied for</th>
              <th>Stage</th>
              <th>Exp</th>
              <th>Skills matched</th>
              <th>Flags</th>
              <th>Rating</th>
              <th>Notice</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} style={sel.includes(a.id) ? { background: "#fff6cc" } : undefined}>
                <td>
                  <input type="checkbox" aria-label={`Select ${a.candidate_name}`} checked={sel.includes(a.id)} onChange={() => toggle(a.id)} />
                </td>
                <td>
                  <FitScore fit={a.fit} />
                </td>
                <td style={{ minWidth: 190 }}>
                  <Link href={`/recruiter/applications/${a.id}`} className="rowlink">
                    {a.starred && "★ "}
                    {a.candidate_name}
                  </Link>
                  <div className="tiny muted truncate" style={{ maxWidth: 230 }}>
                    {a.headline || a.candidate_email}
                  </div>
                  <div className="tiny muted">
                    {a.city} · {a.highestEducation}
                  </div>
                </td>
                <td style={{ minWidth: 150 }}>
                  <span className="small">{a.job_title}</span>
                  <div className="tiny muted">{fmtAgo(a.submitted_at)}</div>
                </td>
                <td>
                  <StageBadge stage={a.stage} />
                  {a.pendingInfo > 0 && <div className="tiny muted">awaiting reply</div>}
                </td>
                <td className="mono nowrap">{a.experienceYears}y</td>
                <td style={{ minWidth: 140 }}>
                  <b className="mono small">
                    {a.fit.matched.length}/{a.fit.matched.length + a.fit.missing.length}
                  </b>
                  {a.fit.missing.length > 0 && <div className="tiny muted truncate" style={{ maxWidth: 160 }}>missing: {a.fit.missing.join(", ")}</div>}
                </td>
                <td>
                  <FlagDots flags={a.fit.flags} />
                </td>
                <td>
                  <Rating value={a.rating} />
                </td>
                <td className="mono small nowrap">{a.noticePeriodDays === "" ? "—" : `${a.noticePeriodDays}d`}</td>
                <td>
                  <Link href={`/recruiter/applications/${a.id}`} className="btn xs">
                    Review →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
