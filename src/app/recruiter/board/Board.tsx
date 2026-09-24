"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/client";
import { FitScore } from "@/components/ui";
import { STAGES, TRANSITIONS, type StageKey } from "@/lib/pipeline";
import { daysSince } from "@/lib/format";
import type { AppSummary } from "@/lib/data";
import { StageModal } from "../StageModal";

const OPEN_COLS: StageKey[] = ["applied", "under_review", "shortlisted", "assessment", "interview", "offer", "hired"];
const CLOSED_COLS: StageKey[] = ["on_hold", "rejected", "withdrawn"];

export function Board({ apps, showClosed }: { apps: AppSummary[]; showClosed: boolean }) {
  const toast = useToast();
  const [drag, setDrag] = useState<AppSummary | null>(null);
  const [over, setOver] = useState<StageKey | null>(null);
  const [pending, setPending] = useState<{ app: AppSummary; to: StageKey } | null>(null);
  const cols = showClosed ? [...OPEN_COLS, ...CLOSED_COLS] : OPEN_COLS;

  function drop(to: StageKey) {
    setOver(null);
    if (!drag || drag.stage === to) return;
    if (!TRANSITIONS[drag.stage].includes(to)) {
      toast(`Can't move from ${STAGES[drag.stage].label} to ${STAGES[to].label}`, "error");
      return;
    }
    setPending({ app: drag, to });
    setDrag(null);
  }

  return (
    <>
      <div className="board">
        {cols.map((k) => {
          const list = apps.filter((a) => a.stage === k).sort((a, b) => b.fit.score - a.fit.score);
          const allowed = drag ? TRANSITIONS[drag.stage].includes(k) : false;
          return (
            <div
              key={k}
              className={`column ${over === k && allowed ? "drop" : ""}`}
              style={drag && !allowed && drag.stage !== k ? { opacity: 0.45 } : undefined}
              onDragOver={(e) => {
                if (allowed) {
                  e.preventDefault();
                  setOver(k);
                }
              }}
              onDragLeave={() => setOver(null)}
              onDrop={() => drop(k)}
            >
              <div className={`column-head bg-${STAGES[k].color}`}>
                <span>{STAGES[k].label}</span>
                <span className="mono">{list.length}</span>
              </div>
              <div className="column-body">
                {list.length === 0 && <p className="tiny muted center">—</p>}
                {list.map((a) => (
                  <div key={a.id} className="kcard" draggable onDragStart={() => setDrag(a)} onDragEnd={() => setDrag(null)}>
                    <Link href={`/recruiter/applications/${a.id}`}>
                      <div className="row between" style={{ flexWrap: "nowrap" }}>
                        <b className="small truncate">
                          {a.starred ? "★ " : ""}
                          {a.candidate_name}
                        </b>
                        <FitScore fit={a.fit} />
                      </div>
                      <div className="tiny muted truncate">{a.job_title}</div>
                      <div className="row tiny" style={{ gap: 6, marginTop: 6 }}>
                        <span className="mono">{a.experienceYears}y</span>
                        {a.rating !== null && <span className="mono">★{a.rating}</span>}
                        {a.fit.knockoutsFailed.length > 0 && <span className="badge bg-red">KO</span>}
                        {a.pendingInfo > 0 && <span className="badge bg-yellow">info</span>}
                        <span className="muted">{daysSince(a.updated_at)}d in stage</span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {pending && <StageModal appId={pending.app.id} from={pending.app.stage} to={pending.to} candidateName={pending.app.candidate_name} onClose={() => setPending(null)} />}
    </>
  );
}
