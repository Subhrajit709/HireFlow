"use client";

import { useState } from "react";
import { Modal, useAction } from "@/components/client";
import { STAGES, transitionLabel, type StageKey } from "@/lib/pipeline";

const TEMPLATES: Partial<Record<StageKey, string>> = {
  under_review: "",
  shortlisted: "Great news! We'd like to move forward with your application. Next steps will follow shortly.",
  assessment: "As the next step, please complete the technical assessment linked below before the deadline.",
  interview: "We'd love to meet you! Your interview details are below. Reply to the information request if the time doesn't work.",
  offer: "Congratulations! We're preparing an offer for you. Our team will contact you with details.",
  hired: "Welcome aboard! We're excited to have you join the team.",
  rejected: "Thank you for the time you invested in applying. After careful review, we've decided not to move forward with your application at this time. We wish you the best.",
  on_hold: "Your application is on hold for now while we review other priorities. We'll update you soon.",
};

/** Confirm a stage change with a candidate-facing message plus assessment/interview details where relevant. */
export function StageModal({
  appId,
  from,
  to,
  candidateName,
  onClose,
}: {
  appId: number;
  from: StageKey;
  to: StageKey;
  candidateName: string;
  onClose: () => void;
}) {
  const { run, busy } = useAction();
  const [message, setMessage] = useState(TEMPLATES[to] ?? "");
  const [notify, setNotify] = useState(true);
  const [assessment, setAssessment] = useState({ title: "Technical assessment", link: "", due: "", instructions: "" });
  const [interview, setInterview] = useState({ when: "", mode: "Video call", location: "", interviewers: "", notes: "" });

  async function submit() {
    const ok = await run(
      `/api/applications/${appId}/stage`,
      "POST",
      { to, message, notifyCandidate: notify, assessment: to === "assessment" ? assessment : undefined, interview: to === "interview" ? interview : undefined },
      `Moved to ${STAGES[to].label}`
    );
    if (ok) onClose();
  }

  return (
    <Modal title={`${transitionLabel(to, from)}: ${candidateName}`} onClose={onClose}>
      <p className="small">
        <span className={`badge bg-${STAGES[from].color}`}>{STAGES[from].label}</span> → <span className={`badge bg-${STAGES[to].color}`}>{STAGES[to].label}</span>
      </p>

      {to === "assessment" && (
        <div className="form-grid mb" style={{ marginBottom: 14 }}>
          <label className="field full">
            Assessment title
            <input className="input" value={assessment.title} onChange={(e) => setAssessment({ ...assessment, title: e.target.value })} />
          </label>
          <label className="field">
            Link
            <input className="input" value={assessment.link} placeholder="https://…" onChange={(e) => setAssessment({ ...assessment, link: e.target.value })} />
          </label>
          <label className="field">
            Due date
            <input className="input" type="date" value={assessment.due} onChange={(e) => setAssessment({ ...assessment, due: e.target.value })} />
          </label>
          <label className="field full">
            Instructions
            <textarea className="textarea" style={{ minHeight: 70 }} value={assessment.instructions} onChange={(e) => setAssessment({ ...assessment, instructions: e.target.value })} />
          </label>
        </div>
      )}

      {to === "interview" && (
        <div className="form-grid mb" style={{ marginBottom: 14 }}>
          <label className="field">
            Date & time
            <input className="input" type="datetime-local" value={interview.when} onChange={(e) => setInterview({ ...interview, when: e.target.value })} />
          </label>
          <label className="field">
            Mode
            <select className="select" value={interview.mode} onChange={(e) => setInterview({ ...interview, mode: e.target.value })}>
              <option>Video call</option>
              <option>In person</option>
              <option>Phone</option>
            </select>
          </label>
          <label className="field full">
            Meeting link / address
            <input className="input" value={interview.location} onChange={(e) => setInterview({ ...interview, location: e.target.value })} />
          </label>
          <label className="field full">
            Interviewers
            <input className="input" value={interview.interviewers} onChange={(e) => setInterview({ ...interview, interviewers: e.target.value })} />
          </label>
          <label className="field full">
            Internal notes for interviewers
            <textarea className="textarea" style={{ minHeight: 60 }} value={interview.notes} onChange={(e) => setInterview({ ...interview, notes: e.target.value })} placeholder="Focus areas, concerns to probe…" />
          </label>
        </div>
      )}

      <label className="field">
        Message to candidate
        <textarea className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} />
        <span className="hint">Shown in the candidate&apos;s status history and notification.</span>
      </label>
      <label className="check small mt">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify the candidate
      </label>
      <div className="row mt-lg">
        <button className={`btn ${to === "rejected" ? "red" : "primary"}`} disabled={busy} onClick={submit}>
          {busy ? "Saving…" : `Confirm: ${transitionLabel(to, from)}`}
        </button>
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
