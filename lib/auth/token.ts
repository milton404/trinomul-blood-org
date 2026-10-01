import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "bb_session";
export const REMEMBER_COOKIE_NAME = "bb_remember";

export interface SessionPayload {
  sub: string; // user id (string)
  email: string;
  role: string;
}

/** Session payload after signing: carries a unique `jti` used for revocation. */
export interface SignedSessionPayload extends SessionPayload {
  jti: string;
}

function newJti(): string {
  // Web Crypto API — available in both Node (≥19) and edge runtimes, so this
  // module stays bundler-safe for middleware (which only verifies, not signs).
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for any runtime lacking randomUUID (older Node).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET environment variable is required in production.",
      );
    }
    return new TextEncoder().encode(
      "dev-only-secret-change-me-trinomul-blood-bank",
    );
  }
  return new TextEncoder().encode(secret);
}

/** Sign a session payload into a JWT string. A `jti` is generated if the
 *  caller did not supply one. */
export async function signSessionToken(
  payload: SessionPayload & { jti?: string },
  remember: boolean = false,
): Promise<string> {
  const jti = payload.jti ?? newJti();
  return new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "24h")
    .sign(getAuthSecret());
}

/** Verify a raw JWT string. Returns the payload (with `jti`), or null if
 *  invalid/expired. */
export async function verifySessionToken(
  token: string,
): Promise<SignedSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: String(payload.role),
      jti: String(payload.jti ?? ""),
    };
  } catch {
    return null;
  }
}
