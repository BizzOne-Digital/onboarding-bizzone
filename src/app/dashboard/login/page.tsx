"use client";

import { useState } from "react";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    setBusy(false);
    if (r.ok) window.location.href = "/dashboard";
    else setErr("Wrong password. Please try again.");
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" />
          <div><b>BizzOne Digital</b><span>Team dashboard</span></div>
        </div>
        <div className="field">
          <label htmlFor="pw">Dashboard password</label>
          <input type="password" id="pw" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" aria-invalid={err ? true : undefined} />
          <p className="error" role="alert">{err}</p>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !pw} style={{ width: "100%", justifyContent: "center", marginLeft: 0 }}>
          {busy ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
