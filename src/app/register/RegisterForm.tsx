"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client";

export function RegisterForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "candidate", inviteCode: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ role: string }>("/api/auth/register", "POST", f);
      router.push(r.role === "recruiter" ? "/recruiter" : "/candidate/profile");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack mt">
      <div className="segmented">
        {["candidate", "recruiter"].map((r) => (
          <button type="button" key={r} className={f.role === r ? "on" : ""} onClick={() => setF({ ...f, role: r })}>
            {r === "candidate" ? "Candidate" : "Recruiter"}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="req">Full name</span>
        <input className="input" required value={f.name} onChange={set("name")} autoComplete="name" />
      </label>
      <label className="field">
        <span className="req">Email</span>
        <input className="input" type="email" required value={f.email} onChange={set("email")} autoComplete="email" />
      </label>
      <label className="field">
        <span className="req">Password</span>
        <input className="input" type="password" required minLength={8} value={f.password} onChange={set("password")} autoComplete="new-password" />
        <span className="hint">At least 8 characters.</span>
      </label>
      {f.role === "recruiter" && (
        <label className="field">
          <span className="req">Recruiter invite code</span>
          <input className="input" required value={f.inviteCode} onChange={set("inviteCode")} />
          <span className="hint">Recruiter accounts need a company invite code (demo code: HIRE2026).</span>
        </label>
      )}
      {error && <div className="alert red">{error}</div>}
      <button className="btn primary block" disabled={busy}>
        {busy ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}
