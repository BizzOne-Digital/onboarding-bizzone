import { cookies } from "next/headers";
import { COOKIE, verifyToken } from "./session";

export { COOKIE, createSession, verifyToken } from "./session";

export async function isAuthed(): Promise<boolean> {
  const c = await cookies();
  return verifyToken(c.get(COOKIE)?.value);
}
