import { NextResponse } from "next/server";
import { formLogs, submissions } from "@/lib/mongodb";
import { businessType, FEATURES, PLANS, type PlanKey } from "@/lib/config";

// Normalise free text: trim, cap length, "—" when empty.
const v = (x: unknown, max = 3000) => {
  const s = typeof x === "string" ? x.trim().slice(0, max) : "";
  return s || "—";
};
const list = (x: unknown, max = 40) =>
  Array.isArray(x) ? x.filter((i) => typeof i === "string").map((i: string) => i.trim().slice(0, 80)).filter(Boolean).slice(0, max) : [];

export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const plan = String(b.plan || "") as PlanKey;
  const bt = businessType(String(b.businessType || ""));
  const email = String(b.email || "").trim();
  const problems: string[] = [];
  if (!PLANS[plan]) problems.push("plan");
  if (!String(b.bizName || "").trim()) problems.push("business name");
  if (!String(b.contact || "").trim()) problems.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("email");
  if (!bt) problems.push("business type");

  const pages = [...list(b.pages), ...list(b.customPages)];
  if (PLANS[plan] && pages.length > PLANS[plan].pages) problems.push("too many pages for plan");

  const logBase = { created_at: new Date().toISOString(), name: v(b.contact, 120), business: v(b.bizName, 160), email: v(email, 160), phone: v(b.phone, 40) };

  if (problems.length || !bt) {
    const reason = "Server validation: " + problems.join(", ");
    try { await (await formLogs()).insertOne({ ...logBase, status: "failed", reason }); } catch {}
    return NextResponse.json({ error: "Some answers are missing. Please check: " + problems.join(", ") + "." }, { status: 400 });
  }

  // Business-type details: keep only the questions that belong to the chosen type, keyed by label.
  const rawDetails = (b.details && typeof b.details === "object" ? b.details : {}) as Record<string, unknown>;
  const details: Record<string, string> = {};
  bt.fields.forEach((f) => {
    const val = rawDetails[f.id];
    details[f.label] = Array.isArray(val) ? list(val).join(", ") || "—" : v(val, 1500);
  });

  const now = new Date();
  const doc = {
    created_at: now.toISOString(),
    business: v(b.bizName, 160),
    name: v(b.contact, 120),
    email: v(email, 160),
    phone: v(b.phone, 40),
    site: v(b.website, 300),
    business_type: bt.label,
    business_type_id: bt.id,
    business_type_other: bt.id === "other" ? v(b.businessTypeOther, 80) : "—",
    goal: v(b.goal, 80),
    package: `${PLANS[plan].name} ($${PLANS[plan].price})`,
    pages,
    features: FEATURES.filter((f) => list(b.features).includes(f.id)).map((f) => f.title),
    languages: v(b.languages, 40),
    headline: v(b.headline, 300),
    about: v(b.about),
    services_list: v(b.services),
    pricing_display: v(b.priceDisplay, 20),
    pricing_details: v(b.priceList),
    type_details: details,
    notes: v(b.notes),
    domain_status: v(b.domainStatus, 20),
    domain_name: v(b.domainName, 200),
    domain_registrar: v(b.registrar, 80),
    domain_account: v(b.domainAccount, 200),
    domain_buyer: v(b.domainBuyer, 20),
    domain_wanted: v(b.domainWanted, 200),
    domain_backups: v(b.domainBackups, 300),
    style: v(b.style, 80),
    logo: v(b.logo, 20),
    logo_paid: v(b.logoPaid, 10),
    inspo: v(b.inspo, 500),
    colors: v(b.colors, 200),
    // Team-editable fields (see CLAUDE.md)
    status: "new",
    assigned_to: "",
    internal_notes: "",
    target_month: now.toISOString().slice(0, 7),
    domain_connected: false,
    domain_connected_at: null,
    project_closed: false,
  };

  try {
    const r = await (await submissions()).insertOne(doc);
    try { await (await formLogs()).insertOne({ ...logBase, status: "success", reason: "Submitted" }); } catch {}
    return NextResponse.json({ ok: true, id: r.insertedId.toString() });
  } catch (e) {
    console.error("lead insert failed", e);
    try { await (await formLogs()).insertOne({ ...logBase, status: "failed", reason: "Server error: database insert failed" }); } catch {}
    return NextResponse.json({ error: "We couldn’t save your form right now. Please try again in a minute." }, { status: 500 });
  }
}
