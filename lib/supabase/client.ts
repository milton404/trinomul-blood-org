// Server-only module - do not import from client components.
// Supabase is used as managed PostgreSQL. We connect directly with the `pg`
// driver (raw SQL) because the app uses custom JWT auth — NOT Supabase Auth —
// so RLS/`auth.uid()` do not apply. Keep this module out of client bundles.
import { Pool, type PoolConfig, types } from "pg";
import { createLogger } from "@/lib/logging/logger";

const logger = createLogger("supabase");

// Force pg to return strings for all date/time types instead of JS Date objects.
// RSC server-action serialization can transmit Date objects, but client-side
// formatters (e.g. formatPostedAt) expect ISO strings and crash on .replace().
const pgStringParser = (val: string) => val;
types.setTypeParser(types.builtins.TIMESTAMPTZ, pgStringParser);
types.setTypeParser(types.builtins.TIMESTAMP, pgStringParser);
types.setTypeParser(types.builtins.DATE, pgStringParser);
types.setTypeParser(types.builtins.TIME, pgStringParser);

// Connection string for Supabase Postgres. For serverless/multi-instance use
// the "Session pooler" (PgBouncer, port 6543) string from:
//   Supabase Dashboard -> Settings -> Database -> Connection string -> Session pooler
// Example:
//   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  "";

let pool: Pool | null = null;

function buildPoolConfig(): PoolConfig {
  return {
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  };
}

/**
 * Lazily-created, process-wide connection pool shared by all server actions
 * and API routes. Returns null when DATABASE_URL is not configured (in which
 * case the app still runs against SQLite in development).
 */
export function getPgPool(): Pool | null {
  if (pool) {
    return pool;
  }

  if (!connectionString) {
    return null;
  }

  pool = new Pool(buildPoolConfig());

  pool.on("error", (err) => {
    logger.error("Unexpected error on idle PostgreSQL client", { error: err.message });
  });

  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number | null }> {
  const db = getPgPool();
  if (!db) {
    throw new Error("DATABASE_URL is not configured");
  }
  const result = await db.query(text, params);
  return { rows: result.rows, rowCount: result.rowCount };
}

export function isSupabaseAvailable(): boolean {
  return Boolean(connectionString);
}

export function validateSupabaseConfig(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!connectionString) {
    errors.push("DATABASE_URL is not set");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
}> {
  const db = getPgPool();

  if (!db) {
    return {
      connected: false,
      error: "DATABASE_URL is not configured",
    };
  }

  try {
    await db.query("SELECT 1");
    return { connected: true };
  } catch (err) {
    logger.logError(err instanceof Error ? err : new Error(String(err)));
    return {
      connected: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export type SupabaseClient = Pool | null;
export type SupabaseAdminClient = Pool | null;