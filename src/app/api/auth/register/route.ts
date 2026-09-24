import { createSession, handle, hashPassword, HttpError, readJson } from "@/lib/auth";
import { json, one, q } from "@/lib/db";
import { notify } from "@/lib/data";
import { emptyProfile } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const b = await readJson<{ name: string; email: string; password: string; role?: string; inviteCode?: string }>(req);
  const name = (b.name || "").trim();
  const email = (b.email || "").trim().toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Please enter your name and a valid email.");
  if (!b.password || b.password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");

  const role = b.role === "recruiter" ? "recruiter" : "candidate";
  // Recruiter self-signup is gated by an invite code so candidates can't grant themselves recruiter access.
  if (role === "recruiter" && (b.inviteCode || "").trim() !== (process.env.RECRUITER_INVITE_CODE || "HIRE2026")) {
    throw new HttpError(403, "Invalid recruiter invite code.");
  }
  if (await one(`select 1 from users where lower(email) = $1`, [email])) throw new HttpError(409, "An account with this email already exists.");

  const u = await one<{ id: number }>(
    `insert into users (email, password_hash, name, role) values ($1, $2, $3, $4) returning id`,
    [email, await hashPassword(b.password), name, role]
  );
  if (role === "candidate") {
    await q(`insert into profiles (user_id, data) values ($1, $2::text::jsonb)`, [u!.id, json(emptyProfile(name))]);
    await notify(u!.id, "Welcome to HireFlow!", "Complete your profile to start applying. Fields marked * are required.", "/candidate/profile");
  }
  await createSession({ id: u!.id, email, name, role });
  return Response.json({ role });
});
