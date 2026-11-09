import { NextResponse } from "next/server";
import { ObjectId, type Filter, type Document } from "mongodb";
import { submissions } from "@/lib/mongodb";
import { isAuthed } from "@/lib/auth";
import { PACKAGES, TEAM } from "@/lib/config";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const STATUSES = ["new", "in_progress", "done", "on_hold"];
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// One-time style backfill: safe to run on every GET (only touches docs missing the fields).
async function backfill() {
  const col = await submissions();
  const missing = await col.find({ target_month: { $exists: false } }, { projection: { created_at: 1 } }).toArray();
  for (const d of missing) {
    const m = String(d.created_at || new Date().toISOString()).slice(0, 7);
    await col.updateOne({ _id: d._id, target_month: { $exists: false } }, { $set: { target_month: m } });
  }
  const conn = await col.find({ domain_connected: true, domain_connected_at: { $in: [null, undefined] } }, { projection: { created_at: 1 } }).toArray();
  for (const d of conn) await col.updateOne({ _id: d._id }, { $set: { domain_connected_at: d.created_at } });
}

export async function GET(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const u = new URL(req.url);
  const view = u.searchParams.get("view") || "all"; // all | month | domain | closed
  const month = u.searchParams.get("month") || "";
  const member = u.searchParams.get("member") || "";
  const search = (u.searchParams.get("search") || "").trim().slice(0, 100);

  try { await backfill(); } catch (e) { console.error("backfill failed", e); }

  // Independent filters layered as separate $and clauses.
  const and: Filter<Document>[] = [];
  if (member) and.push({ assigned_to: member });
  if (view === "month" && MONTH.test(month)) and.push({ target_month: month });
  if (view === "domain") {
    and.push({ domain_connected: true });
    if (MONTH.test(month)) and.push({ domain_connected_at: { $regex: "^" + month } });
  }
  if (view === "closed") and.push({ project_closed: true });
  if (search) {
    const re = { $regex: escapeRe(search), $options: "i" };
    and.push({ $or: [{ business: re }, { name: re }, { email: re }, { phone: re }, { business_type: re }, { domain_name: re }, { domain_wanted: re }] });
  }

  const rows = await (await submissions())
    .find(and.length ? { $and: and } : {})
    .sort({ target_month: -1, created_at: -1 })
    .limit(1000)
    .toArray();
  return NextResponse.json({ submissions: rows.map((r) => ({ ...r, _id: r._id.toString() })) });
}

export async function PATCH(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const b = await req.json().catch(() => ({}));
  if (!b.id || !ObjectId.isValid(b.id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const _id = new ObjectId(b.id);
  const col = await submissions();
  const current = await col.findOne({ _id });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const set: Record<string, unknown> = {};
  if ("status" in b) { if (!STATUSES.includes(b.status)) return NextResponse.json({ error: "Bad status" }, { status: 400 }); set.status = b.status; }
  if ("assigned_to" in b) { if (b.assigned_to !== "" && !TEAM.includes(b.assigned_to)) return NextResponse.json({ error: "Unknown team member" }, { status: 400 }); set.assigned_to = b.assigned_to; }
  if ("package" in b) { if (!PACKAGES.includes(b.package)) return NextResponse.json({ error: "Unknown package" }, { status: 400 }); set.package = b.package; }
  if ("internal_notes" in b) set.internal_notes = String(b.internal_notes || "").slice(0, 5000);
  if ("target_month" in b) { if (!MONTH.test(b.target_month)) return NextResponse.json({ error: "Bad month" }, { status: 400 }); set.target_month = b.target_month; }
  if ("project_closed" in b) set.project_closed = !!b.project_closed;
  if ("domain_connected" in b) {
    const on = !!b.domain_connected;
    set.domain_connected = on;
    // Server-stamped on false -> true only; cleared when unset.
    if (on && !current.domain_connected) set.domain_connected_at = new Date().toISOString();
    if (!on) set.domain_connected_at = null;
  }
  if (!Object.keys(set).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  set.updated_at = new Date().toISOString();

  await col.updateOne({ _id }, { $set: set });
  const doc = await col.findOne({ _id });
  return NextResponse.json({ submission: doc ? { ...doc, _id: doc._id.toString() } : null });
}

export async function DELETE(req: Request) {
  if (!(await isAuthed())) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  await (await submissions()).deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ ok: true });
}
