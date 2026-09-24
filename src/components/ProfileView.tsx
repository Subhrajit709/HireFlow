// Read-only rendering of a candidate profile. Used by the recruiter review screen and
// by the candidate's "preview what recruiters see" page, so both see the same thing.
import type { DocumentMeta, Profile } from "@/lib/types";
import { SKILL_LEVELS, docCategoryLabel } from "@/lib/types";
import { expandSkills, normSkill, splitList, totalExperienceYears } from "@/lib/scoring";
import { externalUrl, fmtDate, fmtMonth } from "@/lib/format";

export function ProfileView({
  profile: p,
  docs,
  requiredSkills = [],
  niceSkills = [],
  docHref,
  email,
}: {
  profile: Profile;
  docs?: DocumentMeta[];
  requiredSkills?: string[];
  niceSkills?: string[];
  docHref?: (d: DocumentMeta) => string;
  email?: string;
}) {
  const req = new Set(requiredSkills.map(normSkill));
  const nice = new Set(niceSkills.map(normSkill));
  const skillClass = (name: string) => {
    const implied = expandSkills([name]);
    if ([...implied].some((s) => req.has(s))) return "chip match";
    if ([...implied].some((s) => nice.has(s))) return "chip nice";
    return "chip";
  };
  const years = totalExperienceYears(p);
  const tech = p.skills.filter((s) => s.category !== "professional");
  const prof = p.skills.filter((s) => s.category === "professional");
  const links = [
    ["LinkedIn", p.links.linkedin],
    ["GitHub", p.links.github],
    ["Portfolio", p.links.portfolio],
    ["Other", p.links.other],
  ].filter(([, v]) => v);

  return (
    <div className="stack lg">
      <section className="card">
        <p className="section-label">Contact & basics</p>
        <dl className="kv">
          <dt>Name</dt>
          <dd>{p.personal.fullName || "—"}</dd>
          {email && (
            <>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${email}`}>{email}</a>
              </dd>
            </>
          )}
          <dt>Phone</dt>
          <dd>{p.personal.phone || "—"}</dd>
          <dt>Location</dt>
          <dd>{[p.personal.city, p.personal.state, p.personal.country].filter(Boolean).join(", ") || "—"}</dd>
          <dt>Date of birth</dt>
          <dd>{p.personal.dob ? fmtDate(p.personal.dob) : "—"}</dd>
          <dt>Experience</dt>
          <dd>{p.additional.isFresher && !p.experience.length ? "Fresher" : `${years} years (calculated from work history)`}</dd>
        </dl>
        {p.personal.summary && (
          <>
            <hr style={{ margin: "16px 0" }} />
            <p className="section-label">Summary</p>
            <p className="pre mb-0">{p.personal.summary}</p>
          </>
        )}
      </section>

      <section className="card">
        <p className="section-label">Availability & compensation</p>
        <dl className="kv">
          <dt>Notice period</dt>
          <dd>{p.additional.noticePeriodDays === "" ? "—" : `${p.additional.noticePeriodDays} days`}</dd>
          <dt>Current CTC</dt>
          <dd>{p.additional.currentCtc ? `${p.additional.currentCtc} LPA` : "—"}</dd>
          <dt>Expected CTC</dt>
          <dd>{p.additional.expectedCtc ? `${p.additional.expectedCtc} LPA` : "—"}</dd>
          <dt>Available from</dt>
          <dd>{p.additional.availableFrom ? fmtDate(p.additional.availableFrom) : "—"}</dd>
          <dt>Relocation</dt>
          <dd>{p.additional.willingToRelocate ? (p.additional.willingToRelocate === "yes" ? "Willing to relocate" : "Not willing") : "—"}</dd>
          <dt>Preferred locations</dt>
          <dd>{p.additional.preferredLocations || "—"}</dd>
          <dt>Languages</dt>
          <dd>{p.additional.languages || "—"}</dd>
          <dt>Heard about us</dt>
          <dd>{p.additional.howHeard || "—"}</dd>
        </dl>
      </section>

      <section className="card">
        <p className="section-label">Skills</p>
        {requiredSkills.length > 0 && (
          <p className="tiny muted">
            <span className="chip match">green</span> = required for this job · <span className="chip nice">blue</span> = nice-to-have
          </p>
        )}
        {p.skills.length === 0 ? (
          <p className="muted mb-0">No skills added.</p>
        ) : (
          <div className="stack">
            {[
              ["Technical", tech],
              ["Professional", prof],
            ].map(([label, list]) =>
              (list as Profile["skills"]).length ? (
                <div key={label as string}>
                  <p className="small mb-0" style={{ fontWeight: 700, marginBottom: 6 }}>
                    {label as string}
                  </p>
                  <div className="chips">
                    {(list as Profile["skills"]).map((s) => (
                      <span key={s.id} className={skillClass(s.name)} title={`${SKILL_LEVELS[s.level] || ""} · ${s.years || 0} yrs`}>
                        {s.name}
                        <span className="mono tiny" style={{ opacity: 0.7 }}>
                          {SKILL_LEVELS[s.level]?.[0] ?? ""}
                          {s.years ? ` ${s.years}y` : ""}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </section>

      <section className="card">
        <p className="section-label">Work experience</p>
        {p.experience.length === 0 ? (
          <p className="muted mb-0">{p.additional.isFresher ? "Fresher: no work experience yet." : "No experience added."}</p>
        ) : (
          <ul className="timeline">
            {[...p.experience]
              .sort((a, b) => (b.start || "").localeCompare(a.start || ""))
              .map((e) => (
                <li key={e.id} style={{ ["--c" as any]: e.current ? "var(--green)" : "#fff" }}>
                  <b>{e.title}</b> · {e.company}{" "}
                  <span className="badge" style={{ marginLeft: 4 }}>
                    {e.type}
                  </span>
                  <div className="small muted">
                    {fmtMonth(e.start)} – {e.current ? "Present" : fmtMonth(e.end)}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                  {e.description && <p className="small pre mb-0 mt" style={{ marginTop: 6 }}>{e.description}</p>}
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="card">
        <p className="section-label">Education</p>
        {p.education.length === 0 ? (
          <p className="muted mb-0">No education added.</p>
        ) : (
          <div className="table-wrap" style={{ boxShadow: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Qualification</th>
                  <th>Institution</th>
                  <th>Year</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {p.education.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <b>{e.level}</b>
                    </td>
                    <td>{[e.degree, e.field].filter(Boolean).join(" · ") || "—"}</td>
                    <td>
                      {e.institution}
                      {e.board && <div className="tiny muted">{e.board}</div>}
                    </td>
                    <td className="mono">{[e.startYear, e.endYear].filter(Boolean).join("–") || "—"}</td>
                    <td className="mono">{e.score ? `${e.score}${e.scoreType === "%" ? "%" : ` ${e.scoreType}`}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <p className="section-label">Projects</p>
        {p.projects.length === 0 ? (
          <p className="muted mb-0">No projects added.</p>
        ) : (
          <div className="stack">
            {p.projects.map((pr) => (
              <div key={pr.id} className="item">
                <div className="row between">
                  <b>{pr.title}</b>
                  <div className="row" style={{ gap: 6 }}>
                    {pr.link && (
                      <a className="btn xs" href={externalUrl(pr.link)} target="_blank" rel="noreferrer">
                        Live ↗
                      </a>
                    )}
                    {pr.repo && (
                      <a className="btn xs" href={externalUrl(pr.repo)} target="_blank" rel="noreferrer">
                        Code ↗
                      </a>
                    )}
                  </div>
                </div>
                {pr.role && <div className="small muted">{pr.role}</div>}
                {pr.description && <p className="small pre mt" style={{ marginTop: 6 }}>{pr.description}</p>}
                <div className="chips">
                  {splitList(pr.tech).map((t) => (
                    <span key={t} className={skillClass(t)}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {(p.certifications.length > 0 || links.length > 0) && (
        <div className="grid two">
          <section className="card">
            <p className="section-label">Links</p>
            {links.length === 0 ? (
              <p className="muted mb-0">No links.</p>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                {links.map(([k, v]) => (
                  <a key={k} href={externalUrl(v!)} target="_blank" rel="noreferrer" className="small truncate">
                    <b>{k}:</b> {v}
                  </a>
                ))}
              </div>
            )}
          </section>
          <section className="card">
            <p className="section-label">Certifications</p>
            {p.certifications.length === 0 ? (
              <p className="muted mb-0">None listed.</p>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                {p.certifications.map((c) => (
                  <div key={c.id} className="small">
                    <b>{c.name}</b> · {c.issuer} {c.year && <span className="mono">({c.year})</span>}
                    {c.url && (
                      <>
                        {" "}
                        <a href={externalUrl(c.url)} target="_blank" rel="noreferrer">
                          verify ↗
                        </a>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {docs && (
        <section className="card">
          <p className="section-label">Documents</p>
          {docs.length === 0 ? (
            <p className="muted mb-0">No documents uploaded.</p>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              {docs.map((d) => (
                <div key={d.id} className="row between small">
                  <span>
                    <b>{docCategoryLabel(d.category)}</b> · {d.label || d.filename}
                  </span>
                  {docHref && (
                    <a href={docHref(d)} target="_blank" rel="noreferrer" className="btn xs">
                      Open ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
