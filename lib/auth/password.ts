import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";

const BCRYPT_ROUNDS = 10;

/** Hash a plaintext password using bcrypt. */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

/** Verify a plaintext password against a stored hash. */
export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  // If the stored value is not a bcrypt hash, it is a legacy plaintext
  // password — compare with a timing-safe equality so we don't leak info
  // about the stored value via response timing.
  if (!isBcryptHash(hash)) {
    const a = Buffer.from(plaintext);
    const b = Buffer.from(hash);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
  return bcrypt.compare(plaintext, hash);
}

/** Detect whether a stored password_hash is already a bcrypt hash. */
export function isBcryptHash(value: string): boolean {
  return (
    typeof value === "string" &&
    (value.startsWith("$2a$") ||
      value.startsWith("$2b$") ||
      value.startsWith("$2y$"))
  );
}
