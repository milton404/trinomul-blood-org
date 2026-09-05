import { createLogger } from "@/lib/logging/logger";
import { validateSupabaseConfig, isSupabaseAvailable } from "@/lib/supabase/client";

const logger = createLogger("migration-runner");

export type MigrationType = "sqlite" | "postgresql" | "auto";

export interface MigrationResult {
  database: "sqlite" | "postgresql";
  applied: string[];
  failed: { migration: string; error: string }[];
}

export function detectDatabaseType(): "sqlite" | "postgresql" {
  const configured = process.env.DATABASE_TYPE;

  if (configured === "postgresql") {
    logger.info("DATABASE_TYPE=postgresql, using PostgreSQL");
    return "postgresql";
  }

  if (configured === "sqlite") {
    logger.info("DATABASE_TYPE=sqlite, using SQLite");
    return "sqlite";
  }

  const config = validateSupabaseConfig();

  if (isSupabaseAvailable() && config.valid) {
    logger.info("PostgreSQL/Supabase detected, will run PostgreSQL migrations");
    return "postgresql";
  }

  logger.info("No Supabase config detected, using SQLite");
  return "sqlite";
}


export async function runAllMigrations(
  type: MigrationType = "auto",
): Promise<MigrationResult> {
  const dbType = type === "auto" ? detectDatabaseType() : type;

  logger.info("Starting migrations", { database: dbType });

  if (dbType === "postgresql") {
    try {
      const { runPgMigrations } = await import("./pg-migrations");
      const result = await runPgMigrations();
      return {
        database: "postgresql",
        applied: result.applied,
        failed: result.failed,
      };
    } catch (err) {
      logger.error("PostgreSQL migration failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  } else {
    try {
      const { runMigrations } = await import("./sqlite-migrations");
      const result = await runMigrations();
      return {
        database: "sqlite",
        applied: result.applied,
        failed: result.failed,
      };
    } catch (err) {
      logger.error("SQLite migration failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export async function getMigrationStatus(): Promise<{
  database: "sqlite" | "postgresql";
  total: number;
  applied: number;
  pending: number;
}> {
  const dbType = detectDatabaseType();

  if (dbType === "postgresql") {
    try {
      const { getPgMigrationStatus } = await import("./pg-migrations");
      const status = await getPgMigrationStatus();
      return {
        database: "postgresql",
        total: status.total,
        applied: status.applied,
        pending: status.pending.length,
      };
    } catch {
      return {
        database: "postgresql",
        total: 0,
        applied: 0,
        pending: 0,
      };
    }
  } else {
    const { getMigrationStatus } = await import("./sqlite-migrations");
    const status = await getMigrationStatus();
    return {
      database: "sqlite",
      total: status.total,
      applied: status.applied,
      pending: status.pending.length,
    };
  }
}

export async function runMigrationsOnStartup(): Promise<void> {
  const shouldRun = process.env.RUN_MIGRATIONS_ON_STARTUP !== "false";

  if (!shouldRun) {
    logger.info("Migrations on startup disabled (RUN_MIGRATIONS_ON_STARTUP=false)");
    return;
  }

  try {
    const result = await runAllMigrations();
    logger.info("Migrations completed on startup", {
      database: result.database,
      applied: result.applied.length,
      failed: result.failed.length,
    });
  } catch (err) {
    logger.error("Migrations failed on startup", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}