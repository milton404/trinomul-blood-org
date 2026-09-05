import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logging/logger";
import { getDb } from "@/lib/database";
import { validateSupabaseConfig, testSupabaseConnection, isSupabaseAvailable } from "@/lib/supabase/client";
import { checkRedisHealth, isRedisConnected, isRedisAvailable } from "@/lib/redis";
import { getMigrationStatus } from "@/lib/migrations";
import { runRequestLifecycleSweep, purgeOldArchivedRequests } from "@/lib/db";

const logger = createLogger("health");

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  logger.info("Health check started", { requestId });

  // Cron-driven maintenance: advance request lifecycle (auto-expire +
  // archive fulfilled) and hard-delete rows archived >48h ago. The sweep
  // also runs lazily on listing reads, but this guarantees progress even
  // when there is no traffic.
  let maintenance = { archived: 0, purged: 0 };
  try {
    const archived = runRequestLifecycleSweep();
    const purged = purgeOldArchivedRequests(48);
    if (archived || purged) {
      maintenance = { archived, purged };
      logger.info("Lifecycle maintenance", { archived, purged });
    }
  } catch (err) {
    logger.warn("Lifecycle maintenance failed", {
      error: err instanceof Error ? err.message : "Unknown",
    });
  }

  const checks: Record<
    string,
    { status: string; error?: string; latencyMs?: number; applied?: number; pending?: number }
  > = {};

  const dbStart = Date.now();
  const dbType = process.env.DATABASE_TYPE || "auto";

  try {
    if (isSupabaseAvailable() && (dbType === "postgresql" || validateSupabaseConfig().valid)) {
      const supabaseResult = await testSupabaseConnection();
      checks.database = {
        status: supabaseResult.connected ? "healthy" : "unhealthy",
        ...(supabaseResult.error && { error: supabaseResult.error }),
        latencyMs: Date.now() - dbStart,
      };
    } else {
      const db = getDb();
      db.prepare("SELECT 1").get();
      checks.database = {
        status: "healthy",
        latencyMs: Date.now() - dbStart,
      };
    }
  } catch (err) {
    checks.database = {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  const migrationStart = Date.now();
  try {
    const migrationStatus = await getMigrationStatus();
    checks.migrations = {
      status: migrationStatus.pending === 0 ? "healthy" : "pending",
      latencyMs: Date.now() - migrationStart,
      applied: migrationStatus.applied,
      pending: migrationStatus.pending,
    };
  } catch (err) {
    checks.migrations = {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  const redisStart = Date.now();
  try {
    if (isRedisAvailable() && isRedisConnected()) {
      const redisResult = await checkRedisHealth();
      checks.redis = {
        status: redisResult.connected ? "healthy" : "unhealthy",
        ...(redisResult.error && { error: redisResult.error }),
        latencyMs: Date.now() - redisStart,
      };
    } else if (isRedisAvailable()) {
      checks.redis = {
        status: "disconnected",
        latencyMs: Date.now() - redisStart,
      };
    } else {
      checks.redis = {
        status: "disabled",
        latencyMs: Date.now() - redisStart,
      };
    }
  } catch (err) {
    checks.redis = {
      status: "unhealthy",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  const envStart = Date.now();
  const requiredEnvVars = ["AUTH_SECRET"];
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

  checks.environment = {
    status: missingEnvVars.length === 0 ? "healthy" : "unhealthy",
    ...(missingEnvVars.length > 0 && {
      error: `Missing required env vars: ${missingEnvVars.join(", ")}`,
    }),
    latencyMs: Date.now() - envStart,
  };

  const allHealthy = Object.values(checks).every(
    (check) => check.status === "healthy" || check.status === "disabled",
  );

  const response = {
    status: allHealthy ? "healthy" : "unhealthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    database: isSupabaseAvailable() && (dbType === "postgresql" || validateSupabaseConfig().valid) ? "postgresql" : "sqlite",
    maintenance,
    checks,
    latencyMs: Date.now() - startTime,
    requestId,
  };

  logger.info("Health check completed", {
    requestId,
    status: response.status,
    latencyMs: response.latencyMs,
  });

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
  });
}
