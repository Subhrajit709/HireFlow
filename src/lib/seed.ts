import bcrypt from "bcryptjs";
import type { QueryFn } from "./db";
import { emptyProfile, type Profile, type ScreeningQuestion } from "./types";
import { makePdf } from "./pdf";

/**
 * Demo data so reviewers can explore both portals immediately:
 *   recruiter@demo.com / Recruiter@123
 *   candidate@demo.com / Candidate@123   (plus 8 more candidates across all stages)
 */

const rid = () => Math.random().toString(36).slice(2, 10);

const COMMON_QS: ScreeningQuestion[] = [
  { id: "relocate", text: "Are you willing to work from our Bengaluru office?", type: "yesno", required: true, knockout: { op: "eq", value: "Yes" } },
  { id: "why", text: "Why are you interested in this role? (2–3 lines)", type: "text", required: true, knockout: null },
];

const JOBS = [
  {
    title: "Full Stack Developer (React / Node.js)",
    department: "Engineering",
    location: "Bengaluru",
    employment_type: "Full-time",
    work_mode: "Hybrid",
    description:
      "Build and ship features across our learning platform, from React/Next.js front-ends to Node.js APIs and PostgreSQL. You'll own features end-to-end, write tests and review code.\n\nWhat you'll do:\n• Build responsive UIs in React / Next.js\n• Design REST APIs in Node.js\n• Model data in PostgreSQL\n• Collaborate with content & design teams",
    required_skills: ["React", "JavaScript", "Node.js", "SQL", "Git"],
    nice_skills: ["TypeScript", "Next.js", "Docker", "AWS"],
    min_experience: 1,
    max_ctc: 12,
    openings: 2,
    questions: [
      ...COMMON_QS,
      { id: "react_yrs", text: "How many years of hands-on React experience do you have?", type: "number", required: true, knockout: { op: "gte", value: "1" } },
      { id: "notice", text: "Can you join within 30 days?", type: "yesno", required: true, knockout: null },
    ] as ScreeningQuestion[],
  },
  {
    title: "Java Backend Engineer (Spring Boot)",
    department: "Engineering",
    location: "Bengaluru",
    employment_type: "Full-time",
    work_mode: "On-site",
    description:
      "Design and scale the services behind our courses, payments and live-class platform using Java 21, Spring Boot and microservices.\n\nWhat you'll do:\n• Build Spring Boot microservices\n• Own performance and reliability\n• Write clean, well-tested code",
    required_skills: ["Java", "Spring Boot", "SQL", "REST", "Git"],
    nice_skills: ["Kubernetes", "Kafka", "Docker", "Microservices"],
    min_experience: 2,
    max_ctc: 18,
    openings: 1,
    questions: [
      ...COMMON_QS,
      { id: "java_yrs", text: "Years of professional Java experience", type: "number", required: true, knockout: { op: "gte", value: "2" } },
      { id: "db", text: "Which database have you used most?", type: "choice", options: ["PostgreSQL", "MySQL", "Oracle", "MongoDB", "Other"], required: true, knockout: null },
    ] as ScreeningQuestion[],
  },
  {
    title: "Technical Trainer — Python & Data",
    department: "Education",
    location: "Remote (India)",
    employment_type: "Full-time",
    work_mode: "Remote",
    description:
      "Teach Python, data analysis and ML fundamentals to thousands of learners through live sessions and recorded content. You should love explaining things simply.",
    required_skills: ["Python", "Communication", "Pandas", "Teaching"],
    nice_skills: ["Machine Learning", "SQL", "Video Editing"],
    min_experience: 0,
    max_ctc: 10,
    openings: 1,
    questions: [
      { id: "demo", text: "Share a link to any video/session where you teach or explain something (optional)", type: "text", required: false, knockout: null },
      { id: "hindi", text: "Are you comfortable teaching in both English and Hindi?", type: "yesno", required: true, knockout: { op: "eq", value: "Yes" } },
    ] as ScreeningQuestion[],
  },
];

