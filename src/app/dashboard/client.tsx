"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PACKAGES, TEAM, packageBucket } from "@/lib/config";

type Sub = {
  _id: string; created_at: string; business: string; name: string; email: string; phone: string; site: string;
  business_type: string; business_type_other: string; goal: string; package: string; pages: string[]; features: string[];
  languages: string; headline: string; about: string; services_list: string; pricing_display: string; pricing_details: string;
  type_details: Record<string, string>; notes: string;
  domain_status: string; domain_name: string; domain_registrar: string; domain_account: string; domain_buyer: string;
  domain_wanted: string; domain_backups: string; style: string; logo: string; logo_paid: string; inspo: string; colors: string;
  status?: string; assigned_to?: string; internal_notes?: string; target_month?: string;
  domain_connected?: boolean; domain_connected_at?: string | null; project_closed?: boolean;
};

type View = "all" | "month" | "domain" | "closed";
type MemberTab = "month" | "domain" | "closed";

const STATUS_LABEL: Record<string, string> = { new: "New", in_progress: "In progress", done: "Done", on_hold: "On hold" };

const thisMonth = () => new Date().toISOString().slice(0, 7);
function shiftMonth(m: string, by: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}
function monthLabel(m: string) {
  if (!m) return "—";
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const typeLabel = (s: Sub) => (s.business_type === "Other" && s.business_type_other && s.business_type_other !== "—" ? s.business_type_other : s.business_type) || "—";

export default function DashboardClient() {
  const [view, setView] = useState<View>("month");
  const [member, setMember] = useState<string>("");
  const [memberTab, setMemberTab] = useState<MemberTab>("month");
  const [month, setMonth] = useState(thisMonth());
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Debounced search: input updates instantly, fetch-triggering state after 350ms.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const effView: View = member ? memberTab : view;
  const usesMonth = effView === "month" || effView === "domain";

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const q = new URLSearchParams({ view: effView, month, search });
    if (member) q.set("member", member);
    try {
      const r = await fetch("/api/submissions?" + q.toString(), { cache: "no-store" });
      if (r.status === 401) { window.location.href = "/dashboard/login"; return; }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load");
      setRows(j.submissions);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }, [effView, month, search, member]);
  useEffect(() => { load(); }, [load]);

  const patch = useCallback(async (id: string, body: Record<string, unknown>) => {
    const r = await fetch("/api/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Save failed");
    setRows((rs) => rs.map((x) => (x._id === id ? j.submission : x)));
    return j.submission as Sub;
  }, []);

  const remove = useCallback(async (id: string) => {
    const r = await fetch("/api/submissions?id=" + encodeURIComponent(id), { method: "DELETE" });
    if (!r.ok) throw new Error("Delete failed");
    setRows((rs) => rs.filter((x) => x._id !== id));
    setOpenId(null);
  }, []);

  const open = rows.find((r) => r._id === openId) || null;

  const stats = useMemo(() => ({
    total: rows.length,
    connected: rows.filter((r) => r.domain_connected).length,
    closed: rows.filter((r) => r.project_closed).length,
    unassigned: rows.filter((r) => !r.assigned_to).length,
  }), [rows]);

  const breakdown = useMemo(() => {
    if (!member) return [];
    const m: Record<string, { sites: number; connected: number }> = {};
    rows.forEach((r) => { const k = packageBucket(r.package); m[k] = m[k] || { sites: 0, connected: 0 }; m[k].sites++; if (r.domain_connected) m[k].connected++; });
    return ["Standard", "Premium", "Advanced", "Custom", "Other"].filter((k) => m[k]).map((k) => ({ k, ...m[k] }));
  }, [rows, member]);

  function exportCsv() {
    const cols: [string, (s: Sub) => string][] = [
      ["Submitted", (s) => s.created_at?.slice(0, 10)], ["Target month", (s) => s.target_month || ""], ["Business", (s) => s.business],
      ["Contact", (s) => s.name], ["Email", (s) => s.email], ["Phone", (s) => s.phone], ["Business type", typeLabel],
      ["Package", (s) => s.package], ["Pages", (s) => (s.pages || []).join("; ")], ["Assigned to", (s) => s.assigned_to || ""],
      ["Status", (s) => STATUS_LABEL[s.status || "new"]], ["Domain", (s) => (s.domain_name !== "—" ? s.domain_name : s.domain_wanted) || ""],
      ["Domain connected", (s) => (s.domain_connected ? "Yes" : "No")], ["Connected on", (s) => (s.domain_connected_at || "").slice(0, 10)],
      ["Closed", (s) => (s.project_closed ? "Yes" : "No")],
    ];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.map((c) => esc(c[0])).join(","), ...rows.map((r) => cols.map((c) => esc(c[1](r))).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `bizzone-report-${member ? member.replace(/\s+/g, "-").toLowerCase() + "-" : ""}${effView}${usesMonth ? "-" + month : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/dashboard/login";
  }

  const title = member
    ? `${member} · ${{ month: "All websites", domain: "Domain connected", closed: "Closed" }[memberTab]}`
    : { all: "All websites", month: "This month", domain: "Domain connected", closed: "Closed projects" }[view];

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" />
          <div><b>BizzOne Digital</b><span>Onboarding dashboard</span></div>
        </div>
        <nav className="dash-nav" aria-label="Views">
          <p className="dash-nav-h">Websites</p>
          {([["all", "All websites"], ["month", "This month"], ["domain", "Domain connected"], ["closed", "Closed projects"]] as [View, string][]).map(([k, t]) => (
            <button key={k} type="button" className={!member && view === k ? "on" : ""} onClick={() => { setMember(""); setView(k); setOpenId(null); }}>{t}</button>
          ))}
          <p className="dash-nav-h">Team</p>
          {TEAM.map((n) => (
            <button key={n} type="button" className={member === n ? "on" : ""} onClick={() => { setMember(n); setMemberTab("month"); setOpenId(null); }}>
              <span className="avatar">{n.split(" ").map((x) => x[0]).join("").slice(0, 2)}</span>{n}
            </button>
          ))}
          <p className="dash-nav-h">Other</p>
          <a href="/dashboard/logs">Form logs</a>
          <a href="/" target="_blank" rel="noopener">Open the form</a>
        </nav>
        <button type="button" className="dash-logout" onClick={logout}>Log out</button>
      </aside>

      <main className="dash-main">
        <header className="dash-head">
          <div>
            <p className="kicker">Dashboard</p>
            <h1>{title}</h1>
          </div>
          <div className="dash-tools">
            <input type="search" placeholder="Search business, name, email, phone…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search" />
            <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!rows.length}>Generate report</button>
          </div>
        </header>

        {member && (
          <div className="seg dash-subtabs">
            {([["month", "All websites"], ["domain", "Domain connected"], ["closed", "Closed"]] as [MemberTab, string][]).map(([k, t]) => (
              <label key={k}><input type="radio" name="mtab" checked={memberTab === k} onChange={() => setMemberTab(k)} /><span>{t}</span></label>
            ))}
          </div>
        )}

        {usesMonth && (
          <div className="dash-month">
            <button type="button" className="btn btn-ghost" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">‹</button>
            <b>{monthLabel(month)}</b>
            <button type="button" className="btn btn-ghost" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month">›</button>
            {month !== thisMonth() && <button type="button" className="edit" onClick={() => setMonth(thisMonth())}>Today</button>}
            {effView === "domain" && <span className="hint">By the month the domain went live</span>}
          </div>
        )}

        <div className="dash-stats">
          <div className="stat"><span>Websites</span><b>{stats.total}</b></div>
          <div className="stat"><span>Domain connected</span><b>{stats.connected}</b></div>
          <div className="stat"><span>Not connected</span><b className={stats.total - stats.connected > 0 ? "warn" : ""}>{stats.total - stats.connected}</b></div>
          {!member ? <div className="stat"><span>Unassigned</span><b className={stats.unassigned ? "warn" : ""}>{stats.unassigned}</b></div>
            : <div className="stat"><span>Closed</span><b>{stats.closed}</b></div>}
        </div>

        {member && breakdown.length > 0 && (
          <div className="card dash-breakdown">
            <p className="card-title">Package breakdown</p>
            <table className="dash-table small">
              <thead><tr><th>Package</th><th>Sites</th><th>Domain connected</th></tr></thead>
              <tbody>{breakdown.map((b) => <tr key={b.k}><td>{b.k}</td><td>{b.sites}</td><td>{b.connected}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {err && <p className="adjust">{err}</p>}

        <div className="card dash-list">
          {loading ? <p className="hint">Loading…</p> : rows.length === 0 ? <p className="hint">No websites here yet.</p> : (
            <div className="dash-scroll">
              <table className="dash-table">
                <thead>
                  <tr><th>Business</th><th>Type</th><th>Package</th><th>Pages</th><th>Assigned</th><th>Month</th><th>Domain</th><th>Submitted</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id} onClick={() => setOpenId(r._id)} className={openId === r._id ? "sel" : ""} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setOpenId(r._id); }}>
                      <td><b>{r.business}</b><small>{r.name}</small></td>
                      <td>{typeLabel(r)}</td>
                      <td>{packageBucket(r.package)}</td>
                      <td>{(r.pages || []).length}</td>
                      <td>{r.assigned_to || <span className="pill warn">Unassigned</span>}</td>
                      <td>{monthLabel(r.target_month || r.created_at?.slice(0, 7))}</td>
                      <td>
                        {r.domain_connected ? <span className="pill ok">Connected</span> : <span className="pill">Not yet</span>}
                        {r.project_closed && <span className="pill dark">Closed</span>}
                      </td>
                      <td>{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {open && <Detail key={open._id} s={open} patch={patch} remove={remove} close={() => setOpenId(null)} />}
    </div>
  );
}

function Detail({ s, patch, remove, close }: { s: Sub; patch: (id: string, b: Record<string, unknown>) => Promise<Sub>; remove: (id: string) => Promise<void>; close: () => void }) {
  // Batched fields (Save Changes). Toggles and month arrows are NOT part of this.
  const [assigned, setAssigned] = useState(s.assigned_to || "");
  const [pkg, setPkg] = useState(PACKAGES.includes(s.package) ? s.package : "");
  const [status, setStatus] = useState(s.status || "new");
  const [notes, setNotes] = useState(s.internal_notes || "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const dirty = assigned !== (s.assigned_to || "") || (pkg && pkg !== s.package) || status !== (s.status || "new") || notes !== (s.internal_notes || "");

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg("");
    try { await fn(); setMsg(ok); } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  const save = () => {
    const body: Record<string, unknown> = { assigned_to: assigned, status, internal_notes: notes };
    if (pkg) body.package = pkg;
    return run(() => patch(s._id, body), "Saved.");
  };
  const toggle = (field: "domain_connected" | "project_closed") => run(() => patch(s._id, { [field]: !s[field] }), "Saved.");
  const tm = s.target_month || s.created_at.slice(0, 7);
  const moveMonth = (by: number) => run(() => patch(s._id, { target_month: shiftMonth(tm, by) }), "Month moved.");

  const Row = ({ k, v }: { k: string; v?: string | null }) => (v && v !== "—" ? <div className="kv"><dt>{k}</dt><dd>{v}</dd></div> : null);

  return (
    <div className="dash-drawer" role="dialog" aria-label={`Details for ${s.business}`}>
      <div className="dash-drawer-in">
        <div className="dash-drawer-head">
          <div>
            <p className="kicker">{typeLabel(s)} · {packageBucket(s.package)}</p>
            <h2>{s.business}</h2>
            <p className="hint">Submitted {fmtDate(s.created_at)}</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={close} aria-label="Close">✕</button>
        </div>

        <div className="dash-toggles">
          <button type="button" className={"tgl" + (s.domain_connected ? " on" : "")} onClick={() => toggle("domain_connected")} disabled={busy}>
            <span className="mark-sq" />{s.domain_connected ? `Domain connected${s.domain_connected_at ? " · " + fmtDate(s.domain_connected_at) : ""}` : "Mark domain connected"}
          </button>
          <button type="button" className={"tgl dark" + (s.project_closed ? " on" : "")} onClick={() => toggle("project_closed")} disabled={busy}>
            <span className="mark-sq" />{s.project_closed ? "Project closed" : "Close project"}
          </button>
        </div>

        <div className="dash-month inline">
          <span className="hint">Target month</span>
          <button type="button" className="btn btn-ghost" onClick={() => moveMonth(-1)} disabled={busy} aria-label="Move to previous month">‹</button>
          <b>{monthLabel(tm)}</b>
          <button type="button" className="btn btn-ghost" onClick={() => moveMonth(1)} disabled={busy} aria-label="Move to next month">›</button>
        </div>

        <div className="grid">
          <div className="field">
            <label htmlFor="as">Assigned to</label>
            <select id="as" value={assigned} onChange={(e) => setAssigned(e.target.value)}>
              <option value="">Unassigned</option>
              {TEAM.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pk">Package</label>
            <select id="pk" value={pkg} onChange={(e) => setPkg(e.target.value)}>
              {!pkg && <option value="">{s.package}</option>}
              {PACKAGES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="st">Status</label>
            <select id="st" value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABEL).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="nt">Internal notes <span className="opt">(team only)</span></label>
            <textarea id="nt" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="dash-save">
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !dirty}>Save changes</button>
          <span className="hint" role="status">{msg}</span>
        </div>

        <section className="dash-sec">
          <h3>Contact</h3>
          <dl>
            <Row k="Name" v={s.name} /><Row k="Email" v={s.email} /><Row k="Phone" v={s.phone} /><Row k="Current site" v={s.site} />
          </dl>
          <div className="dash-quick">
            {s.phone && s.phone !== "—" && <a className="btn btn-ghost" href={`https://wa.me/${s.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">WhatsApp</a>}
            {s.email && s.email !== "—" && <a className="btn btn-ghost" href={`mailto:${s.email}`}>Email</a>}
          </div>
        </section>

        <section className="dash-sec">
          <h3>Project</h3>
          <dl>
            <Row k="Business type" v={typeLabel(s)} /><Row k="Goal" v={s.goal} /><Row k="Package (client chose)" v={s.package} />
            <Row k={`Pages (${(s.pages || []).length})`} v={(s.pages || []).join(", ")} /><Row k="Features" v={(s.features || []).join(", ")} />
            <Row k="Languages" v={s.languages} />
          </dl>
        </section>

        {s.type_details && Object.keys(s.type_details).length > 0 && (
          <section className="dash-sec">
            <h3>{typeLabel(s)} details</h3>
            <dl>{Object.entries(s.type_details).map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl>
          </section>
        )}

        <section className="dash-sec">
          <h3>Content</h3>
          <dl>
            <Row k="Headline" v={s.headline} /><Row k="About" v={s.about} /><Row k="Services / products" v={s.services_list} />
            <Row k="Prices" v={{ full: "Show full prices", from: "Starting-from prices", quote: "Quote requests" }[s.pricing_display] || s.pricing_display} />
            <Row k="Price list" v={s.pricing_details} /><Row k="Notes" v={s.notes} />
          </dl>
        </section>

        <section className="dash-sec">
          <h3>Domain</h3>
          <dl>
            <Row k="Status" v={{ own: "Owns a domain", need: "Needs a domain", unsure: "Not sure" }[s.domain_status] || s.domain_status} />
            <Row k="Domain" v={s.domain_name} /><Row k="Registrar" v={s.domain_registrar} /><Row k="Account" v={s.domain_account} />
            <Row k="Who buys" v={{ paid: "Already paid BizzOne", bizzone: "BizzOne buys ($30)", client: "Client buys" }[s.domain_buyer] || s.domain_buyer} />
            <Row k="Wanted" v={s.domain_wanted} /><Row k="Backups" v={s.domain_backups} />
          </dl>
        </section>

        <section className="dash-sec">
          <h3>Brand</h3>
          <dl>
            <Row k="Style" v={s.style} /><Row k="Logo" v={{ have: "Has a logo", update: "Needs a refresh", need: "Needs a logo" }[s.logo] || s.logo} />
            <Row k="Logo paid" v={s.logo_paid === "yes" ? "Yes" : s.logo_paid === "no" ? "No" : s.logo_paid} />
            <Row k="Colours" v={s.colors} /><Row k="Inspiration" v={s.inspo} />
          </dl>
        </section>

        <section className="dash-sec danger">
          {!confirmDel ? (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(true)}>Delete submission</button>
          ) : (
            <div className="dash-confirm">
              <span>Delete <b>{s.business}</b> permanently? This can’t be undone.</span>
              <button type="button" className="btn btn-danger" onClick={() => run(() => remove(s._id), "Deleted.")} disabled={busy}>Yes, delete</button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDel(false)}>Cancel</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
