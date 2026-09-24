import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getMyApplication } from "@/lib/data";
import { canEditAnswers, canWithdraw, stage as getStage, type StageKey } from "@/lib/pipeline";
import { externalUrl, fmtDate } from "@/lib/format";
import { CandidateStageBadge, PageHeader, Stepper } from "@/components/ui";
import { Timeline } from "@/components/Timeline";
import { AnswersEditor, InfoRequestReply, WithdrawButton } from "./CandidateActions";

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("candidate");
  const data = await getMyApplication(Number((await params).id), user.id);
  if (!data) notFound();
  const { app, job, events, infoRequests } = data;
  const st = app.stage as StageKey;
  const s = getStage(st);
  const pending = infoRequests.filter((r: any) => !r.response);
  const answered = infoRequests.filter((r: any) => r.response);
  const assessment = app.assessment;
  const interview = app.interview;

  return (
    <>
      <p className="small">
        <Link href="/candidate/applications">← My applications</Link>
      </p>
      <PageHeader title={job.title} sub={`${job.department} · ${job.location} · applied ${fmtDate(app.submitted_at)}`}>
        <CandidateStageBadge stage={st} />
      </PageHeader>

      <section className="card mb" style={{ marginBottom: 20 }}>
        <Stepper stage={st} audience="candidate" />
      </section>

      <div className="grid side">
        <div className="stack lg">
          <section className={`card bg-${s.color === "white" ? "soft" : s.color}`}>
            <p className="section-label">Current status</p>
            <h2>{s.candidateLabel}</h2>
            <p className="mb-0">{s.candidateText}</p>
          </section>

          {pending.length > 0 && (
            <section className="card" style={{ borderWidth: 3 }}>
              <div className="card-title">
                <h2>Action needed</h2>
                <span className="badge bg-yellow">{pending.length} pending</span>
              </div>
              <div className="stack">
                {pending.map((r: any) => (
                  <InfoRequestReply key={r.id} id={r.id} question={r.question} askedAt={r.created_at} />
                ))}
              </div>
            </section>
          )}

          {st === "assessment" && assessment && (
            <section className="card">
              <p className="section-label">Technical assessment</p>
              <h3>{assessment.title || "Technical assessment"}</h3>
              <dl className="kv">
                {assessment.due && (
                  <>
                    <dt>Due by</dt>
                    <dd>
                      <b>{fmtDate(assessment.due)}</b>
                    </dd>
                  </>
                )}
                {assessment.link && (
                  <>
                    <dt>Link</dt>
                    <dd>
                      <a href={externalUrl(assessment.link)} target="_blank" rel="noreferrer" className="btn sm primary">
                        Open assessment ↗
                      </a>
                    </dd>
                  </>
                )}
              </dl>
              {assessment.instructions && <p className="pre small mt mb-0">{assessment.instructions}</p>}
            </section>
          )}

          {["interview", "offer"].includes(st) && interview && (
            <section className="card">
              <p className="section-label">Interview</p>
              <dl className="kv">
                <dt>When</dt>
                <dd>
                  <b>{interview.when ? fmtDate(interview.when, true) : "To be confirmed"}</b>
                </dd>
                <dt>Mode</dt>
                <dd>{interview.mode || "—"}</dd>
                <dt>Where / link</dt>
                <dd>
                  {/^https?:/.test(interview.location || "") ? (
                    <a href={interview.location} target="_blank" rel="noreferrer">
                      {interview.location}
                    </a>
                  ) : (
                    interview.location || "—"
                  )}
                </dd>
                <dt>Interviewers</dt>
                <dd>{interview.interviewers || "—"}</dd>
              </dl>
            </section>
          )}

          <section className="card">
            <div className="card-title">
              <h2>Screening answers</h2>
              {canEditAnswers(st) ? <span className="badge bg-green">editable</span> : <span className="badge">locked</span>}
            </div>
            <AnswersEditor appId={app.id} questions={job.questions} initial={app.answers || {}} editable={canEditAnswers(st)} />
            {app.cover_note && (
              <>
                <hr />
                <p className="section-label">Cover note</p>
                <p className="pre small mb-0">{app.cover_note}</p>
              </>
            )}
          </section>

          {answered.length > 0 && (
            <section className="card">
              <h3>Information you provided</h3>
              <div className="stack">
                {answered.map((r: any) => (
                  <div key={r.id} className="item">
                    <p className="small mb-0">
                      <b>Q:</b> {r.question}
                    </p>
                    <p className="small mb-0 pre">
                      <b>A:</b> {r.response}
                    </p>
                    <p className="tiny muted mb-0">{fmtDate(r.responded_at, true)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="stack lg">
          <section className="card">
            <h3>History</h3>
            <Timeline events={events as any} audience="candidate" />
          </section>
          <section className="card">
            <h3>Your submission</h3>
            <p className="small muted">Recruiters see your live profile, so updates you make are visible immediately.</p>
            <div className="stack">
              <Link href="/candidate/profile/preview" className="btn block">
                View submitted profile
              </Link>
              <Link href="/candidate/profile" className="btn block">
                Edit profile
              </Link>
              {canWithdraw(st) && <WithdrawButton appId={app.id} />}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