type Seed = {
  name: string;
  email: string;
  city: string;
  headline: string;
  summary: string;
  fresher?: boolean;
  exp: [string, string, string, string, string][]; // company, title, type, start, end('' = current)
  skills: [string, number, number][]; // name, level, years
  projects: [string, string, string][]; // title, tech, description
  edu: { degree: string; field: string; inst: string; year: string; score: string };
  links: Partial<Profile["links"]>;
  notice: string;
  expCtc: string;
  curCtc: string;
  job: number; // index into JOBS
  stage: string;
  daysAgo: number;
  answers: Record<string, string>;
  docs?: string[];
  eval?: { scores: number[]; rec: string; comments: string };
  note?: string;
};

const CANDIDATES: Seed[] = [
  {
    name: "Aarav Mehta",
    email: "candidate@demo.com",
    city: "Pune",
    headline: "Full Stack Developer · React, Node.js",
    summary: "Full stack developer with 2+ years of experience building production React and Node.js applications. I care about clean APIs, accessible UI and shipping fast.",
    exp: [
      ["Finlytics Pvt Ltd", "Software Engineer", "Full-time", "2023-07", ""],
      ["CodeCraft Labs", "Web Development Intern", "Internship", "2023-01", "2023-06"],
    ],
    skills: [["React", 4, 2.5], ["JavaScript", 4, 3], ["Node.js", 3, 2], ["PostgreSQL", 3, 2], ["Git", 3, 3], ["TypeScript", 3, 1.5], ["Communication", 3, 3]],
    projects: [
      ["ExpenseLens", "React, Node.js, PostgreSQL, Docker", "Personal finance tracker with OCR-based receipt parsing; 400+ users."],
      ["DevBoard", "Next.js, TypeScript, Prisma", "Kanban board for small teams with realtime sync."],
    ],
    edu: { degree: "B.Tech", field: "Computer Science", inst: "MIT World Peace University", year: "2023", score: "8.4" },
    links: { linkedin: "https://linkedin.com/in/aarav-demo", github: "https://github.com/aarav-demo" },
    notice: "30",
    expCtc: "10",
    curCtc: "7",
    job: 0,
    stage: "shortlisted",
    daysAgo: 6,
    answers: { relocate: "Yes", why: "I love building learning products and your platform helped me learn Java.", react_yrs: "2.5", notice: "Yes" },
    eval: { scores: [4, 4, 4, 4, 4, 4], rec: "yes", comments: "Solid React fundamentals, good projects. Move to technical test." },
    note: "Resume is clean; ExpenseLens repo is well structured with tests.",
  },
  {
    name: "Sneha Iyer",
    email: "sneha@demo.com",
    city: "Bengaluru",
    headline: "Senior Frontend Engineer",
    summary: "4 years building design systems and high-traffic React apps. Led migration of a 200k-LOC app to TypeScript and Next.js.",
    exp: [
      ["Swiggy-like FoodTech", "Senior Frontend Engineer", "Full-time", "2022-04", ""],
      ["InfoServe", "Frontend Engineer", "Full-time", "2020-08", "2022-03"],
    ],
    skills: [["React", 4, 4], ["TypeScript", 4, 3], ["JavaScript", 4, 5], ["Next.js", 4, 2], ["Node.js", 3, 2], ["SQL", 2, 2], ["Git", 4, 5], ["AWS", 2, 1]],
    projects: [["Open-source UI kit", "React, TypeScript, Storybook", "Accessible component library with 1.2k GitHub stars."]],
    edu: { degree: "B.E.", field: "Information Science", inst: "RV College of Engineering", year: "2020", score: "8.9" },
    links: { linkedin: "https://linkedin.com/in/sneha-demo", github: "https://github.com/sneha-demo", portfolio: "https://sneha.dev" },
    notice: "60",
    expCtc: "13",
    curCtc: "11",
    job: 0,
    stage: "interview",
    daysAgo: 12,
    answers: { relocate: "Yes", why: "I want to work on education at scale.", react_yrs: "4", notice: "No" },
    eval: { scores: [5, 5, 4, 4, 5, 4], rec: "strong_yes", comments: "Excellent. Cleared assessment with 92%." },
  },
  {
    name: "Rohit Verma",
    email: "rohit@demo.com",
    city: "Delhi",
    headline: "B.Tech graduate · aspiring developer",
    summary: "Recent graduate.",
    fresher: true,
    exp: [],
    skills: [["HTML", 2, 1], ["CSS", 2, 1], ["C++", 2, 2]],
    projects: [],
    edu: { degree: "B.Tech", field: "Electronics", inst: "Delhi Technical Campus", year: "2025", score: "6.8" },
    links: {},
    notice: "0",
    expCtc: "8",
    curCtc: "0",
    job: 0,
    stage: "applied",
    daysAgo: 1,
    answers: { relocate: "No", why: "Looking for job", react_yrs: "0", notice: "Yes" },
    docs: ["resume"],
  },
  {
    name: "Karthik Nair",
    email: "karthik@demo.com",
    city: "Chennai",
    headline: "Java Developer · Spring Boot · Microservices",
    summary: "Backend engineer with 3 years building Spring Boot microservices for a payments company. Comfortable with Kafka, Docker and PostgreSQL performance tuning.",
    exp: [["PayNest", "Software Engineer II", "Full-time", "2022-06", ""]],
    skills: [["Java", 4, 3], ["Spring Boot", 4, 3], ["SQL", 3, 3], ["REST", 4, 3], ["Git", 3, 3], ["Kafka", 3, 2], ["Docker", 3, 2], ["Microservices", 3, 2]],
    projects: [["Ledger service", "Java, Spring Boot, Kafka, PostgreSQL", "Double-entry ledger processing 2M txns/day."]],
    edu: { degree: "B.Tech", field: "Computer Science", inst: "SRM University", year: "2022", score: "8.1" },
    links: { linkedin: "https://linkedin.com/in/karthik-demo", github: "https://github.com/karthik-demo" },
    notice: "90",
    expCtc: "17",
    curCtc: "13",
    job: 1,
    stage: "assessment",
    daysAgo: 9,
    answers: { relocate: "Yes", why: "Want to build systems used by millions of learners.", java_yrs: "3", db: "PostgreSQL" },
    eval: { scores: [4, 4, 4, 4, 3, 4], rec: "yes", comments: "Strong backend profile. 90-day notice is a concern." },
  },
  {
    name: "Ananya Das",
    email: "ananya@demo.com",
    city: "Kolkata",
    headline: "Java Developer",
    summary: "Backend developer working on Java enterprise applications for a services company.",
    exp: [
      ["TechServe", "Associate Engineer", "Full-time", "2023-09", "2024-04"],
      ["QuickSoft", "Java Developer", "Full-time", "2024-11", "2025-05"],
      ["Nimbus IT", "Java Developer", "Full-time", "2025-08", ""],
    ],
    skills: [["Java", 3, 2], ["SQL", 2, 2], ["Spring Boot", 2, 1], ["Hibernate", 2, 1]],
    projects: [],
    edu: { degree: "B.Sc", field: "Computer Science", inst: "University of Calcutta", year: "2023", score: "72%" },
    links: { linkedin: "https://linkedin.com/in/ananya-demo" },
    notice: "30",
    expCtc: "24",
    curCtc: "8",
    job: 1,
    stage: "under_review",
    daysAgo: 3,
    answers: { relocate: "Yes", why: "Better growth.", java_yrs: "1", db: "MySQL" },
  },
  {
    name: "Imran Sheikh",
    email: "imran@demo.com",
    city: "Hyderabad",
    headline: "Python Trainer · Data Analyst",
    summary: "I have trained 3,000+ students in Python and data analysis. I run a YouTube channel explaining pandas in Hindi and English.",
    exp: [["DataSkool", "Python Trainer", "Full-time", "2023-02", ""]],
    skills: [["Python", 4, 4], ["Pandas", 4, 3], ["Teaching", 4, 3], ["Communication", 4, 4], ["SQL", 3, 3], ["Machine Learning", 2, 1]],
    projects: [["Pandas in 30 days", "Python, Pandas, Jupyter", "Free course series with 150k views."]],
    edu: { degree: "M.Sc", field: "Statistics", inst: "Osmania University", year: "2022", score: "78%" },
    links: { linkedin: "https://linkedin.com/in/imran-demo", portfolio: "https://youtube.com/@imran-demo" },
    notice: "15",
    expCtc: "9",
    curCtc: "7",
    job: 2,
    stage: "offer",
    daysAgo: 20,
    answers: { demo: "https://youtube.com/@imran-demo", hindi: "Yes" },
    eval: { scores: [4, 5, 5, 4, 5, 5], rec: "strong_yes", comments: "Great demo lecture. Learners will love him." },
  },
  {
    name: "Meera Joshi",
    email: "meera@demo.com",
    city: "Mumbai",
    headline: "Frontend Developer",
    summary: "Frontend developer with a focus on React and animation.",
    exp: [["PixelWorks", "Frontend Developer", "Full-time", "2022-01", "2024-12"]],
    skills: [["React", 3, 3], ["JavaScript", 3, 3], ["CSS", 4, 3], ["Figma", 3, 2]],
    projects: [["Portfolio site", "React, GSAP", "Animated personal portfolio."]],
    edu: { degree: "B.Des", field: "Interaction Design", inst: "MIT Institute of Design", year: "2021", score: "8.0" },
    links: { portfolio: "https://meera.design" },
    notice: "0",
    expCtc: "11",
    curCtc: "9",
    job: 0,
    stage: "rejected",
    daysAgo: 15,
    answers: { relocate: "Yes", why: "Interested in product UI.", react_yrs: "3", notice: "Yes" },
    eval: { scores: [2, 3, 3, 3, 4, 3], rec: "no", comments: "No backend experience; role needs Node + SQL." },
  },
  {
    name: "Vikram Singh",
    email: "vikram@demo.com",
    city: "Jaipur",
    headline: "Full Stack Engineer · MERN",
    summary: "MERN developer with 1.5 years at a startup. Built admin dashboards, payment integrations and REST APIs.",
    exp: [["Shopkart", "Full Stack Developer", "Full-time", "2024-03", ""]],
    skills: [["React", 3, 1.5], ["Node.js", 3, 1.5], ["MongoDB", 3, 1.5], ["JavaScript", 3, 2], ["Git", 3, 2], ["SQL", 2, 1]],
    projects: [["Shopkart admin", "React, Node.js, MongoDB", "Internal dashboard for order management."]],
    edu: { degree: "BCA", field: "Computer Applications", inst: "University of Rajasthan", year: "2023", score: "76%" },
    links: { github: "https://github.com/vikram-demo", linkedin: "https://linkedin.com/in/vikram-demo" },
    notice: "30",
    expCtc: "9",
    curCtc: "6",
    job: 0,
    stage: "under_review",
    daysAgo: 2,
    answers: { relocate: "Yes", why: "Want to grow as a full stack engineer on a larger product.", react_yrs: "1.5", notice: "Yes" },
  },
  {
    name: "Pooja Reddy",
    email: "pooja@demo.com",
    city: "Bengaluru",
    headline: "Python Developer & Mentor",
    summary: "Python developer who mentors at weekend bootcamps.",
    exp: [["Mentorly", "Part-time Mentor", "Contract", "2024-06", ""]],
    skills: [["Python", 3, 2], ["Communication", 3, 2], ["Pandas", 2, 1]],
    projects: [],
    edu: { degree: "B.Tech", field: "Information Technology", inst: "JNTU Hyderabad", year: "2024", score: "7.6" },
    links: { linkedin: "https://linkedin.com/in/pooja-demo" },
    notice: "30",
    expCtc: "7",
    curCtc: "4",
    job: 2,
    stage: "applied",
    daysAgo: 0,
    answers: { demo: "", hindi: "No" },
  },
];

