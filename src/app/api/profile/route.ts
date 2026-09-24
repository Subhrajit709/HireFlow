import { apiUser, handle, readJson } from "@/lib/auth";
import { getProfile, saveProfile } from "@/lib/data";
import { normalizeProfile } from "@/lib/types";

/** Trim strings, cap lengths and list sizes so a client can't store arbitrary blobs. */
function sanitize(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.slice(0, 3000);
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "boolean" || v === null) return v;
  if (Array.isArray(v)) return depth > 3 ? [] : v.slice(0, 40).map((x) => sanitize(x, depth + 1));
  if (typeof v === "object" && v) {
    if (depth > 3) return {};
    return Object.fromEntries(Object.entries(v).slice(0, 40).map(([k, x]) => [k.slice(0, 40), sanitize(x, depth + 1)]));
  }
  return null;
}

export const GET = handle(async () => {
  const user = await apiUser("candidate");
  return Response.json(await getProfile(user.id));
});

export const PUT = handle(async (req: Request) => {
  const user = await apiUser("candidate");
  const body = await readJson(req);
  const profile = normalizeProfile(sanitize(body), user.name);
  profile.skills = profile.skills.map((s) => ({ ...s, level: Math.min(4, Math.max(1, Number(s.level) || 1)), years: Math.max(0, Number(s.years) || 0) }));
  await saveProfile(user.id, profile);
  return Response.json({ ok: true });
});
