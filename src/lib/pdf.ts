/** Minimal single-page text PDF generator (used only to create demo documents in the seed). */
export function makePdf(lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/[^\x20-\x7E]/g, "-").replace(/([\()])/g, "\$1");
  const wrapped = lines.flatMap((l) => {
    if (!l) return [""];
    const out: string[] = [];
    let cur = "";
    for (const w of l.split(" ")) {
      if ((cur + " " + w).trim().length > 90) {
        out.push(cur);
        cur = w;
      } else cur = (cur + " " + w).trim();
    }
    out.push(cur);
    return out;
  });
  const text = wrapped
    .slice(0, 55)
    .map((l, i) => `BT /F1 ${i === 0 ? 18 : 11} Tf 50 ${790 - i * 14 - (i > 0 ? 8 : 0)} Td (${esc(l)}) Tj ET`)
    .join("\n");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}
