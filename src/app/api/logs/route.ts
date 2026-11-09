import { NextResponse } from "next/server";
import { formLogs } from "@/lib/mongodb";
import { isAuthed } from "@/lib/auth";

const s = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "") || "—";

// Public: the form logs failed attempts (validation / network) here.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  try {
    await (await formLogs()).insertOne({
      created_at: new Date().toISOString(),
      status: b.status === "success" ? "success" : "failed",
      reason: s(b.reason, 300), name: s(b.name, 120), business: s(b.business, 160), email: s(b.email, 160), phone: s(b.phone, 40),
    });
  } catch {}
  return NextResponse.json({ ok: true });
}

// Team only.
export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await (await formLogs()).find({}).sort({ created_at: -1 }).limit(300).toArray();
  return NextResponse.json({ logs: rows.map((r) => ({ ...r, _id: r._id.toString() })) });
}
