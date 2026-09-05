import { getDb } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number; // epoch ms when the window resets
  lockedUntil: number | null; // epoch ms when a lockout expires, or null
}

/**
 * Server-side rate limiting backed by SQLite.
 *
 * Tracks attempts per `identifier` within a sliding `windowMs`. After
 * `maxAttempts` failures, the identifier is locked out for `lockoutMs`.
 *
 * Call `checkRateLimit` before an action to see if it is allowed, then
 * `recordFailedAttempt` when the action fails, or `clearRateLimit` on success.
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000,
  lockoutMs: number = 15 * 60 * 1000,
): RateLimitResult {
  const db = getDb();
  const now = Date.now();
  const row = db
    .prepare(
      "SELECT attempt_count, first_attempt_at, last_attempt_at, locked_until FROM auth_rate_limits WHERE identifier = ?",
    )
    .get(identifier) as
    | {
        attempt_count: number;
        first_attempt_at: number;
        last_attempt_at: number;
        locked_until: number | null;
      }
    | undefined;

  if (row?.locked_until && row.locked_until > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: row.locked_until,
      lockedUntil: row.locked_until,
    };
  }

  // Reset the window if it has elapsed.
  if (row && now - row.first_attempt_at > windowMs) {
    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: now + windowMs,
      lockedUntil: null,
    };
  }

  if (row && row.attempt_count >= maxAttempts) {
    const lockedUntil = now + lockoutMs;
    db.prepare(
      "UPDATE auth_rate_limits SET locked_until = ? WHERE identifier = ?",
    ).run(lockedUntil, identifier);
    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: lockedUntil,
      lockedUntil,
    };
  }

  const remaining = row ? maxAttempts - row.attempt_count : maxAttempts;
  return {
    allowed: true,
    remainingAttempts: remaining,
    resetTime: (row?.first_attempt_at ?? now) + windowMs,
    lockedUntil: null,
  };
}

/** Record a failed attempt. Returns the updated rate-limit state. */
export function recordFailedAttempt(
  identifier: string,
  windowMs: number = 15 * 60 * 1000,
): RateLimitResult {
  const db = getDb();
  const now = Date.now();
  const row = db
    .prepare(
      "SELECT attempt_count, first_attempt_at FROM auth_rate_limits WHERE identifier = ?",
    )
    .get(identifier) as
    | { attempt_count: number; first_attempt_at: number }
    | undefined;

  if (!row || now - row.first_attempt_at > windowMs) {
    db.prepare(
      `INSERT INTO auth_rate_limits (identifier, attempt_count, first_attempt_at, last_attempt_at, locked_until)
       VALUES (?, 1, ?, ?, NULL)
       ON CONFLICT(identifier) DO UPDATE SET
         attempt_count = 1,
         first_attempt_at = ?,
         last_attempt_at = ?,
         locked_until = NULL`,
    ).run(identifier, now, now, now, now);
  } else {
    db.prepare(
      `UPDATE auth_rate_limits
       SET attempt_count = attempt_count + 1, last_attempt_at = ?
       WHERE identifier = ?`,
    ).run(now, identifier);
  }
  return checkRateLimit(identifier);
}

/** Clear attempts for an identifier (call after a successful action). */
export function clearRateLimit(identifier: string): void {
  const db = getDb();
  db.prepare("DELETE FROM auth_rate_limits WHERE identifier = ?").run(
    identifier,
  );
}

/** Count a successful use against the same sliding window (volume limiting). */
export function incrementRateLimit(
  identifier: string,
  windowMs: number = 15 * 60 * 1000,
): RateLimitResult {
  return recordFailedAttempt(identifier, windowMs);
}
