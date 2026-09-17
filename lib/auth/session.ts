import { cookies, headers } from "next/headers";
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
 * Returns the signed JWT so mobile clients can store it locally.
 */
export async function createSession(
  payload: SessionPayload,
  remember: boolean = false,
): Promise<string> {
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

  return token;
}

/**
 * Verify the session from either the HTTP-only cookie (web) or the
 * Authorization: Bearer header (mobile). Returns the payload, or null.
 */
export async function getSession(): Promise<SessionPayload | null> {
  // 1. Try the session cookie (web browsers)
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) {
    const payload = await verifySessionToken(cookieToken);
    if (payload) return payload;
  }

  // 2. Try the Authorization: Bearer header (mobile apps)
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken) return verifySessionToken(bearerToken);
  }

  return null;
}

/** Destroy the session by clearing the session cookies. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(REMEMBER_COOKIE_NAME);
}
