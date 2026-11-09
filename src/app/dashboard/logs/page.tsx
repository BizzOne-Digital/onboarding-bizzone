"use client";

import { useEffect, useState } from "react";

type Log = { _id: string; created_at: string; status: "success" | "failed"; reason: string; name: string; business: string; email: string; phone: string };

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState<"all" | "failed" | "success">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs", { cache: "no-store" })
      .then((r) => { if (r.status === 401) { window.location.href = "/dashboard/login"; return null; } return r.json(); })
      .then((j) => { if (j) setLogs(j.logs || []); })
      .finally(() => setLoading(false));
  }, []);

  const shown = logs.filter((l) => filter === "all" || l.status === filter);

  return (
    <main className="dash-main" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <header className="dash-head">
        <div>
          <p className="kicker"><a href="/dashboard">← Dashboard</a></p>
          <h1>Form logs</h1>
          <p className="lede">Every submit attempt, including the ones that failed and why.</p>
        </div>
      </header>
      <div className="seg dash-subtabs">
        {(["all", "failed", "success"] as const).map((k) => (
          <label key={k}><input type="radio" name="lf" checked={filter === k} onChange={() => setFilter(k)} /><span>{k === "all" ? "All" : k === "failed" ? "Failed" : "Success"}</span></label>
        ))}
      </div>
      <div className="card dash-list">
        {loading ? <p className="hint">Loading…</p> : shown.length === 0 ? <p className="hint">No logs yet.</p> : (
          <div className="dash-scroll">
            <table className="dash-table">
              <thead><tr><th>When</th><th>Result</th><th>Reason</th><th>Business</th><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l._id}>
                    <td>{new Date(l.created_at).toLocaleString()}</td>
                    <td><span className={"pill " + (l.status === "success" ? "ok" : "bad")}>{l.status === "success" ? "Success" : "Failed"}</span></td>
                    <td>{l.reason}</td><td>{l.business}</td><td>{l.name}</td><td>{l.email}</td><td>{l.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
