import { cookies } from "next/headers";
import {
  signSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  REMEMBER_COOKIE_NAME,
  type SessionPayload,
} from "@/lib/auth/token";

export type { SessionPayload } from "@/lib/auth/token";
export { SESSION_COOKIE_NAME, REMEMBER_COOKIE_NAME } from "@/lib/auth/token";

const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Create a signed session JWT and set it as an HTTP-only cookie.
 * When `remember` is true, the cookie persists for 30 days; otherwise 24h.
 */
export async function createSession(
  payload: SessionPayload,
  remember: boolean = false,
): Promise<void> {
  const token = await signSessionToken(payload, remember);
  const cookieStore = await cookies();
  const maxAge = remember ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  if (remember) {
    cookieStore.set(REMEMBER_COOKIE_NAME, "1", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  } else {
    cookieStore.delete(REMEMBER_COOKIE_NAME);
  }
}

/** Verify the session cookie and return the payload, or null if invalid. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Destroy the session by clearing the session cookies. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(REMEMBER_COOKIE_NAME);
}
