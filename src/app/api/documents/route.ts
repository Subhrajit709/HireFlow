import { apiUser, handle, HttpError } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { DOC_CATEGORIES } from "@/lib/types";

const MAX = 4 * 1024 * 1024; // stays under Vercel's 4.5 MB serverless request limit
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const SINGLE = new Set(["resume", "marksheet_10", "marksheet_12"]);

export const POST = handle(async (req: Request) => {
  const user = await apiUser("candidate");
  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Expected a file upload.");
  });
  const file = form.get("file");
  const category = String(form.get("category") || "");
  const label = String(form.get("label") || "").slice(0, 120);
  if (!(file instanceof File)) throw new HttpError(400, "No file received.");
  if (!DOC_CATEGORIES.some((c) => c.key === category)) throw new HttpError(400, "Unknown document type.");
  if (file.size === 0) throw new HttpError(400, "The file is empty.");
  if (file.size > MAX) throw new HttpError(413, "Files must be 4 MB or smaller.");
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) throw new HttpError(415, "Please upload a PDF, image (JPG/PNG/WebP) or Word document.");

  const count = await one<{ n: number }>(`select count(*)::int as n from documents where user_id = $1`, [user.id]);
  if ((count?.n ?? 0) >= 25) throw new HttpError(400, "You can store up to 25 documents. Delete one first.");

  const data = Buffer.from(await file.arrayBuffer());
  // Resume / 10th / 12th keep only the latest version.
  if (SINGLE.has(category)) await q(`delete from documents where user_id = $1 and category = $2`, [user.id, category]);
  const row = await one<{ id: number }>(
    `insert into documents (user_id, category, label, filename, mime, size, data) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [user.id, category, label, file.name.slice(0, 180), mime, file.size, data]
  );
  return Response.json({ id: row!.id });
});
