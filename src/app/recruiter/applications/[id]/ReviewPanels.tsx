"use client";

import { useState } from "react";
import { useAction } from "@/components/client";
import { TRANSITIONS, transitionLabel, type StageKey } from "@/lib/pipeline";
import { EVAL_CRITERIA, RECOMMENDATIONS, type Recommendation } from "@/lib/types";
import { fmtAgo, fmtBytes, fmtDate } from "@/lib/format";
import { StageModal } from "../../StageModal";

/* ------------------------------------------------------------------ tabs */

export function ReviewTabs({ tabs }: { tabs: { key: string; label: string; count?: number; content: React.ReactNode }[] }) {
  const [on, setOn] = useState(tabs[0].key);
  return (
    <>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={on === t.key} className={on === t.key ? "on" : ""} onClick={() => setOn(t.key)}>
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} hidden={on !== t.key}>
          {t.content}
        </div>
      ))}
    </>
  );
}

/* ---------------------------------------------------------- next actions */

const BTN_COLOR: Partial<Record<StageKey, string>> = {
  under_review: "blue",
  shortlisted: "purple",
  assessment: "orange",
  interview: "pink",
  offer: "yellow",
  hired: "green",
  rejected: "red",
  on_hold: "gray",
};

export function NextActions({ appId, stage, candidateName, recommendHint, koFail }: { appId: number; stage: StageKey; candidateName: string; recommendHint: string; koFail: boolean }) {
  const [to, setTo] = useState<StageKey | null>(null);
  const options = TRANSITIONS[stage];
  if (!options.length) return <p className="small mb-0">No further actions. This application is closed.</p>;
  const primary = options.filter((o) => !["rejected", "on_hold"].includes(o));
  const secondary = options.filter((o) => ["rejected", "on_hold"].includes(o));
  return (
    <>
      {["applied", "under_review"].includes(stage) && (
        <p className="tiny mb" style={{ marginBottom: 10 }}>
          System hint:{" "}
          <b>{koFail ? "failed a knock-out question, so consider rejecting" : recommendHint === "strong" ? "strong match, so prioritise" : recommendHint === "potential" ? "potential match, so review carefully" : "weak match against requirements"}</b>
        </p>
      )}
      <div className="stack" style={{ gap: 8 }}>
        {primary.map((o) => (
          <button key={o} className={`btn block ${BTN_COLOR[o] ?? ""}`} onClick={() => setTo(o)}>
            {transitionLabel(o, stage)} →
          </button>
        ))}
        <div className="row" style={{ gap: 8 }}>
          {secondary.map((o) => (
            <button key={o} className={`btn sm grow ${o === "rejected" ? "red" : ""}`} onClick={() => setTo(o)}>
              {transitionLabel(o, stage)}
            </button>
          ))}
        </div>
      </div>
      {to && <StageModal appId={appId} from={stage} to={to} candidateName={candidateName} onClose={() => setTo(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ star */

export function StarToggle({ appId, starred }: { appId: number; starred: boolean }) {
  const { run, busy } = useAction();
  return (
    <button
      className={`btn xs ${starred ? "primary" : ""}`}
      disabled={busy}
      title={starred ? "Unstar" : "Star this candidate"}
      onClick={() => run(`/api/applications/${appId}`, "PATCH", { action: "details", starred: !starred }, starred ? "Unstarred" : "Starred")}
    >
      {starred ? "★ Starred" : "☆ Star"}
    </button>
  );
}

/* ------------------------------------------------------------ evaluation */

export function EvaluationForm({ appId, initial }: { appId: number; initial: { scores: Record<string, number>; recommendation: Recommendation; comments: string } | null }) {
  const { run, busy } = useAction();
  const [scores, setScores] = useState<Record<string, number>>(initial?.scores ?? {});
  const [rec, setRec] = useState<Recommendation | "">(initial?.recommendation ?? "");
  const [comments, setComments] = useState(initial?.comments ?? "");
  const vals = Object.values(scores).filter((v) => v > 0);
  const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  return (
    <div className="stack">
      {EVAL_CRITERIA.map((c) => (
        <div key={c.key} className="row between" style={{ borderBottom: "1px dashed #ccc", paddingBottom: 8 }}>
          <div className="grow" style={{ minWidth: 180 }}>
            <b className="small">{c.label}</b>
            <div className="tiny muted">{c.hint}</div>
          </div>
          <div className="stars" role="radiogroup" aria-label={c.label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={(scores[c.key] ?? 0) >= n ? "on" : ""} aria-pressed={(scores[c.key] ?? 0) === n} onClick={() => setScores({ ...scores, [c.key]: scores[c.key] === n ? 0 : n })}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="row between">
        <b>Average</b>
        <b className="mono">{avg} / 5</b>
      </div>
      <div className="field">
        <span className="req">Overall recommendation</span>
        <div className="row" style={{ gap: 8 }}>
          {RECOMMENDATIONS.map((r) => (
            <button key={r.key} type="button" className={`btn sm ${rec === r.key ? r.color : ""}`} style={rec === r.key ? { outline: "3px solid var(--ink)", outlineOffset: 1 } : undefined} onClick={() => setRec(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        Comments / evidence
        <textarea className="textarea" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="What did you see that supports these scores?" />
      </label>
      <button className="btn primary" style={{ alignSelf: "flex-start" }} disabled={busy || !rec || !vals.length} onClick={() => run(`/api/applications/${appId}/evaluation`, "POST", { scores, recommendation: rec, comments }, "Scorecard saved")}>
        {initial ? "Update scorecard" : "Save scorecard"}
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- notes */

export function NotesPanel({ appId, notes, meId }: { appId: number; notes: { id: number; body: string; author_name: string; author_id: number; created_at: string }[]; meId: number }) {
  const { run, busy } = useAction();
  const [body, setBody] = useState("");
  return (
    <section className="card">
      <p className="small muted">Private to recruiters. Candidates never see these.</p>
      <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note: observations, phone screen summary, concerns…" />
      <button
        className="btn primary sm mt"
        disabled={busy || !body.trim()}
        onClick={async () => {
          if (await run(`/api/applications/${appId}/notes`, "POST", { body }, "Note added")) setBody("");
        }}
      >
        Add note
      </button>
      <div className="stack mt-lg">
        {notes.length === 0 && <p className="muted small mb-0">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="item bg-soft">
            <div className="row between">
              <b className="small">{n.author_name}</b>
              <span className="row" style={{ gap: 6 }}>
                <span className="tiny muted">{fmtDate(n.created_at, true)}</span>
                {n.author_id === meId && (
                  <button className="btn xs" onClick={() => run(`/api/applications/${appId}/notes?note=${n.id}`, "DELETE", undefined, "Note deleted")}>
                    Delete
                  </button>
                )}
              </span>
            </div>
            <p className="small pre mb-0" style={{ marginTop: 4 }}>
              {n.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- info request */

export function InfoRequestPanel({ appId, requests }: { appId: number; requests: { id: number; question: string; response: string | null; created_at: string; responded_at: string | null }[] }) {
  const { run, busy } = useAction();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <section className="card">
      <div className="card-title">
        <p className="section-label mb-0">Requests to candidate</p>
        <button className="btn xs" onClick={() => setOpen(!open)}>
          {open ? "Cancel" : "+ Ask"}
        </button>
      </div>
      {open && (
        <div className="stack mb" style={{ marginBottom: 12 }}>
          <textarea className="textarea" style={{ minHeight: 70 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Please upload your final semester marksheet / confirm your notice period" />
          <button
            className="btn primary sm"
            disabled={busy || !q.trim()}
            onClick={async () => {
              if (await run(`/api/applications/${appId}/info-requests`, "POST", { question: q }, "Request sent to candidate")) {
                setQ("");
                setOpen(false);
              }
            }}
          >
            Send request
          </button>
        </div>
      )}
      {requests.length === 0 ? (
        <p className="small muted mb-0">Need something that&apos;s missing? Ask the candidate directly. They get notified.</p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {requests.map((r) => (
            <div key={r.id} className="small" style={{ borderTop: "1px dashed #ccc", paddingTop: 8 }}>
              <b>Q:</b> {r.question}
              <div className="tiny muted">{fmtAgo(r.created_at)}</div>
              {r.response ? (
                <p className="mb-0 pre" style={{ marginTop: 4 }}>
                  <b>A:</b> {r.response}
                </p>
              ) : (
                <span className="badge bg-yellow">awaiting reply</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ assessment */

export function AssessmentPanel({ appId, assessment }: { appId: number; assessment: any }) {
  const { run, busy } = useAction();
  const [a, setA] = useState({ title: "", link: "", due: "", instructions: "", score: "", result: "", ...(assessment || {}) });
  return (
    <section className="card">
      <p className="section-label">Technical assessment</p>
      {assessment?.title && (
        <p className="small mb">
          <b>{assessment.title}</b>
          {assessment.due && <> · due {fmtDate(assessment.due)}</>}
        </p>
      )}
      <div className="form-grid">
        <label className="field">
          Score
          <input className="input sm" value={a.score} onChange={(e) => setA({ ...a, score: e.target.value })} placeholder="e.g. 78 / 100" />
        </label>
        <label className="field">
          Result
          <select className="select sm" value={a.result} onChange={(e) => setA({ ...a, result: e.target.value })}>
            <option value="">Pending</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
        </label>
      </div>
      <button className="btn sm mt" disabled={busy} onClick={() => run(`/api/applications/${appId}`, "PATCH", { action: "details", assessment: a }, "Assessment result saved")}>
        Save result
      </button>
    </section>
  );
}

/* ------------------------------------------------------------- documents */

export function DocViewer({ docs }: { docs: { id: number; category: string; categoryLabel: string; filename: string; mime: string; size: number; uploaded_at: string | Date }[] }) {
  const [sel, setSel] = useState(docs[0]?.id ?? null);
  const cur = docs.find((d) => d.id === sel);
  if (!docs.length) return <div className="empty">The candidate hasn&apos;t uploaded any documents.</div>;
  return (
    <div className="stack">
      <div className="row" style={{ gap: 8 }}>
        {docs.map((d) => (
          <button key={d.id} className={`btn sm ${sel === d.id ? "dark" : ""}`} onClick={() => setSel(d.id)}>
            {d.categoryLabel}
          </button>
        ))}
      </div>
      {cur && (
        <div className="card tight">
          <div className="row between mb" style={{ marginBottom: 10 }}>
            <span className="small">
              <b>{cur.filename}</b> <span className="muted">· {fmtBytes(cur.size)} · uploaded {fmtDate(cur.uploaded_at)}</span>
            </span>
            <span className="row" style={{ gap: 6 }}>
              <a className="btn xs" href={`/api/documents/${cur.id}`} target="_blank" rel="noreferrer">
                Open in new tab ↗
              </a>
              <a className="btn xs" href={`/api/documents/${cur.id}?download=1`}>
                Download
              </a>
            </span>
          </div>
          {cur.mime === "application/pdf" ? (
            <iframe className="doc-frame" src={`/api/documents/${cur.id}#view=FitH`} title={cur.filename} />
          ) : cur.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/documents/${cur.id}`} alt={cur.filename} style={{ border: "2px solid var(--ink)", borderRadius: 6 }} />
          ) : (
            <div className="empty">Preview isn&apos;t available for this file type. Download it to view.</div>
          )}
        </div>
      )}
    </div>
  );
}
