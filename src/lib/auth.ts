import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role, SessionUser } from "./types";

const COOKIE = "hf_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production" && !process.env.ALLOW_INSECURE_SECRET) {
    console.warn("[auth] AUTH_SECRET is not set — using an insecure fallback. Set it in your Vercel env vars.");
  }
  return new TextEncoder().encode(s || "hireflow-dev-secret-change-me-please-0123456789");
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ role: user.role, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: Number(payload.sub),
      role: payload.role as Role,
      name: String(payload.name),
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

/** For server components / layouts: redirect when not signed in with the right role. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const s = await getSession();
  if (!s) redirect(`/login?next=/${role}`);
  if (s.role !== role) redirect(s.role === "recruiter" ? "/recruiter" : "/candidate");
  return s;
}

/* ---------------------------------------------------------- API helpers */

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiUser(role?: Role): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Please sign in.");
  if (role && s.role !== role) throw new HttpError(403, "You don't have access to this action.");
  return s;
}

/** Wrap a route handler: converts thrown HttpErrors into JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function readJson<T = any>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid request body.");
  }
}
