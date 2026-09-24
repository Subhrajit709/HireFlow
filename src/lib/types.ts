// Shared domain types (used on both server and client).

export type Role = "candidate" | "recruiter";

export interface SessionUser {
  id: number;
  role: Role;
  name: string;
  email: string;
}

export interface Personal {
  fullName: string;
  phone: string;
  dob: string;
  gender: string;
  city: string;
  state: string;
  country: string;
  headline: string;
  summary: string;
}

export interface Education {
  id: string;
  level: string; // 10th | 12th | Diploma | Bachelor's | Master's | PhD | Other
  institution: string;
  board: string; // board / university
  degree: string; // e.g. B.Tech — empty for school
  field: string; // stream / specialisation
  startYear: string;
  endYear: string;
  score: string;
  scoreType: string; // % | CGPA
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  type: string; // Full-time | Internship | Contract | Freelance
  start: string; // YYYY-MM
  end: string; // YYYY-MM ('' if current)
  current: boolean;
  location: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  category: "technical" | "professional";
  level: number; // 1-4 Beginner..Expert
  years: number;
}

export interface Project {
  id: string;
  title: string;
  role: string;
  tech: string; // comma separated
  description: string;
  link: string;
  repo: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  url: string;
}

export interface Links {
  linkedin: string;
  github: string;
  portfolio: string;
  other: string;
}

export interface Additional {
  isFresher: boolean;
  noticePeriodDays: string;
  currentCtc: string; // LPA
  expectedCtc: string; // LPA
  preferredLocations: string;
  willingToRelocate: string; // yes | no | ''
  availableFrom: string;
  languages: string;
  howHeard: string;
}

export interface Profile {
  personal: Personal;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  links: Links;
  additional: Additional;
}

export type QuestionType = "yesno" | "number" | "text" | "choice";

export interface ScreeningQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  /** Knock-out rule: an answer that fails this is flagged to the recruiter. */
  knockout?: { op: "eq" | "gte" | "lte"; value: string } | null;
}

export interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  work_mode: string;
  description: string;
  required_skills: string[];
  nice_skills: string[];
  min_experience: number;
  max_ctc: number | null;
  openings: number;
  questions: ScreeningQuestion[];
  status: "open" | "closed";
  created_at: string | Date;
}

export interface DocumentMeta {
  id: number;
  user_id: number;
  category: string;
  label: string;
  filename: string;
  mime: string;
  size: number;
  uploaded_at: string | Date;
}

export interface EvaluationScores {
  technical: number;
  experience: number;
  education: number;
  projects: number;
  communication: number;
  culture: number;
}

export type Recommendation = "strong_yes" | "yes" | "maybe" | "no";

export const DOC_CATEGORIES: { key: string; label: string; required: boolean; hint: string }[] = [
  { key: "resume", label: "Resume / CV", required: true, hint: "PDF preferred" },
  { key: "marksheet_10", label: "10th Certificate / Marksheet", required: true, hint: "Academic proof" },
  { key: "marksheet_12", label: "12th Certificate / Marksheet", required: true, hint: "Academic proof" },
  { key: "degree", label: "Degree / Provisional Certificate", required: false, hint: "Highest qualification" },
  { key: "certificate", label: "Other Certificates", required: false, hint: "Courses, awards, etc." },
  { key: "personality", label: "Personality / Assessment Report", required: false, hint: "e.g. DISC report" },
  { key: "other", label: "Other Documents", required: false, hint: "Anything else relevant" },
];

export const docCategoryLabel = (key: string) => DOC_CATEGORIES.find((c) => c.key === key)?.label ?? key;

export const SKILL_LEVELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];

export const EVAL_CRITERIA: { key: keyof EvaluationScores; label: string; hint: string }[] = [
  { key: "technical", label: "Technical skills", hint: "Depth in the role's required stack" },
  { key: "experience", label: "Relevant experience", hint: "Similar work, domain, scale" },
  { key: "projects", label: "Projects & portfolio", hint: "Quality and ownership of shipped work" },
  { key: "education", label: "Education", hint: "Relevance & academic record" },
  { key: "communication", label: "Communication", hint: "Clarity of profile, answers, resume" },
  { key: "culture", label: "Motivation & fit", hint: "Interest in role, availability, logistics" },
];

export const RECOMMENDATIONS: { key: Recommendation; label: string; color: string }[] = [
  { key: "strong_yes", label: "Strong yes", color: "green" },
  { key: "yes", label: "Yes", color: "blue" },
  { key: "maybe", label: "Maybe", color: "yellow" },
  { key: "no", label: "No", color: "red" },
];

export function emptyProfile(name = ""): Profile {
  return {
    personal: {
      fullName: name,
      phone: "",
      dob: "",
      gender: "",
      city: "",
      state: "",
      country: "India",
      headline: "",
      summary: "",
    },
    education: [],
    experience: [],
    skills: [],
    projects: [],
    certifications: [],
    links: { linkedin: "", github: "", portfolio: "", other: "" },
    additional: {
      isFresher: false,
      noticePeriodDays: "",
      currentCtc: "",
      expectedCtc: "",
      preferredLocations: "",
      willingToRelocate: "",
      availableFrom: "",
      languages: "",
      howHeard: "",
    },
  };
}

/** Merge stored JSON with defaults so older/partial rows never crash the UI. */
export function normalizeProfile(data: any, name = ""): Profile {
  const base = emptyProfile(name);
  const d = data || {};
  return {
    personal: { ...base.personal, ...(d.personal || {}) },
    education: Array.isArray(d.education) ? d.education : [],
    experience: Array.isArray(d.experience) ? d.experience : [],
    skills: Array.isArray(d.skills) ? d.skills : [],
    projects: Array.isArray(d.projects) ? d.projects : [],
    certifications: Array.isArray(d.certifications) ? d.certifications : [],
    links: { ...base.links, ...(d.links || {}) },
    additional: { ...base.additional, ...(d.additional || {}) },
  };
}
