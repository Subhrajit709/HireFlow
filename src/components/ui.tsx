// Presentational, server-safe components (no hooks).
import Link from "next/link";
import { MAIN_TRACK, STAGES, stage as getStage, type StageKey } from "@/lib/pipeline";
import type { Flag, FitResult } from "@/lib/scoring";
import { initials } from "@/lib/format";

export function StageBadge({ stage }: { stage: string }) {
  const s = getStage(stage);
  return <span className={`badge bg-${s.color}`}>{s.label}</span>;
}

export function CandidateStageBadge({ stage }: { stage: string }) {
  const s = getStage(stage);
  return <span className={`badge bg-${s.color}`}>{s.candidateLabel}</span>;
}

export function fitColor(score: number, band?: FitResult["band"]) {
  if (band === "strong" || score >= 75) return "bg-green";
  if (band === "potential" || score >= 50) return "bg-yellow";
  return "bg-red";
}

export function FitScore({ fit, large }: { fit: Pick<FitResult, "score" | "band">; large?: boolean }) {
  return (
    <span className={`score ${large ? "lg" : ""} ${fitColor(fit.score, fit.band)}`} title="Fit score (0-100), calculated from the job's requirements">
      {fit.score}
    </span>
  );
}

export function Rating({ value }: { value: number | null }) {
  if (value === null) return <span className="muted small">—</span>;
  return (
    <span className="mono" title="Average recruiter scorecard (out of 5)">
      <b>{value.toFixed(1)}</b>
      <span className="muted">/5</span>
    </span>
  );
}

export function Avatar({ name, large, color }: { name: string; large?: boolean; color?: string }) {
  return (
    <span className={`avatar ${large ? "lg" : ""}`} style={color ? { background: `var(--${color})` } : undefined}>
      {initials(name)}
    </span>
  );
}

export function Flags({ flags, limit }: { flags: Flag[]; limit?: number }) {
  const list = limit ? flags.slice(0, limit) : flags;
  if (!list.length) return <p className="muted small mb-0">No flags raised.</p>;
  return (
    <div className="flags">
      {list.map((f, i) => (
        <div key={i} className={`flag ${f.level}`}>
          <i />
          <span>{f.text}</span>
        </div>
      ))}
      {limit && flags.length > limit && <span className="muted tiny">+{flags.length - limit} more</span>}
    </div>
  );
}

export function FlagDots({ flags }: { flags: Flag[] }) {
  const red = flags.filter((f) => f.level === "red").length;
  const amber = flags.filter((f) => f.level === "amber").length;
  const green = flags.filter((f) => f.level === "green").length;
  const tip = flags.map((f) => `${f.level.toUpperCase()}: ${f.text}`).join("\n");
  return (
    <span className="row" style={{ gap: 4 }} title={tip}>
      {red > 0 && <span className="badge bg-red">{red} red</span>}
      {amber > 0 && <span className="badge bg-orange">{amber}</span>}
      {green > 0 && <span className="badge bg-green">{green}</span>}
    </span>
  );
}

export function Stepper({ stage, audience = "recruiter" }: { stage: StageKey; audience?: "recruiter" | "candidate" }) {
  const off = !MAIN_TRACK.includes(stage);
  // For off-track stages (rejected/on hold/withdrawn) we don't know where it stopped here,
  // so show the main track greyed with the terminal status appended.
  const idx = off ? -1 : MAIN_TRACK.indexOf(stage);
  return (
    <div className="stepper">
      {MAIN_TRACK.map((k, i) => {
        const cls = i < idx ? "done" : i === idx ? (k === "hired" ? "done" : "current") : "future";
        return (
          <div key={k} className={`step ${cls}`}>
            <div className="node">
              <b>{i < idx || (k === "hired" && idx === i) ? "✓" : i + 1}</b>
            </div>
            <span>{audience === "candidate" ? STAGES[k].candidateLabel.replace(" 🎉", "") : STAGES[k].label}</span>
          </div>
        );
      })}
      {off && (
        <div className="step stopped current">
          <div className="node">
            <b>!</b>
          </div>
          <span>{audience === "candidate" ? STAGES[stage].candidateLabel : STAGES[stage].label}</span>
        </div>
      )}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="empty">
      <h3 style={{ color: "var(--ink)" }}>{title}</h3>
      {children && <p className="mb-0">{children}</p>}
      {action && (
        <Link href={action.href} className="btn primary mt">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Bar({ value, color }: { value: number; color?: "yellow" | "green" }) {
  return (
    <div className={`bar ${color ?? ""}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="row between top mb" style={{ marginBottom: 24 }}>
      <div className="grow">
        <h1>{title}</h1>
        {sub && <p className="muted mb-0">{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
