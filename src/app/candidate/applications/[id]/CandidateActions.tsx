"use client";

import { useState } from "react";
import { Modal, useAction } from "@/components/client";
import { ScreeningFields, missingRequired } from "@/components/ScreeningForm";
import type { ScreeningQuestion } from "@/lib/types";
import { fmtDate } from "@/lib/format";

export function AnswersEditor({ appId, questions, initial, editable }: { appId: number; questions: ScreeningQuestion[]; initial: Record<string, string>; editable: boolean }) {
  const { run, busy } = useAction();
  const [answers, setAnswers] = useState(initial);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="stack">
        {questions.map((q, i) => (
          <div key={q.id}>
            <p className="small mb-0" style={{ fontWeight: 700 }}>
              {i + 1}. {q.text}
            </p>
            <p className="small mb-0 pre">{initial[q.id] || <span className="muted">No answer</span>}</p>
          </div>
        ))}
        {editable && (
          <button className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => setEditing(true)}>
            Edit answers
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="stack">
      <ScreeningFields questions={questions} answers={answers} onChange={setAnswers} />
      <div className="row">
        <button
          className="btn primary sm"
          disabled={busy || missingRequired(questions, answers).length > 0}
          onClick={async () => {
            if (await run(`/api/applications/${appId}`, "PATCH", { action: "answers", answers }, "Answers updated")) setEditing(false);
          }}
        >
          Save answers
        </button>
        <button className="btn ghost sm" onClick={() => { setAnswers(initial); setEditing(false); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function InfoRequestReply({ id, question, askedAt }: { id: number; question: string; askedAt: string | Date }) {
  const { run, busy } = useAction();
  const [text, setText] = useState("");
  return (
    <div className="item bg-soft">
      <p className="mb-0">
        <b>{question}</b>
      </p>
      <p className="tiny muted">Asked {fmtDate(askedAt, true)}</p>
      <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your response…" maxLength={3000} />
      <button className="btn primary sm mt" disabled={busy || !text.trim()} onClick={() => run(`/api/info-requests/${id}`, "POST", { response: text }, "Response sent")}>
        Send response
      </button>
    </div>
  );
}

export function WithdrawButton({ appId }: { appId: number }) {
  const { run, busy } = useAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <>
      <button className="btn red block" onClick={() => setOpen(true)}>
        Withdraw application
      </button>
      {open && (
        <Modal title="Withdraw application?" onClose={() => setOpen(false)}>
          <p className="small">This can&apos;t be undone. The recruiter will be notified.</p>
          <label className="field">
            Reason (optional)
            <textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="row mt">
            <button
              className="btn red"
              disabled={busy}
              onClick={async () => {
                if (await run(`/api/applications/${appId}`, "PATCH", { action: "withdraw", reason }, "Application withdrawn")) setOpen(false);
              }}
            >
              Yes, withdraw
            </button>
            <button className="btn ghost" onClick={() => setOpen(false)}>
              Keep it
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
