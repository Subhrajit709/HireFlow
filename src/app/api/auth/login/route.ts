import { createSession, handle, HttpError, readJson, verifyPassword } from "@/lib/auth";
import { one } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const { email, password } = await readJson<{ email: string; password: string }>(req);
  if (!email || !password) throw new HttpError(400, "Email and password are required.");
  const u = await one<{ id: number; email: string; name: string; role: "candidate" | "recruiter"; password_hash: string }>(
    `select * from users where lower(email) = lower($1)`,
    [email.trim()]
  );
  if (!u || !(await verifyPassword(password, u.password_hash))) throw new HttpError(401, "Incorrect email or password.");
  await createSession({ id: u.id, email: u.email, name: u.name, role: u.role });
  return Response.json({ role: u.role });
});
