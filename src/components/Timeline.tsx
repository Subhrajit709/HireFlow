import { STAGES, stage as getStage, type StageKey } from "@/lib/pipeline";
import { fmtDate } from "@/lib/format";

export interface TimelineEvent {
  id: number;
  kind: string;
  from_stage: string | null;
  to_stage: string | null;
  message: string;
  created_at: Date | string;
  actor_name?: string | null;
  actor_role?: string | null;
  visible_to_candidate?: boolean;
}

function title(e: TimelineEvent, audience: "candidate" | "recruiter") {
  switch (e.kind) {
    case "submitted":
      return "Application submitted";
    case "stage": {
      const to = getStage(e.to_stage || "applied");
      if (audience === "candidate") return to.candidateLabel;
      return `${e.from_stage ? STAGES[e.from_stage as StageKey]?.label ?? e.from_stage : "—"} → ${to.label}`;
    }
    case "info_request":
      return "Information requested";
    case "info_response":
      return "Information provided";
    case "answers_updated":
      return "Screening answers updated";
    case "evaluation":
      return "Scorecard updated";
    case "assessment":
      return "Assessment result";
    case "interview":
      return "Interview details updated";
    default:
      return e.kind;
  }
}

export function Timeline({ events, audience }: { events: TimelineEvent[]; audience: "candidate" | "recruiter" }) {
  if (!events.length) return <p className="muted small mb-0">No history yet.</p>;
  return (
    <ul className="timeline">
      {events.map((e) => {
        const color = e.kind === "stage" || e.kind === "submitted" ? `var(--${getStage(e.to_stage || "applied").color})` : "#fff";
        const showMsg = e.message && !(e.kind === "submitted" || (e.kind === "info_request" && audience === "candidate"));
        return (
          <li key={e.id} style={{ ["--c" as any]: color }}>
            <div className="row" style={{ gap: 8 }}>
              <b className="small">{title(e, audience)}</b>
              {audience === "recruiter" && e.visible_to_candidate === false && <span className="badge tiny">internal</span>}
            </div>
            <div className="tiny muted">
              {fmtDate(e.created_at, true)}
              {audience === "recruiter" && e.actor_name ? ` · ${e.actor_name}` : ""}
            </div>
            {showMsg && (
              <p className="small mb-0 pre" style={{ marginTop: 4 }}>
                {e.kind === "stage" ? `“${e.message}”` : e.message}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
