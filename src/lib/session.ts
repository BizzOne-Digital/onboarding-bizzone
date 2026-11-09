// Edge-safe token helpers (used by middleware and server routes).
import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "bz_auth";
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "");

export async function createSession(): Promise<string> {
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is not set");
  return new SignJWT({ role: "team" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token || !process.env.SESSION_SECRET) return false;
  try { await jwtVerify(token, secret()); return true; } catch { return false; }
}
