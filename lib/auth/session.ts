import { cookies, headers } from "next/headers";
import {
  signSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  REMEMBER_COOKIE_NAME,
  type SessionPayload,
  type SignedSessionPayload,
} from "@/lib/auth/token";
import { createLogger } from "@/lib/logging/logger";
import {
  createSessionRecord,
  revokeSession,
  isSessionRevoked,
} from "@/lib/auth/session-store";

export type { SessionPayload, SignedSessionPayload } from "@/lib/auth/token";
export { SESSION_COOKIE_NAME, REMEMBER_COOKIE_NAME } from "@/lib/auth/token";

const logger = createLogger("session");

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
  const jti = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const token = await signSessionToken({ ...payload, jti }, remember);
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
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
  } else {
    cookieStore.delete(REMEMBER_COOKIE_NAME);
  }

  // Persist the jti so the session can be revoked on logout. Best-effort:
  // a failed insert must never block login (session simply can't be revoked).
  try {
    await createSessionRecord(jti, payload.sub, maxAge);
  } catch (err) {
    logger.logError(err instanceof Error ? err : new Error(String(err)), { jti });
  }

  return token;
}

/**
 * Verify the session from either the HTTP-only cookie (web) or the
 * Authorization: Bearer header (mobile). Returns the payload, or null.
 * Enforces revocation: a token whose `jti` was marked revoked is rejected.
 */
export async function getSession(): Promise<SignedSessionPayload | null> {
  // 1. Try the session cookie (web browsers)
  const cookieStore = await cookies();
  let token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  // 2. Try the Authorization: Bearer header (mobile apps)
  if (!token) {
    const headerStore = await headers();
    const authHeader = headerStore.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  // Legacy tokens carry no jti — allow them through. Otherwise honour
  // explicit revocation (denylist semantics; see lib/auth/session-store.ts).
  if (payload.jti) {
    const revoked = await isSessionRevoked(payload.jti);
    if (revoked) {
      return null;
    }
  }

  return payload;
}

/** Destroy the session by revoking its token and clearing the cookies. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();

  // Revoke the current token before clearing it, so a stolen/old copy of the
  // same cookie becomes invalid immediately.
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) {
    const payload = await verifySessionToken(cookieToken);
    if (payload?.jti) {
      try {
        await revokeSession(payload.jti);
      } catch (err) {
        logger.logError(
          err instanceof Error ? err : new Error(String(err)),
          { jti: payload.jti },
        );
      }
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(REMEMBER_COOKIE_NAME);
}
