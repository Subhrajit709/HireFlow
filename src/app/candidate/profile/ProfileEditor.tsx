"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, useToast } from "@/components/client";
import { profileCompleteness } from "@/lib/scoring";
import { fmtBytes, fmtDate } from "@/lib/format";
import {
  DOC_CATEGORIES,
  SKILL_LEVELS,
  type Certification,
  type DocumentMeta,
  type Education,
  type Experience,
  type Profile,
  type Project,
  type Skill,
} from "@/lib/types";

const uid = () => Math.random().toString(36).slice(2, 10);

const SECTIONS = [
  { key: "personal", label: "Personal & contact", done: ["personal"] },
  { key: "education", label: "Education", done: ["education"] },
  { key: "experience", label: "Experience", done: ["experience"] },
  { key: "skills", label: "Skills", done: ["skills"] },
  { key: "projects", label: "Projects & certs", done: ["projects"] },
  { key: "links", label: "Links", done: ["links"] },
  { key: "documents", label: "Documents", done: ["resume", "academic"] },
  { key: "additional", label: "Availability & more", done: ["additional"] },
] as const;

const SKILL_SUGGESTIONS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "HTML", "CSS", "Tailwind", "Java", "Spring Boot", "Python",
  "Django", "Flask", "Pandas", "SQL", "PostgreSQL", "MySQL", "MongoDB", "Git", "Docker", "Kubernetes", "AWS", "Azure", "REST",
  "GraphQL", "Kafka", "Microservices", "C++", "C#", "Go", "Machine Learning", "Data Analysis", "Communication", "Teaching",
  "Leadership", "Problem Solving", "Team Work", "Figma", "Testing", "Linux",
];

