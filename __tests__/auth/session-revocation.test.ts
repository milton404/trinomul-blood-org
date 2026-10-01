import { describe, it, expect, vi } from "vitest";
import {
  createSessionRecord,
  revokeSession,
  isSessionRevoked,
} from "@/lib/auth/session-store";
import { getDb } from "@/lib/db";

// Ensure initTables has run so auth_sessions exists in the SQLite file.
getDb();

// Mock jose to avoid a Uint8Array type mismatch in the vitest/jsdom environment.
// We test our wrapper logic (jti generation, payload shape) without hitting jose's
// internal key-type validation.
vi.mock("jose", () => {
  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const decode = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString());

  return {
    SignJWT: class {
      private payload: any = {};
      constructor(p: any) { this.payload = { ...p }; }
      setProtectedHeader() { return this; }
      setIssuedAt() { return this; }
      setExpirationTime() { return this; }
      async sign() { return `mock.${encode(this.payload)}.sig`; }
    },
    jwtVerify: async (token: string) => {
      const parts = token.split(".");
      if (parts.length !== 3 || parts[0] !== "mock") throw new Error("invalid");
      return { payload: decode(parts[1]) };
    },
  };
});

const { signSessionToken, verifySessionToken } = await import("@/lib/auth/token");

describe("signSessionToken / verifySessionToken", () => {
  it("generates a jti and round-trips through sign → verify", async () => {
    const token = await signSessionToken({
      sub: "42",
      email: "donor@example.com",
      role: "donor",
    });

    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe("42");
    expect(payload!.email).toBe("donor@example.com");
    expect(payload!.role).toBe("donor");
    expect(payload!.jti).toBeTruthy();
    expect(payload!.jti.length).toBeGreaterThan(8);
  });

  it("preserves a caller-supplied jti", async () => {
    const token = await signSessionToken({
      sub: "1",
      email: "admin@trinomul.com",
      role: "admin",
      jti: "my-fixed-jti-123",
    });

    const payload = await verifySessionToken(token);
    expect(payload!.jti).toBe("my-fixed-jti-123");
  });

  it("returns null for a tampered token", async () => {
    const token = await signSessionToken({
      sub: "1",
      email: "a@b.com",
      role: "donor",
    });
    const tampered = token.slice(0, -4) + "XXXX";
    expect(await verifySessionToken(tampered)).toBeNull();
  });
});

describe("session-store denylist semantics", () => {
  const JTI = `test-jti-${Date.now()}`;
  const USER_ID = 999999;

  it("isSessionRevoked returns false for an unknown jti (not locked out)", async () => {
    expect(await isSessionRevoked("never-created-jti")).toBe(false);
  });

  it("createSessionRecord then isSessionRevoked is still false (not revoked yet)", async () => {
    await createSessionRecord(JTI, USER_ID, 3600);
    expect(await isSessionRevoked(JTI)).toBe(false);
  });

  it("revokeSession flips isSessionRevoked to true", async () => {
    await revokeSession(JTI);
    expect(await isSessionRevoked(JTI)).toBe(true);
  });

  it("revoking an already-revoked jti is idempotent", async () => {
    await revokeSession(JTI);
    expect(await isSessionRevoked(JTI)).toBe(true);
  });
});