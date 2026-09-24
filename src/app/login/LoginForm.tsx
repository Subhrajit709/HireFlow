"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/components/client";

export function LoginForm({ next, as }: { next?: string; as?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(as === "recruiter" ? "recruiter@demo.com" : "");
  const [password, setPassword] = useState(as === "recruiter" ? "Recruiter@123" : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api<{ role: string }>("/api/auth/login", "POST", { email, password });
      const home = r.role === "recruiter" ? "/recruiter" : "/candidate";
      router.push(next && next.startsWith(home) ? next : home);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  const fill = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <form onSubmit={submit} className="stack mt">
      <label className="field">
        Email
        <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        Password
        <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <div className="alert red">{error}</div>}
      <button className="btn primary block" disabled={busy}>
        {busy ? "Signing in…" : "Log in"}
      </button>
      <div className="alert bg-soft small">
        <b>Demo accounts</b>
        <div className="row" style={{ marginTop: 8 }}>
          <button type="button" className="btn xs" onClick={() => fill("recruiter@demo.com", "Recruiter@123")}>
            Fill recruiter
          </button>
          <button type="button" className="btn xs" onClick={() => fill("candidate@demo.com", "Candidate@123")}>
            Fill candidate
          </button>
        </div>
      </div>
    </form>
  );
}