export function ProfileEditor({ initial, docs }: { initial: Profile; docs: DocumentMeta[] }) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState<Profile>(initial);
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("personal");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const comp = useMemo(() => profileCompleteness(p, docs), [p, docs]);
  const doneKeys = new Set(comp.sections.filter((s) => s.done).map((s) => s.key));

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setP((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function save(goNext = false) {
    setSaving(true);
    try {
      await api("/api/profile", "PUT", p);
      setDirty(false);
      toast("Profile saved");
      router.refresh();
      if (goNext) {
        const i = SECTIONS.findIndex((s) => s.key === section);
        if (i < SECTIONS.length - 1) setSection(SECTIONS[i + 1].key);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const idx = SECTIONS.findIndex((s) => s.key === section);

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr)", gap: 20 }}>
      <div className="card tight row between">
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="row between small">
            <b>Profile {comp.percent}% complete</b>
            <span className="muted">{comp.missingRequired.length ? `${comp.missingRequired.length} required item(s) left` : "Ready to apply ✓"}</span>
          </div>
          <div className="bar green" style={{ marginTop: 6 }}>
            <span style={{ width: `${comp.percent}%` }} />
          </div>
        </div>
        <div className="row">
          <Link href="/candidate/profile/preview" className="btn sm">
            Preview as recruiter
          </Link>
          <button className="btn primary sm" onClick={() => save(false)} disabled={saving || !dirty}>
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "220px minmax(0,1fr)", gap: 20, alignItems: "start" }} data-profile-grid>
        <nav className="side-nav card tight sticky-top">
          {SECTIONS.map((s) => {
            const ok = s.done.every((d) => doneKeys.has(d));
            return (
              <button key={s.key} className={section === s.key ? "on" : ""} onClick={() => setSection(s.key)}>
                {s.label}
                <span className={`tick ${ok ? "ok" : ""}`}>{ok ? "✓" : ""}</span>
              </button>
            );
          })}
        </nav>

        <div className="card">
          {section === "personal" && <PersonalSection p={p} update={update} />}
          {section === "education" && <EducationSection list={p.education} onChange={(v) => update("education", v)} />}
          {section === "experience" && (
            <ExperienceSection
              list={p.experience}
              fresher={p.additional.isFresher}
              onFresher={(v) => update("additional", { ...p.additional, isFresher: v })}
              onChange={(v) => update("experience", v)}
            />
          )}
          {section === "skills" && <SkillsSection list={p.skills} onChange={(v) => update("skills", v)} />}
          {section === "projects" && (
            <>
              <ProjectsSection list={p.projects} onChange={(v) => update("projects", v)} />
              <hr />
              <CertSection list={p.certifications} onChange={(v) => update("certifications", v)} />
            </>
          )}
          {section === "links" && <LinksSection p={p} update={update} />}
          {section === "documents" && <DocumentsSection docs={docs} />}
          {section === "additional" && <AdditionalSection p={p} update={update} />}

          {section !== "documents" && (
            <div className="row between mt-lg">
              <button className="btn ghost" disabled={idx === 0} onClick={() => setSection(SECTIONS[idx - 1].key)}>
                ← Back
              </button>
              <button className="btn primary" onClick={() => save(true)} disabled={saving}>
                {saving ? "Saving…" : idx === SECTIONS.length - 1 ? "Save" : "Save & continue →"}
              </button>
            </div>
          )}
          {section === "documents" && (
            <div className="row between mt-lg">
              <button className="btn ghost" onClick={() => setSection(SECTIONS[idx - 1].key)}>
                ← Back
              </button>
              <button className="btn primary" onClick={() => setSection(SECTIONS[idx + 1].key)}>
                Continue →
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 900px){ [data-profile-grid]{ grid-template-columns: 1fr !important; } .side-nav.sticky-top{ position: static; } }`}</style>
    </div>
  );
}

/* ------------------------------------------------------------ sections */

type Upd = <K extends keyof Profile>(key: K, value: Profile[K]) => void;

function F({ label, req, hint, full, children }: { label: string; req?: boolean; hint?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`field ${full ? "full" : ""}`}>
      <span className={req ? "req" : ""}>{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb" style={{ marginBottom: 20 }}>
      <h2>{title}</h2>
      <p className="muted small mb-0">{sub}</p>
    </div>
  );
}

function PersonalSection({ p, update }: { p: Profile; update: Upd }) {
  const set = (k: keyof Profile["personal"]) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    update("personal", { ...p.personal, [k]: e.target.value });
  const v = p.personal;
  return (
    <>
      <SectionHead title="Personal & contact" sub="Recruiters use this to recognise you and get in touch. Your email comes from your account." />
      <div className="form-grid">
        <F label="Full name" req>
          <input className="input" value={v.fullName} onChange={set("fullName")} />
        </F>
        <F label="Phone" req>
          <input className="input" value={v.phone} onChange={set("phone")} placeholder="+91 …" inputMode="tel" />
        </F>
        <F label="Professional headline" req full hint="One line, e.g. “Full Stack Developer · React, Node.js”">
          <input className="input" value={v.headline} onChange={set("headline")} maxLength={120} />
        </F>
        <F label="City" req>
          <input className="input" value={v.city} onChange={set("city")} />
        </F>
        <F label="State">
          <input className="input" value={v.state} onChange={set("state")} />
        </F>
        <F label="Country">
          <input className="input" value={v.country} onChange={set("country")} />
        </F>
        <F label="Date of birth">
          <input className="input" type="date" value={v.dob} onChange={set("dob")} />
        </F>
        <F label="Gender" hint="Optional, never used for scoring.">
          <select className="select" value={v.gender} onChange={set("gender")}>
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
          </select>
        </F>
        <F label="Professional summary" full hint="3–5 lines about what you do best and what you're looking for. Aim for at least 40 characters.">
          <textarea className="textarea" value={v.summary} onChange={set("summary")} maxLength={1500} />
        </F>
      </div>
    </>
  );
}

function ListShell<T extends { id: string }>({
  items,
  onChange,
  blank,
  addLabel,
  render,
  title,
}: {
  items: T[];
  onChange: (v: T[]) => void;
  blank: () => T;
  addLabel: string;
  title: (t: T, i: number) => string;
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="stack">
      {items.map((it, i) => (
        <div key={it.id} className="item bg-soft">
          <div className="row between" style={{ marginBottom: 12 }}>
            <b>{title(it, i)}</b>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn xs" disabled={i === 0} onClick={() => { const c = [...items]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; onChange(c); }} aria-label="Move up">
                ↑
              </button>
              <button type="button" className="btn xs red" onClick={() => onChange(items.filter((x) => x.id !== it.id))}>
                Remove
              </button>
            </div>
          </div>
          {render(it, (patch) => onChange(items.map((x) => (x.id === it.id ? { ...x, ...patch } : x))))}
        </div>
      ))}
      <button type="button" className="btn" onClick={() => onChange([...items, blank()])} style={{ alignSelf: "flex-start" }}>
        + {addLabel}
      </button>
    </div>
  );
}

const EDU_LEVELS = ["10th", "12th", "Diploma", "Bachelor's", "Master's", "PhD", "Other"];

function EducationSection({ list, onChange }: { list: Education[]; onChange: (v: Education[]) => void }) {
  return (
    <>
      <SectionHead title="Education" sub="Add your 10th, 12th and every degree. Recruiters check scores and the relevance of your field." />
      <ListShell
        items={list}
        onChange={onChange}
        addLabel="Add education"
        title={(e, i) => (e.level ? `${e.level}${e.degree ? ` · ${e.degree}` : ""}` : `Education #${i + 1}`)}
        blank={() => ({ id: uid(), level: list.length === 0 ? "10th" : list.length === 1 ? "12th" : "Bachelor's", institution: "", board: "", degree: "", field: "", startYear: "", endYear: "", score: "", scoreType: "%" })}
        render={(e, set) => {
          const school = e.level === "10th" || e.level === "12th";
          return (
            <div className="form-grid">
              <F label="Level" req>
                <select className="select" value={e.level} onChange={(x) => set({ level: x.target.value })}>
                  {EDU_LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </F>
              <F label={school ? "School" : "College / Institution"} req>
                <input className="input" value={e.institution} onChange={(x) => set({ institution: x.target.value })} />
              </F>
              <F label={school ? "Board (CBSE, ICSE, State…)" : "University"}>
                <input className="input" value={e.board} onChange={(x) => set({ board: x.target.value })} />
              </F>
              {!school && (
                <F label="Degree" hint="e.g. B.Tech, BCA, M.Sc">
                  <input className="input" value={e.degree} onChange={(x) => set({ degree: x.target.value })} />
                </F>
              )}
              <F label={school ? "Stream" : "Specialisation"}>
                <input className="input" value={e.field} onChange={(x) => set({ field: x.target.value })} />
              </F>
              <F label="Start year">
                <input className="input" inputMode="numeric" maxLength={4} value={e.startYear} onChange={(x) => set({ startYear: x.target.value.replace(/\D/g, "") })} />
              </F>
              <F label="Passing year" req hint="Expected year if still studying">
                <input className="input" inputMode="numeric" maxLength={4} value={e.endYear} onChange={(x) => set({ endYear: x.target.value.replace(/\D/g, "") })} />
              </F>
              <F label="Score">
                <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <input className="input" value={e.score} onChange={(x) => set({ score: x.target.value })} />
                  <select className="select" style={{ width: 100 }} value={e.scoreType} onChange={(x) => set({ scoreType: x.target.value })}>
                    <option>%</option>
                    <option>CGPA</option>
                  </select>
                </div>
              </F>
            </div>
          );
        }}
      />
    </>
  );
}

function ExperienceSection({
  list,
  onChange,
  fresher,
  onFresher,
}: {
  list: Experience[];
  onChange: (v: Experience[]) => void;
  fresher: boolean;
  onFresher: (v: boolean) => void;
}) {
  return (
    <>
      <SectionHead title="Work experience" sub="Include internships. Total experience is calculated from these dates, so keep them accurate." />
      <label className="check mb" style={{ marginBottom: 16 }}>
        <input type="checkbox" checked={fresher} onChange={(e) => onFresher(e.target.checked)} /> I&apos;m a fresher (no full-time experience yet)
      </label>
      <ListShell
        items={list}
        onChange={onChange}
        addLabel={fresher ? "Add internship" : "Add experience"}
        title={(e, i) => (e.title || e.company ? `${e.title || "Role"} @ ${e.company || "Company"}` : `Experience #${i + 1}`)}
        blank={() => ({ id: uid(), company: "", title: "", type: fresher ? "Internship" : "Full-time", start: "", end: "", current: false, location: "", description: "" })}
        render={(e, set) => (
          <div className="form-grid">
            <F label="Job title" req>
              <input className="input" value={e.title} onChange={(x) => set({ title: x.target.value })} />
            </F>
            <F label="Company" req>
              <input className="input" value={e.company} onChange={(x) => set({ company: x.target.value })} />
            </F>
            <F label="Type">
              <select className="select" value={e.type} onChange={(x) => set({ type: x.target.value })}>
                {["Full-time", "Internship", "Contract", "Part-time", "Freelance"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </F>
            <F label="Location">
              <input className="input" value={e.location} onChange={(x) => set({ location: x.target.value })} />
            </F>
            <F label="Start" req>
              <input className="input" type="month" value={e.start} onChange={(x) => set({ start: x.target.value })} />
            </F>
            <F label="End">
              <input className="input" type="month" value={e.end} disabled={e.current} onChange={(x) => set({ end: x.target.value })} />
              <label className="check small" style={{ fontWeight: 500 }}>
                <input type="checkbox" checked={e.current} onChange={(x) => set({ current: x.target.checked, end: x.target.checked ? "" : e.end })} /> I currently work here
              </label>
            </F>
            <F label="What did you do?" full hint="Responsibilities, impact, tech used. Numbers help.">
              <textarea className="textarea" value={e.description} onChange={(x) => set({ description: x.target.value })} maxLength={2000} />
            </F>
          </div>
        )}
      />
    </>
  );
}

function SkillsSection({ list, onChange }: { list: Skill[]; onChange: (v: Skill[]) => void }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState<Skill["category"]>("technical");
  const inputRef = useRef<HTMLInputElement>(null);
  function add() {
    const n = name.trim();
    if (!n) return;
    if (list.some((s) => s.name.toLowerCase() === n.toLowerCase())) {
      setName("");
      return;
    }
    onChange([...list, { id: uid(), name: n, category: cat, level: 2, years: 1 }]);
    setName("");
    inputRef.current?.focus();
  }
  return (
    <>
      <SectionHead title="Skills" sub="Add at least 3. Recruiters match these against each job's required skills, so use standard names (React, Java, SQL…)." />
      <div className="row mb" style={{ marginBottom: 18, flexWrap: "nowrap" }}>
        <input
          ref={inputRef}
          className="input"
          list="skill-suggestions"
          placeholder="Type a skill and press Enter"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <datalist id="skill-suggestions">
          {SKILL_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <select className="select" style={{ width: 150 }} value={cat} onChange={(e) => setCat(e.target.value as Skill["category"])}>
          <option value="technical">Technical</option>
          <option value="professional">Professional</option>
        </select>
        <button type="button" className="btn dark" onClick={add}>
          Add
        </button>
      </div>
      {list.length === 0 ? (
        <div className="empty">No skills yet.</div>
      ) : (
        <div className="table-wrap" style={{ boxShadow: "none" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Type</th>
                <th>Proficiency</th>
                <th>Years</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const set = (patch: Partial<Skill>) => onChange(list.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
                return (
                  <tr key={s.id}>
                    <td>
                      <b>{s.name}</b>
                    </td>
                    <td>
                      <select className="select sm" value={s.category} onChange={(e) => set({ category: e.target.value as Skill["category"] })}>
                        <option value="technical">Technical</option>
                        <option value="professional">Professional</option>
                      </select>
                    </td>
                    <td>
                      <div className="stars">
                        {[1, 2, 3, 4].map((n) => (
                          <button type="button" key={n} className={s.level >= n ? "on" : ""} title={SKILL_LEVELS[n]} onClick={() => set({ level: n })}>
                            {n}
                          </button>
                        ))}
                      </div>
                      <div className="tiny muted">{SKILL_LEVELS[s.level]}</div>
                    </td>
                    <td>
                      <input className="input sm" style={{ width: 70 }} type="number" min={0} max={40} step={0.5} value={s.years} onChange={(e) => set({ years: Number(e.target.value) })} />
                    </td>
                    <td className="right">
                      <button type="button" className="btn xs red" onClick={() => onChange(list.filter((x) => x.id !== s.id))}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ProjectsSection({ list, onChange }: { list: Project[]; onChange: (v: Project[]) => void }) {
  return (
    <>
      <SectionHead title="Projects" sub="Projects are the strongest proof of skill, especially for freshers. The tech stack is matched against job requirements." />
      <ListShell
        items={list}
        onChange={onChange}
        addLabel="Add project"
        title={(x, i) => x.title || `Project #${i + 1}`}
        blank={() => ({ id: uid(), title: "", role: "", tech: "", description: "", link: "", repo: "" })}
        render={(x, set) => (
          <div className="form-grid">
            <F label="Project name" req>
              <input className="input" value={x.title} onChange={(e) => set({ title: e.target.value })} />
            </F>
            <F label="Your role">
              <input className="input" value={x.role} onChange={(e) => set({ role: e.target.value })} placeholder="Solo / Backend lead / …" />
            </F>
            <F label="Tech stack" full hint="Comma separated, e.g. React, Node.js, PostgreSQL">
              <input className="input" value={x.tech} onChange={(e) => set({ tech: e.target.value })} />
            </F>
            <F label="Description" full hint="The problem, what you built, the outcome.">
              <textarea className="textarea" value={x.description} onChange={(e) => set({ description: e.target.value })} maxLength={2000} />
            </F>
            <F label="Live link">
              <input className="input" value={x.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" />
            </F>
            <F label="Source code">
              <input className="input" value={x.repo} onChange={(e) => set({ repo: e.target.value })} placeholder="https://github.com/…" />
            </F>
          </div>
        )}
      />
    </>
  );
}

function CertSection({ list, onChange }: { list: Certification[]; onChange: (v: Certification[]) => void }) {
  return (
    <>
      <SectionHead title="Certifications" sub="Optional. Upload the certificate files in Documents." />
      <ListShell
        items={list}
        onChange={onChange}
        addLabel="Add certification"
        title={(x, i) => x.name || `Certification #${i + 1}`}
        blank={() => ({ id: uid(), name: "", issuer: "", year: "", url: "" })}
        render={(x, set) => (
          <div className="form-grid">
            <F label="Name" req>
              <input className="input" value={x.name} onChange={(e) => set({ name: e.target.value })} />
            </F>
            <F label="Issuer">
              <input className="input" value={x.issuer} onChange={(e) => set({ issuer: e.target.value })} />
            </F>
            <F label="Year">
              <input className="input" value={x.year} maxLength={4} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "") })} />
            </F>
            <F label="Credential URL">
              <input className="input" value={x.url} onChange={(e) => set({ url: e.target.value })} />
            </F>
          </div>
        )}
      />
    </>
  );
}

function LinksSection({ p, update }: { p: Profile; update: Upd }) {
  const set = (k: keyof Profile["links"]) => (e: React.ChangeEvent<HTMLInputElement>) => update("links", { ...p.links, [k]: e.target.value });
  return (
    <>
      <SectionHead title="Links" sub="Optional, but a GitHub or portfolio is flagged as a positive signal to recruiters." />
      <div className="form-grid">
        <F label="LinkedIn" full>
          <input className="input" value={p.links.linkedin} onChange={set("linkedin")} placeholder="https://linkedin.com/in/…" />
        </F>
        <F label="GitHub" full>
          <input className="input" value={p.links.github} onChange={set("github")} placeholder="https://github.com/…" />
        </F>
        <F label="Portfolio / website" full>
          <input className="input" value={p.links.portfolio} onChange={set("portfolio")} placeholder="https://…" />
        </F>
        <F label="Other (LeetCode, Kaggle, YouTube, blog…)" full>
          <input className="input" value={p.links.other} onChange={set("other")} />
        </F>
      </div>
    </>
  );
}

function AdditionalSection({ p, update }: { p: Profile; update: Upd }) {
  const a = p.additional;
  const set = (k: keyof Profile["additional"]) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => update("additional", { ...a, [k]: e.target.value });
  return (
    <>
      <SectionHead title="Availability & more" sub="The practical details recruiters need before scheduling interviews." />
      <div className="form-grid">
        <F label="Notice period (days)" req hint="0 if you can join immediately">
          <input className="input" type="number" min={0} max={180} value={a.noticePeriodDays} onChange={set("noticePeriodDays")} />
        </F>
        <F label="Available from">
          <input className="input" type="date" value={a.availableFrom} onChange={set("availableFrom")} />
        </F>
        <F label="Current CTC (LPA)" hint="0 for freshers">
          <input className="input" type="number" min={0} step={0.1} value={a.currentCtc} onChange={set("currentCtc")} />
        </F>
        <F label="Expected CTC (LPA)" req>
          <input className="input" type="number" min={0} step={0.1} value={a.expectedCtc} onChange={set("expectedCtc")} />
        </F>
        <F label="Willing to relocate?">
          <select className="select" value={a.willingToRelocate} onChange={set("willingToRelocate")}>
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </F>
        <F label="Preferred locations">
          <input className="input" value={a.preferredLocations} onChange={set("preferredLocations")} placeholder="Bengaluru, Remote" />
        </F>
        <F label="Languages known">
          <input className="input" value={a.languages} onChange={set("languages")} placeholder="English, Hindi" />
        </F>
        <F label="How did you hear about us?">
          <select className="select" value={a.howHeard} onChange={set("howHeard")}>
            <option value="">—</option>
            {["LinkedIn", "YouTube", "Referral", "Job portal", "College", "Company website", "Other"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </F>
      </div>
    </>
  );
}

function DocumentsSection({ docs }: { docs: DocumentMeta[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(category: string, file: File) {
    if (file.size > 4 * 1024 * 1024) {
      toast("Files must be 4 MB or smaller", "error");
      return;
    }
    setBusy(category);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      await api("/api/documents", "POST", fd);
      toast("Uploaded");
      router.refresh();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number) {
    try {
      await api(`/api/documents/${id}`, "DELETE");
      toast("Removed");
      router.refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <>
      <SectionHead title="Documents" sub="PDF, JPG or PNG, up to 4 MB each. Resume and 10th & 12th certificates are required. Uploads save instantly." />
      <div className="stack">
        {DOC_CATEGORIES.map((c) => {
          const mine = docs.filter((d) => d.category === c.key);
          const single = ["resume", "marksheet_10", "marksheet_12"].includes(c.key);
          return (
            <div key={c.key} className={`item ${mine.length ? "" : c.required ? "bg-soft" : ""}`}>
              <div className="row between">
                <div className="grow">
                  <b className={c.required ? "req" : ""}>{c.label}</b>
                  <div className="tiny muted">{c.hint}{single ? " · uploading again replaces the file" : ""}</div>
                </div>
                <label className={`btn sm ${mine.length ? "" : c.required ? "primary" : ""}`} style={{ cursor: "pointer" }}>
                  {busy === c.key ? "Uploading…" : mine.length && single ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    hidden
                    disabled={!!busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(c.key, f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {mine.length > 0 && (
                <div className="stack" style={{ gap: 6, marginTop: 10 }}>
                  {mine.map((d) => (
                    <div key={d.id} className="row between small" style={{ borderTop: "1px dashed #bbb", paddingTop: 6 }}>
                      <span className="truncate grow">
                        📄 <b>{d.filename}</b> <span className="muted">· {fmtBytes(d.size)} · {fmtDate(d.uploaded_at)}</span>
                      </span>
                      <span className="row" style={{ gap: 6 }}>
                        <a className="btn xs" href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">
                          View
                        </a>
                        <button className="btn xs red" onClick={() => remove(d.id)}>
                          Delete
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
