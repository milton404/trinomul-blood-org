import { getDb } from "@/lib/db";
import { isSupabaseAvailable, query as pgQuery } from "@/lib/supabase/client";

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number; // epoch ms when the window resets
  lockedUntil: number | null; // epoch ms when a lockout expires, or null
}

/**
 * Server-side rate limiting backed by SQLite (local) or PostgreSQL (Supabase).
 *
 * Tracks attempts per `identifier` within a sliding `windowMs`. After
 * `maxAttempts` failures, the identifier is locked out for `lockoutMs`.
 *
 * Call `checkRateLimit` before an action to see if it is allowed, then
 * `recordFailedAttempt` when the action fails, or `clearRateLimit` on success.
 *
 * All functions are async because the PostgreSQL path uses an async pool.
 */
export async function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000,
  lockoutMs: number = 15 * 60 * 1000,
): Promise<RateLimitResult> {
  const now = Date.now();

  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery<{
      attempt_count: number;
      first_attempt_at: number;
      last_attempt_at: number;
      locked_until: number | null;
    }>(
      "SELECT attempt_count, first_attempt_at, last_attempt_at, locked_until FROM auth_rate_limits WHERE identifier = $1",
      [identifier],
    );
    const row = rows[0];

    if (row?.locked_until && row.locked_until > now) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: row.locked_until,
        lockedUntil: row.locked_until,
      };
    }

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
      await pgQuery(
        "UPDATE auth_rate_limits SET locked_until = $1 WHERE identifier = $2",
        [lockedUntil, identifier],
      );
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

  const db = getDb();
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
export async function recordFailedAttempt(
  identifier: string,
  windowMs: number = 15 * 60 * 1000,
): Promise<RateLimitResult> {
  const now = Date.now();

  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery<
      { attempt_count: number; first_attempt_at: number } | undefined
    >(
      "SELECT attempt_count, first_attempt_at FROM auth_rate_limits WHERE identifier = $1",
      [identifier],
    );
    const row = rows[0];

    if (!row || now - row.first_attempt_at > windowMs) {
      await pgQuery(
        `INSERT INTO auth_rate_limits (identifier, attempt_count, first_attempt_at, last_attempt_at, locked_until)
         VALUES ($1, 1, $2, $3, NULL)
         ON CONFLICT (identifier) DO UPDATE SET
           attempt_count = 1,
           first_attempt_at = $2,
           last_attempt_at = $3,
           locked_until = NULL`,
        [identifier, now, now],
      );
    } else {
      await pgQuery(
        `UPDATE auth_rate_limits
         SET attempt_count = attempt_count + 1, last_attempt_at = $1
         WHERE identifier = $2`,
        [now, identifier],
      );
    }
    return checkRateLimit(identifier);
  }

  const db = getDb();
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
export async function clearRateLimit(identifier: string): Promise<void> {
  if (isSupabaseAvailable()) {
    await pgQuery("DELETE FROM auth_rate_limits WHERE identifier = $1", [
      identifier,
    ]);
    return;
  }
  const db = getDb();
  db.prepare("DELETE FROM auth_rate_limits WHERE identifier = ?").run(
    identifier,
  );
}

/** Count a successful use against the same sliding window (volume limiting). */
export async function incrementRateLimit(
  identifier: string,
  windowMs: number = 15 * 60 * 1000,
): Promise<RateLimitResult> {
  return recordFailedAttempt(identifier, windowMs);
}

/**
 * Reusable rate-limit guard for server actions and API route handlers.
 *
 * Builds a per-IP identifier prefixed with `prefix`, checks the sliding
 * window, and throws an Error with a human-readable wait message when
 * blocked. On success the caller MUST call `incrementRateLimit` with the
 * returned key after the protected operation completes.
 *
 * In development (NODE_ENV !== "production") the guard is skipped so
 * local testing is not throttled.
 *
 * @returns the rate-limit key to pass to `incrementRateLimit` later, or
 *          null when the guard was skipped (dev mode).
 */
export async function enforceRateLimit(
  prefix: string,
  maxAttempts: number,
  windowMs: number,
  lockoutMs: number,
): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") return null;

  let rateKey = `${prefix}:unknown`;
  try {
    const { getVisitorFingerprint } = await import("./visitor");
    const { ip } = await getVisitorFingerprint();
    rateKey = `${prefix}:${ip}`;
  } catch {
    // fall back to a shared bucket if fingerprinting is unavailable
  }

  const limit = await checkRateLimit(rateKey, maxAttempts, windowMs, lockoutMs);
  if (!limit.allowed) {
    const waitMin = Math.ceil(
      ((limit.lockedUntil ?? limit.resetTime) - Date.now()) / 60000,
    );
    throw new Error(
      `Too many requests. Please wait about ${waitMin} minute(s) and try again.`,
    );
  }
  return rateKey;
}
