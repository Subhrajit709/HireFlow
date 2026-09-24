"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, useToast } from "@/components/client";
import type { Job, ScreeningQuestion } from "@/lib/types";

const uid = () => "q_" + Math.random().toString(36).slice(2, 8);

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [t, setT] = useState("");
  const add = () => {
    const parts = t.split(",").map((x) => x.trim()).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setT("");
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="chips">
        {value.map((s) => (
          <span key={s} className="chip">
            {s}
            <button type="button" className="btn xs ghost" style={{ padding: "0 4px" }} onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input
          className="input sm"
          value={t}
          placeholder={placeholder}
          onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn sm" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

export function JobForm({ job }: { job?: Job }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    title: job?.title ?? "",
    department: job?.department ?? "Engineering",
    location: job?.location ?? "",
    employment_type: job?.employment_type ?? "Full-time",
    work_mode: job?.work_mode ?? "On-site",
    description: job?.description ?? "",
    required_skills: job?.required_skills ?? [],
    nice_skills: job?.nice_skills ?? [],
    min_experience: String(job?.min_experience ?? 0),
    max_ctc: job?.max_ctc === null || job?.max_ctc === undefined ? "" : String(job.max_ctc),
    openings: String(job?.openings ?? 1),
    status: job?.status ?? "open",
  });
  const [questions, setQuestions] = useState<ScreeningQuestion[]>(
    job?.questions ?? [{ id: uid(), text: "Are you willing to work from our office location?", type: "yesno", required: true, knockout: { op: "eq", value: "Yes" } }]
  );
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const setQ = (id: string, patch: Partial<ScreeningQuestion>) => setQuestions(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  async function save() {
    setBusy(true);
    try {
      const body = { ...f, questions };
      if (job) await api(`/api/jobs/${job.id}`, "PUT", body);
      else await api("/api/jobs", "POST", body);
      toast(job ? "Job updated" : "Job created");
      router.push("/recruiter/jobs");
      router.refresh();
    } catch (e: any) {
      toast(e.message, "error");
      setBusy(false);
    }
  }

  return (
    <div className="stack lg" style={{ maxWidth: 900 }}>
      <section className="card">
        <h2>Role details</h2>
        <div className="form-grid">
          <label className="field full">
            <span className="req">Job title</span>
            <input className="input" value={f.title} onChange={set("title")} />
          </label>
          <label className="field">
            Department
            <input className="input" value={f.department} onChange={set("department")} />
          </label>
          <label className="field">
            <span className="req">Location</span>
            <input className="input" value={f.location} onChange={set("location")} />
          </label>
          <label className="field">
            Employment type
            <select className="select" value={f.employment_type} onChange={set("employment_type")}>
              {["Full-time", "Internship", "Contract", "Part-time"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Work mode
            <select className="select" value={f.work_mode} onChange={set("work_mode")}>
              {["On-site", "Hybrid", "Remote"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="field full">
            <span className="req">Description</span>
            <textarea className="textarea" style={{ minHeight: 160 }} value={f.description} onChange={set("description")} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Requirements</h2>
        <p className="small muted">These are what the automatic fit score checks: required skills (45 pts), nice-to-have (10), experience (20), screening (15) and profile completeness (10).</p>
        <div className="form-grid">
          <div className="field full">
            <span className="req">Required skills</span>
            <TagInput value={f.required_skills} onChange={(v) => setF({ ...f, required_skills: v })} placeholder="e.g. React, SQL (Enter to add)" />
          </div>
          <div className="field full">
            Nice-to-have skills
            <TagInput value={f.nice_skills} onChange={(v) => setF({ ...f, nice_skills: v })} placeholder="e.g. Docker" />
          </div>
          <label className="field">
            Minimum experience (years)
            <input className="input" type="number" min={0} step={0.5} value={f.min_experience} onChange={set("min_experience")} />
          </label>
          <label className="field">
            Max budget (LPA)
            <input className="input" type="number" min={0} step={0.5} value={f.max_ctc} onChange={set("max_ctc")} />
            <span className="hint">Used to flag salary expectations. Never shown to candidates.</span>
          </label>
          <label className="field">
            Openings
            <input className="input" type="number" min={1} value={f.openings} onChange={set("openings")} />
          </label>
          <label className="field">
            Status
            <select className="select" value={f.status} onChange={set("status")}>
              <option value="open">Open (accepting applications)</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <h2>Screening questions</h2>
          <button type="button" className="btn sm" onClick={() => setQuestions([...questions, { id: uid(), text: "", type: "text", required: true, knockout: null }])}>
            + Add question
          </button>
        </div>
        <p className="small muted">Mark must-haves (location, work authorisation, minimum years with a tool) as knock-outs. Failing one flags the applicant in red and caps their fit score.</p>
        <div className="stack">
          {questions.map((q, i) => (
            <div key={q.id} className="item bg-soft">
              <div className="row between" style={{ marginBottom: 10 }}>
                <b>Question {i + 1}</b>
                <button type="button" className="btn xs red" onClick={() => setQuestions(questions.filter((x) => x.id !== q.id))}>
                  Remove
                </button>
              </div>
              <div className="form-grid">
                <label className="field full">
                  Question
                  <input className="input" value={q.text} onChange={(e) => setQ(q.id, { text: e.target.value })} />
                </label>
                <label className="field">
                  Answer type
                  <select
                    className="select"
                    value={q.type}
                    onChange={(e) => setQ(q.id, { type: e.target.value as ScreeningQuestion["type"], knockout: null, options: e.target.value === "choice" ? q.options ?? ["Option A", "Option B"] : undefined })}
                  >
                    <option value="yesno">Yes / No</option>
                    <option value="number">Number</option>
                    <option value="choice">Multiple choice</option>
                    <option value="text">Free text</option>
                  </select>
                </label>
                <label className="check" style={{ alignSelf: "end", paddingBottom: 10 }}>
                  <input type="checkbox" checked={q.required} onChange={(e) => setQ(q.id, { required: e.target.checked })} /> Required
                </label>
                {q.type === "choice" && (
                  <label className="field full">
                    Options (comma separated)
                    <input className="input" value={(q.options ?? []).join(", ")} onChange={(e) => setQ(q.id, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
                  </label>
                )}
                {q.type !== "text" && (
                  <div className="field full">
                    Knock-out rule
                    <div className="row" style={{ gap: 8 }}>
                      <label className="check small">
                        <input
                          type="checkbox"
                          checked={!!q.knockout}
                          onChange={(e) =>
                            setQ(q.id, { knockout: e.target.checked ? { op: q.type === "number" ? "gte" : "eq", value: q.type === "yesno" ? "Yes" : q.type === "choice" ? q.options?.[0] ?? "" : "1" } : null })
                          }
                        />
                        Flag applicants whose answer isn&apos;t
                      </label>
                      {q.knockout && q.type === "number" && (
                        <select className="select sm" style={{ width: 90 }} value={q.knockout.op} onChange={(e) => setQ(q.id, { knockout: { ...q.knockout!, op: e.target.value as "gte" | "lte" } })}>
                          <option value="gte">≥</option>
                          <option value="lte">≤</option>
                        </select>
                      )}
                      {q.knockout &&
                        (q.type === "yesno" ? (
                          <select className="select sm" style={{ width: 90 }} value={q.knockout.value} onChange={(e) => setQ(q.id, { knockout: { ...q.knockout!, value: e.target.value } })}>
                            <option>Yes</option>
                            <option>No</option>
                          </select>
                        ) : q.type === "choice" ? (
                          <select className="select sm" style={{ width: 180 }} value={q.knockout.value} onChange={(e) => setQ(q.id, { knockout: { ...q.knockout!, value: e.target.value } })}>
                            {(q.options ?? []).map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input className="input sm" style={{ width: 90 }} type="number" value={q.knockout.value} onChange={(e) => setQ(q.id, { knockout: { ...q.knockout!, value: e.target.value } })} />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {questions.length === 0 && <p className="muted small mb-0">No screening questions.</p>}
        </div>
      </section>

      <div className="row">
        <button className="btn primary" disabled={busy} onClick={save}>
          {busy ? "Saving…" : job ? "Save changes" : "Publish job"}
        </button>
        <button className="btn ghost" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </div>
  );
}
