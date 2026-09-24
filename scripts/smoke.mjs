// End-to-end smoke test against a running server.
//   npm run dev        (in one terminal)
//   npm run smoke      (in another)  — or BASE_URL=https://your-app.vercel.app npm run smoke
//
// Covers: every page renders, candidate sign-up → profile → documents → apply,
// recruiter review → scorecard → notes → info request → stage moves, and permission checks.

const BASE = process.env.BASE_URL || "http://localhost:3000";
let failures = 0;
let passes = 0;

function session() {
  let cookie = "";
  return async (path, { method = "GET", body, form } = {}) => {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
      body: form ?? (body ? JSON.stringify(body) : undefined),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const type = res.headers.get("content-type") || "";
    const data = type.includes("json") ? await res.json() : await res.text();
    return { status: res.status, data };
  };
}

function check(name, cond, extra = "") {
  if (cond) {
    passes++;
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

async function page(s, path) {
  const r = await s(path);
  const ok = r.status === 200 && typeof r.data === "string" && !r.data.includes("Application error") && !r.data.includes("Internal Server Error");
  check(`GET ${path} → ${r.status}`, ok);
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);

  // ---------------------------------------------------------------- public
  const anon = session();
  console.log("Public");
  await page(anon, "/");
  await page(anon, "/login");
  await page(anon, "/register");
  const guarded = await anon("/recruiter");
  check("recruiter area redirects anonymous users", guarded.status === 307 || guarded.status === 303 || guarded.status === 302);
  check("API rejects anonymous", (await anon("/api/profile")).status === 401);

  // --------------------------------------------------------------- recruiter
  const rec = session();
  console.log("\nRecruiter pages");
  check("recruiter login", (await rec("/api/auth/login", { method: "POST", body: { email: "recruiter@demo.com", password: "Recruiter@123" } })).status === 200);
  for (const p of [
    "/recruiter",
    "/recruiter/candidates",
    "/recruiter/candidates?stage=applied&sort=fit",
    "/recruiter/candidates?band=strong&ko=hide&skill=React&minExp=1",
    "/recruiter/candidates?q=java",
    "/recruiter/board",
    "/recruiter/board?closed=1",
    "/recruiter/jobs",
    "/recruiter/jobs/new",
    "/recruiter/jobs/1/edit",
    "/recruiter/applications/1",
    "/recruiter/applications/3",
    "/recruiter/compare?ids=1,2,3",
    "/recruiter/notifications",
  ])
    await page(rec, p);

  // --------------------------------------------------------------- candidate
  console.log("\nCandidate flow");
  const cand = session();
  const email = `smoke${Date.now()}@test.dev`;
  check("register", (await cand("/api/auth/register", { method: "POST", body: { name: "Smoke Tester", email, password: "Password123" } })).status === 200);
  check("duplicate email rejected", (await session()("/api/auth/register", { method: "POST", body: { name: "X", email, password: "Password123" } })).status === 409);
  check("recruiter signup without invite rejected", (await session()("/api/auth/register", { method: "POST", body: { name: "X", email: "x" + email, password: "Password123", role: "recruiter" } })).status === 403);
  for (const p of ["/candidate", "/candidate/profile", "/candidate/profile/preview", "/candidate/jobs", "/candidate/jobs/1", "/candidate/applications", "/candidate/notifications"]) await page(cand, p);

  const answers = { relocate: "Yes", why: "Testing", react_yrs: "3", notice: "Yes" };
  const early = await cand("/api/applications", { method: "POST", body: { jobId: 1, answers } });
  check("apply blocked while profile incomplete (422)", early.status === 422, JSON.stringify(early.data));

  const profile = {
    personal: { fullName: "Smoke Tester", phone: "9999999999", city: "Pune", headline: "React developer", summary: "I build things with React and Node every single day." },
    education: [{ id: "e1", level: "Bachelor's", institution: "Test Uni", degree: "B.Tech", field: "CS", endYear: "2022", score: "8", scoreType: "CGPA" }],
    experience: [{ id: "x1", company: "Acme", title: "Dev", type: "Full-time", start: "2022-07", end: "", current: true }],
    skills: ["React", "JavaScript", "Node.js", "PostgreSQL", "Git"].map((n, i) => ({ id: "s" + i, name: n, category: "technical", level: 3, years: 2 })),
    projects: [{ id: "p1", title: "Thing", tech: "React, Node.js", description: "A thing" }],
    links: { github: "github.com/smoke" },
    additional: { noticePeriodDays: "30", expectedCtc: "10" },
  };
  check("save profile", (await cand("/api/profile", { method: "PUT", body: profile })).status === 200);

  const pdf = new Blob(["%PDF-1.4\n% smoke test\n"], { type: "application/pdf" });
  for (const category of ["resume", "marksheet_10", "marksheet_12"]) {
    const fd = new FormData();
    fd.append("file", pdf, `${category}.pdf`);
    fd.append("category", category);
    check(`upload ${category}`, (await cand("/api/documents", { method: "POST", form: fd })).status === 200);
  }
  const bad = new FormData();
  bad.append("file", new Blob(["#!/bin/sh"], { type: "application/x-sh" }), "evil.sh");
  bad.append("category", "other");
  check("reject disallowed file type (415)", (await cand("/api/documents", { method: "POST", form: bad })).status === 415);

  check("missing required answer rejected", (await cand("/api/applications", { method: "POST", body: { jobId: 1, answers: { relocate: "Yes" } } })).status === 422);
  const applied = await cand("/api/applications", { method: "POST", body: { jobId: 1, answers, coverNote: "hello" } });
  check("apply succeeds", applied.status === 200, JSON.stringify(applied.data));
  const appId = applied.data.id;
  check("duplicate application rejected", (await cand("/api/applications", { method: "POST", body: { jobId: 1, answers } })).status === 409);
  await page(cand, `/candidate/applications/${appId}`);
  check("candidate can edit answers while 'applied'", (await cand(`/api/applications/${appId}`, { method: "PATCH", body: { action: "answers", answers: { ...answers, why: "Edited" } } })).status === 200);

  // ------------------------------------------------------------- permissions
  console.log("\nPermissions");
  check("candidate can't move stages (403)", (await cand(`/api/applications/${appId}/stage`, { method: "POST", body: { to: "shortlisted" } })).status === 403);
  check("candidate can't create jobs (403)", (await cand("/api/jobs", { method: "POST", body: {} })).status === 403);
  check("candidate can't read others' documents (404)", (await cand("/api/documents/1")).status === 404);
  check("candidate can't open other applications (404 page)", (await cand("/candidate/applications/1")).status === 404);
  check("candidate redirected away from recruiter area", [302, 303, 307].includes((await cand("/recruiter")).status));
  check("recruiter can read candidate documents", (await rec("/api/documents/1")).status === 200);

  // -------------------------------------------------------------- workflow
  console.log("\nRecruiter workflow");
  await page(rec, `/recruiter/applications/${appId}`);
  check("invalid transition applied → interview rejected (409)", (await rec(`/api/applications/${appId}/stage`, { method: "POST", body: { to: "interview" } })).status === 409);
  check("start review", (await rec(`/api/applications/${appId}/stage`, { method: "POST", body: { to: "under_review" } })).status === 200);
  check("answers locked after review starts (409)", (await cand(`/api/applications/${appId}`, { method: "PATCH", body: { action: "answers", answers } })).status === 409);
  check(
    "save scorecard",
    (await rec(`/api/applications/${appId}/evaluation`, { method: "POST", body: { scores: { technical: 4, experience: 3, projects: 4, education: 3, communication: 4, culture: 4 }, recommendation: "yes", comments: "ok" } })).status === 200
  );
  check("scorecard without recommendation rejected", (await rec(`/api/applications/${appId}/evaluation`, { method: "POST", body: { scores: { technical: 4 } } })).status === 400);
  check("add note", (await rec(`/api/applications/${appId}/notes`, { method: "POST", body: { body: "Looks good" } })).status === 200);
  check("request info", (await rec(`/api/applications/${appId}/info-requests`, { method: "POST", body: { question: "Earliest joining date?" } })).status === 200);
  const detail = await cand(`/candidate/applications/${appId}`);
  check("candidate sees info request", typeof detail.data === "string" && detail.data.includes("Earliest joining date?"));
  check("candidate cannot see private notes", typeof detail.data === "string" && !detail.data.includes("Looks good"));
  // The request id is passed to a client component, so it's in the serialised RSC props (possibly JSON-escaped).
  const irId = Number((detail.data.match(/\\"id\\":(\d+),\\"question\\":\\"Earliest joining date/) || [])[1]) || null;
  check("found info request id in page", !!irId);
  if (irId) check("candidate replies", (await cand(`/api/info-requests/${irId}`, { method: "POST", body: { response: "Next month" } })).status === 200);
  check("shortlist", (await rec(`/api/applications/${appId}/stage`, { method: "POST", body: { to: "shortlisted", message: "Well done" } })).status === 200);
  check(
    "send assessment",
    (await rec(`/api/applications/${appId}/stage`, { method: "POST", body: { to: "assessment", assessment: { title: "Take-home", link: "https://x.dev", due: "2030-01-01" } } })).status === 200
  );
  check("record assessment result", (await rec(`/api/applications/${appId}`, { method: "PATCH", body: { action: "details", assessment: { title: "Take-home", score: "80", result: "pass" } } })).status === 200);
  check("move to interview", (await rec(`/api/applications/${appId}/stage`, { method: "POST", body: { to: "interview", interview: { when: "2030-01-05T10:00", mode: "Video call" } } })).status === 200);
  const cn = await cand("/candidate/notifications");
  check("candidate got status notifications", typeof cn.data === "string" && cn.data.includes("Status update"));
  check("bulk move reports skipped rows", (await rec("/api/applications/bulk", { method: "POST", body: { ids: [appId], to: "shortlisted" } })).data?.skipped?.length === 1);
  check("candidate withdraws", (await cand(`/api/applications/${appId}`, { method: "PATCH", body: { action: "withdraw", reason: "smoke test" } })).status === 200);
  check("no moves after withdrawal (409)", (await rec(`/api/applications/${appId}/stage`, { method: "POST", body: { to: "offer" } })).status === 409);

  console.log("\nJobs");
  const job = await rec("/api/jobs", {
    method: "POST",
    body: { title: "Smoke Job", location: "Remote", description: "Test", required_skills: ["Go"], questions: [{ text: "Years of Go?", type: "number", required: true, knockout: { op: "gte", value: "2" } }] },
  });
  check("create job", job.status === 200);
  check("job validation (no skills) rejected", (await rec("/api/jobs", { method: "POST", body: { title: "x", location: "y", description: "z", required_skills: [] } })).status === 400);
  check("close job", (await rec(`/api/jobs/${job.data.id}`, { method: "PUT", body: { title: "Smoke Job", location: "Remote", description: "Test", required_skills: ["Go"], status: "closed" } })).status === 200);
  check("closed job rejects applications", (await cand("/api/applications", { method: "POST", body: { jobId: job.data.id, answers: {} } })).status === 409);

  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
