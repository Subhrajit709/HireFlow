import Link from "next/link";
import { getSession } from "@/lib/auth";
import { MAIN_TRACK, STAGES } from "@/lib/pipeline";

export default async function Home() {
  const user = await getSession();
  const home = user ? (user.role === "recruiter" ? "/recruiter" : "/candidate") : null;
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">H</span>HireFlow
          </Link>
          <div className="grow" />
          {home ? (
            <Link href={home} className="btn primary">
              Go to dashboard →
            </Link>
          ) : (
            <div className="row">
              <Link href="/login" className="btn ghost">
                Log in
              </Link>
              <Link href="/register" className="btn primary">
                Create account
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <p className="caps">Recruitment management portal</p>
          <h1>
            Hire on <span className="mark">evidence</span>,
            <br /> not on gut feel.
          </h1>
          <p className="muted" style={{ maxWidth: 620, fontSize: 17 }}>
            Candidates build one complete profile and follow every application in real time. Recruiters get an explainable fit score, red
            flags, structured scorecards and a clear pipeline, so they know who gets the interview and why.
          </p>
          <div className="row mt-lg">
            <Link href="/register" className="btn primary">
              I&apos;m a candidate →
            </Link>
            <Link href="/login?as=recruiter" className="btn dark">
              I&apos;m a recruiter →
            </Link>
          </div>
        </section>

        <section className="card" style={{ marginBottom: 28 }}>
          <p className="section-label">The pipeline</p>
          <div className="row" style={{ gap: 8 }}>
            {MAIN_TRACK.map((k, i) => (
              <span key={k} className="row" style={{ gap: 8 }}>
                <span className={`badge bg-${STAGES[k].color}`}>{STAGES[k].label}</span>
                {i < MAIN_TRACK.length - 1 && <span className="mono">→</span>}
              </span>
            ))}
            <span className="muted small">+ On hold / Rejected / Withdrawn at any point</span>
          </div>
        </section>

        <section className="grid three" style={{ marginBottom: 28 }}>
          {[
            ["bg-yellow", "For candidates", "A guided profile with education, experience, skills, projects, links and documents. Answer screening questions, track status and reply to recruiter requests."],
            ["bg-blue", "For recruiters", "Search and filter every applicant. Open a one-page review with a fit score breakdown, red flags, documents, screening answers, notes, a scorecard and full history."],
            ["bg-pink", "Built for decisions", "Knock-out questions, skill matching against the job, compare candidates side by side, and a board showing who is ready for a test or an interview."],
          ].map(([c, t, d]) => (
            <div key={t} className="card">
              <span className={`badge ${c}`}>{t}</span>
              <p className="mt mb-0">{d}</p>
            </div>
          ))}
        </section>

        <section className="card bg-soft" style={{ marginBottom: 60 }}>
          <h3>Try the demo</h3>
          <p className="muted small">Sample jobs and candidates spread across every stage are loaded automatically.</p>
          <div className="grid two">
            <div className="item">
              <p className="caps mb-0">Recruiter</p>
              <p className="mono mb-0">recruiter@demo.com · Recruiter@123</p>
            </div>
            <div className="item">
              <p className="caps mb-0">Candidate</p>
              <p className="mono mb-0">candidate@demo.com · Candidate@123</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
