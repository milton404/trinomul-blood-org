import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "bb_session";
export const REMEMBER_COOKIE_NAME = "bb_remember";

export interface SessionPayload {
  sub: string; // user id (string)
  email: string;
  role: string;
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

/** Sign a session payload into a JWT string. */
export async function signSessionToken(
  payload: SessionPayload,
  remember: boolean = false,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? "30d" : "24h")
    .sign(getAuthSecret());
}

/** Verify a raw JWT string. Returns the payload, or null if invalid/expired. */
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: String(payload.role),
    };
  } catch {
    return null;
  }
}
