// Server-only session persistence/revocation store.
//
// Denylist semantics: a session is valid unless it has been *explicitly*
// revoked. Legacy tokens (no `jti`) and transient insert failures therefore
// never lock users out — only an explicit `revoked_at` invalidates a token.
import { getDb } from "@/lib/db";
import { isSupabaseAvailable, query as pgQuery } from "@/lib/supabase/client";

/** Persist a session so it can later be revoked by its `jti`. */
export async function createSessionRecord(
  jti: string,
  userId: number | string,
  maxAgeSeconds: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();

  if (isSupabaseAvailable()) {
    await pgQuery(
      `INSERT INTO auth_sessions (jti, user_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (jti) DO NOTHING`,
      [jti, userId, expiresAt],
    );
    return;
  }

  getDb()
    .prepare(
      `INSERT OR IGNORE INTO auth_sessions (jti, user_id, expires_at)
       VALUES (?, ?, ?)`,
    )
    .run(jti, userId, expiresAt);
}

/** Mark a session as revoked. Called on logout so a stolen token dies. */
export async function revokeSession(jti: string): Promise<void> {
  if (isSupabaseAvailable()) {
    await pgQuery(
      "UPDATE auth_sessions SET revoked_at = NOW() WHERE jti = $1",
      [jti],
    );
    return;
  }

  getDb()
    .prepare(
      "UPDATE auth_sessions SET revoked_at = datetime('now') WHERE jti = ?",
    )
    .run(jti);
}

/** True only when an explicit revocation record exists for this jti. */
export async function isSessionRevoked(jti: string): Promise<boolean> {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery<{ n: number }>(
      "SELECT 1 AS n FROM auth_sessions WHERE jti = $1 AND revoked_at IS NOT NULL LIMIT 1",
      [jti],
    );
    return rows.length > 0;
  }

  const row = getDb()
    .prepare(
      "SELECT 1 AS n FROM auth_sessions WHERE jti = ? AND revoked_at IS NOT NULL LIMIT 1",
    )
    .get(jti);
  return Boolean(row);
}