const EVAL_KEYS = ["technical", "experience", "projects", "education", "communication", "culture"];

const STAGE_PATH: Record<string, string[]> = {
  applied: [],
  under_review: ["under_review"],
  shortlisted: ["under_review", "shortlisted"],
  assessment: ["under_review", "shortlisted", "assessment"],
  interview: ["under_review", "shortlisted", "assessment", "interview"],
  offer: ["under_review", "shortlisted", "assessment", "interview", "offer"],
  rejected: ["under_review", "rejected"],
};

export async function seed(query: QueryFn) {
  console.log("[seed] Seeding demo data…");
  const recHash = await bcrypt.hash("Recruiter@123", 10);
  const candHash = await bcrypt.hash("Candidate@123", 10);

  // `on conflict do nothing` makes this a claim: if two serverless instances cold-start on an empty
  // database at the same time, only the one that inserts the recruiter row goes on to seed.
  const [rec] = await query<{ id: number }>(
    `insert into users (email, password_hash, name, role) values ($1, $2, $3, 'recruiter')
     on conflict (email) do nothing returning id`,
    ["recruiter@demo.com", recHash, "Riya Kapoor"]
  );
  if (!rec) {
    console.log("[seed] Another instance is seeding. Skipping.");
    return;
  }

  const jobIds: number[] = [];
  for (const j of JOBS) {
    const [row] = await query<{ id: number }>(
      `insert into jobs (title, department, location, employment_type, work_mode, description, required_skills, nice_skills,
                         min_experience, max_ctc, openings, questions, created_by, created_at)
       values ($1,$2,$3,$4,$5,$6,$7::text::jsonb,$8::text::jsonb,$9,$10,$11,$12::text::jsonb,$13, now() - interval '30 days') returning id`,
      [j.title, j.department, j.location, j.employment_type, j.work_mode, j.description, JSON.stringify(j.required_skills),
       JSON.stringify(j.nice_skills), j.min_experience, j.max_ctc, j.openings, JSON.stringify(j.questions), rec.id]
    );
    jobIds.push(row.id);
  }

  for (const c of CANDIDATES) {
    const [u] = await query<{ id: number }>(
      `insert into users (email, password_hash, name, role, created_at) values ($1, $2, $3, 'candidate', now() - make_interval(days => $4)) returning id`,
      [c.email, candHash, c.name, c.daysAgo + 2]
    );
    const p = emptyProfile(c.name);
    p.personal = { ...p.personal, phone: `+91 98765 ${String(10000 + u.id).slice(-5)}`, city: c.city, state: "", headline: c.headline, summary: c.summary, dob: "1999-05-14", gender: "" };
    p.education = [
      { id: rid(), level: "10th", institution: "Kendriya Vidyalaya", board: "CBSE", degree: "", field: "", startYear: "", endYear: String(Number(c.edu.year) - 6), score: "88", scoreType: "%" },
      { id: rid(), level: "12th", institution: "Kendriya Vidyalaya", board: "CBSE", degree: "", field: "Science (PCM)", startYear: "", endYear: String(Number(c.edu.year) - 4), score: "84", scoreType: "%" },
      {
        id: rid(),
        level: c.edu.degree.startsWith("M") ? "Master's" : "Bachelor's",
        institution: c.edu.inst,
        board: "",
        degree: c.edu.degree,
        field: c.edu.field,
        startYear: String(Number(c.edu.year) - 4),
        endYear: c.edu.year,
        score: c.edu.score.replace("%", ""),
        scoreType: c.edu.score.includes("%") ? "%" : "CGPA",
      },
    ];
    p.experience = c.exp.map(([company, title, type, start, end]) => ({ id: rid(), company, title, type, start, end, current: !end, location: c.city, description: "" }));
    p.skills = c.skills.map(([name, level, years]) => ({
      id: rid(), name, level, years,
      category: ["Communication", "Teaching", "Figma"].includes(name) ? "professional" : "technical",
    }));
    p.projects = c.projects.map(([title, tech, description]) => ({ id: rid(), title, role: "Developer", tech, description, link: "", repo: "" }));
    p.links = { ...p.links, ...c.links };
    p.additional = { ...p.additional, isFresher: !!c.fresher, noticePeriodDays: c.notice, expectedCtc: c.expCtc, currentCtc: c.curCtc, willingToRelocate: "yes", languages: "English, Hindi", howHeard: "LinkedIn" };
    await query(`insert into profiles (user_id, data) values ($1, $2::text::jsonb)`, [u.id, JSON.stringify(p)]);

    const docs = c.docs ?? ["resume", "marksheet_10", "marksheet_12", "degree"];
    for (const cat of docs) {
      const title = cat === "resume" ? `${c.name} — Resume` : `${c.name} — ${cat.replace("_", " ")}`;
      const lines =
        cat === "resume"
          ? [c.name, c.headline, c.email, "", "SUMMARY", c.summary, "", "EXPERIENCE", ...c.exp.map((e) => `${e[1]} @ ${e[0]} (${e[3]} - ${e[4] || "present"})`),
             "", "SKILLS", c.skills.map((s) => s[0]).join(", "), "", "PROJECTS", ...c.projects.map((pr) => `${pr[0]}: ${pr[2]}`),
             "", "EDUCATION", `${c.edu.degree} ${c.edu.field}, ${c.edu.inst} (${c.edu.year})`, "", "(Demo document generated by seed script)"]
          : [title, "", "This is a placeholder academic document generated for the demo."];
      const pdf = makePdf(lines);
      await query(`insert into documents (user_id, category, label, filename, mime, size, data) values ($1,$2,$3,$4,'application/pdf',$5,$6)`, [
        u.id, cat, "", `${c.name.split(" ")[0].toLowerCase()}-${cat}.pdf`, pdf.length, pdf,
      ]);
    }

    const [app] = await query<{ id: number }>(
      `insert into applications (candidate_id, job_id, stage, answers, submitted_at, updated_at)
       values ($1, $2, $3, $4::text::jsonb, now() - make_interval(days => $5), now() - make_interval(days => $6)) returning id`,
      [u.id, jobIds[c.job], c.stage, JSON.stringify(c.answers), c.daysAgo, Math.max(0, c.daysAgo - 1)]
    );
    await query(`insert into events (application_id, actor_id, kind, to_stage, message, created_at) values ($1,$2,'submitted','applied','Application submitted', now() - make_interval(days => $3))`, [app.id, u.id, c.daysAgo]);

    let prev = "applied";
    const path = STAGE_PATH[c.stage] ?? [];
    for (let i = 0; i < path.length; i++) {
      const to = path[i];
      const hours = Math.max(1, Math.round(((c.daysAgo * 24) / (path.length + 1)) * (path.length - i)));
      await query(
        `insert into events (application_id, actor_id, kind, from_stage, to_stage, message, created_at)
         values ($1,$2,'stage',$3,$4,$5, now() - make_interval(hours => $6))`,
        [app.id, rec.id, prev, to, to === "rejected" ? "Thank you for applying. We're looking for stronger backend experience for this role." : "", hours]
      );
      prev = to;
    }

    if (["assessment", "interview", "offer"].includes(c.stage)) {
      await query(`update applications set assessment = $2::text::jsonb where id = $1`, [
        app.id,
        JSON.stringify(
          c.stage === "assessment"
            ? { title: "Backend take-home (Spring Boot)", link: "https://example.com/assessment/abc", due: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), instructions: "Build a small REST service with tests. Submit a GitHub link.", score: "", result: "" }
            : { title: "Online coding test", link: "https://example.com/test", due: "", instructions: "", score: "92", result: "pass" }
        ),
      ]);
    }
    if (["interview", "offer"].includes(c.stage)) {
      await query(`update applications set interview = $2::text::jsonb where id = $1`, [
        app.id,
        JSON.stringify({ when: `${new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10)}T11:00`, mode: "Video call", location: "https://meet.example.com/xyz-demo", interviewers: "Riya Kapoor, Arjun (Tech Lead)", notes: "45 min — system design + React deep dive" }),
      ]);
    }

    if (c.eval) {
      const scores = Object.fromEntries(EVAL_KEYS.map((k, i) => [k, c.eval!.scores[i]]));
      await query(`insert into evaluations (application_id, recruiter_id, scores, recommendation, comments) values ($1,$2,$3::text::jsonb,$4,$5)`, [
        app.id, rec.id, JSON.stringify(scores), c.eval.rec, c.eval.comments,
      ]);
    }
    if (c.note) await query(`insert into notes (application_id, author_id, body) values ($1,$2,$3)`, [app.id, rec.id, c.note]);

    if (c.email === "candidate@demo.com") {
      await query(`insert into notifications (user_id, title, body, link) values ($1,$2,$3,$4)`, [
        u.id, "You've been shortlisted!", `Your application for ${JOBS[c.job].title} moved to Shortlisted.`, `/candidate/applications/${app.id}`,
      ]);
      await query(`insert into info_requests (application_id, requested_by, question) values ($1,$2,$3)`, [
        app.id, rec.id, "Could you share your earliest possible joining date and whether your notice period is negotiable?",
      ]);
      await query(`insert into notifications (user_id, title, body, link) values ($1,$2,$3,$4)`, [
        u.id, "Information requested", "The recruiter asked you a question about your application.", `/candidate/applications/${app.id}`,
      ]);
    }
  }

  await query(`insert into notifications (user_id, title, body, link) select id, 'Welcome to HireFlow', 'Demo data has been loaded: 3 jobs and 9 candidates across the pipeline.', '/recruiter' from users where role = 'recruiter'`);
  console.log("[seed] Done.");
}
