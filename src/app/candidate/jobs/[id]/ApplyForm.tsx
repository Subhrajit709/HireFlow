"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, useToast } from "@/components/client";
import { ScreeningFields, missingRequired } from "@/components/ScreeningForm";
import type { ScreeningQuestion } from "@/lib/types";

export function ApplyForm({ jobId, questions, canApply, missing }: { jobId: number; questions: ScreeningQuestion[]; canApply: boolean; missing: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cover, setCover] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const unanswered = missingRequired(questions, answers);

  if (!canApply) {
    return (
      <div className="alert yellow">
        <b>Complete these required profile items first:</b>
        <ul style={{ margin: "8px 0 12px", paddingLeft: 18 }}>
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <Link href="/candidate/profile" className="btn dark sm">
          Go to profile
        </Link>
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    try {
      const r = await api<{ id: number }>("/api/applications", "POST", { jobId, answers, coverNote: cover });
      toast("Application submitted!");
      router.push(`/candidate/applications/${r.id}`);
      router.refresh();
    } catch (e: any) {
      toast(e.message, "error");
      setBusy(false);
    }
  }

  return (
    <div className="stack lg">
      <ScreeningFields questions={questions} answers={answers} onChange={setAnswers} />
      <label className="field">
        Cover note (optional)
        <textarea className="textarea" maxLength={2000} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Anything you'd like the recruiter to know?" />
      </label>
      <label className="check small">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        I confirm the information in my profile is accurate.
      </label>
      {unanswered.length > 0 && <p className="small muted mb-0">{unanswered.length} required question(s) left to answer.</p>}
      <button className="btn primary" style={{ alignSelf: "flex-start" }} disabled={busy || !confirm || unanswered.length > 0} onClick={submit}>
        {busy ? "Submitting…" : "Submit application"}
      </button>
    </div>
  );
}
