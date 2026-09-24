"use client";

import type { ScreeningQuestion } from "@/lib/types";

/** Renders screening questions as inputs. Controlled by the parent. */
export function ScreeningFields({
  questions,
  answers,
  onChange,
  disabled,
}: {
  questions: ScreeningQuestion[];
  answers: Record<string, string>;
  onChange: (a: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const set = (id: string, v: string) => onChange({ ...answers, [id]: v });
  if (!questions.length) return <p className="muted small">This job has no screening questions.</p>;
  return (
    <div className="stack">
      {questions.map((q, i) => (
        <div key={q.id} className="field">
          <span className={q.required ? "req" : ""}>
            {i + 1}. {q.text}
          </span>
          {q.type === "yesno" && (
            <div className="segmented" style={{ alignSelf: "flex-start" }}>
              {["Yes", "No"].map((o) => (
                <button type="button" key={o} disabled={disabled} className={answers[q.id] === o ? "on" : ""} onClick={() => set(q.id, o)}>
                  {o}
                </button>
              ))}
            </div>
          )}
          {q.type === "number" && (
            <input className="input" style={{ maxWidth: 200 }} type="number" min={0} step={0.5} disabled={disabled} value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />
          )}
          {q.type === "choice" && (
            <select className="select" style={{ maxWidth: 320 }} disabled={disabled} value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)}>
              <option value="">Select…</option>
              {(q.options || []).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          )}
          {q.type === "text" && <textarea className="textarea" disabled={disabled} maxLength={1500} value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} />}
        </div>
      ))}
    </div>
  );
}

export function missingRequired(questions: ScreeningQuestion[], answers: Record<string, string>) {
  return questions.filter((q) => q.required && !(answers[q.id] ?? "").trim());
}
