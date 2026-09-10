import { readFile } from "node:fs/promises";
import path from "node:path";
import { createLogger } from "@/lib/logging/logger";
import { getPgPool, type SupabaseAdminClient } from "@/lib/supabase/client";

const logger = createLogger("pg-migrations");

export interface PgMigration {
  id: string;
  name: string;
  sql?: string;
  up?: (client: NonNullable<SupabaseAdminClient>) => Promise<void>;
  down?: (client: NonNullable<SupabaseAdminClient>) => Promise<void>;
}

const schemaFilePath = path.resolve(
  process.cwd(),
  "lib",
  "migrations",
  "pg-schema.sql",
);

const pgMigrations: PgMigration[] = [
  {
    id: "001_initial_schema",
    name: "Initial PostgreSQL schema (parity with SQLite)",
    up: async (client) => {
      const sql = await readFile(schemaFilePath, "utf8");
      await client.query(sql);
    },
  },
  {
    id: "002_social_stories_saves_push",
    name: "Add stories, social_post_saves, push_subscriptions tables",
    up: async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS stories (
          id BIGSERIAL PRIMARY KEY,
          author_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          image_url TEXT,
          content TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
        CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);

        CREATE TABLE IF NOT EXISTS social_post_saves (
          id BIGSERIAL PRIMARY KEY,
          post_id BIGINT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
          user_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (post_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_social_saves_post ON social_post_saves(post_id);

        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth_key TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    },
  },
  {
    id: "003_post_views_and_story_viewers",
    name: "Add social_posts.view_count and story_views table",
    up: async (client) => {
      await client.query(`
        ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

        CREATE TABLE IF NOT EXISTS story_views (
          id BIGSERIAL PRIMARY KEY,
          story_id BIGINT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
          viewer_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (story_id, viewer_id)
        );
        CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
      `);
    },
  },
  {
    id: "004_backfill_fulfilled_from_donations",
    name: "Backfill requests to fulfilled when donated units meet units_needed",
    up: async (client) => {
      await client.query(`
        UPDATE blood_requests br
        SET status = 'fulfilled',
            current_status = 'fulfilled',
            donor_id = d.donor_id,
            donated_at = COALESCE(br.donated_at, NOW()),
            fulfilled_at = COALESCE(br.fulfilled_at, NOW()),
            show_fulfilled_badge = 1,
            updated_at = NOW()
        FROM (
          SELECT request_id, MAX(donor_id) AS donor_id, SUM(COALESCE(units, 1)) AS total
          FROM donations
          GROUP BY request_id
        ) d
        WHERE br.id = d.request_id
          AND br.status = 'active'
          AND d.total >= COALESCE(br.units_needed, 1);
      `);
      await client.query(`
        INSERT INTO request_status_log (request_id, status, changed_by, note)
        SELECT br.id, 'fulfilled', 'backfill', 'Fulfilled from existing donations'
        FROM blood_requests br
        WHERE br.status = 'fulfilled'
          AND NOT EXISTS (
            SELECT 1 FROM request_status_log l
            WHERE l.request_id = br.id AND l.status = 'fulfilled'
          );
      `);
    },
  },
];

async function ensureTrackingTable(client: NonNullable<SupabaseAdminClient>): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      migration_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getPgAppliedMigrations(
  client: NonNullable<SupabaseAdminClient>,
): Promise<string[]> {
  await ensureTrackingTable(client);
  const { rows } = await client.query<{ migration_id: string }>(
    "SELECT migration_id FROM schema_migrations ORDER BY migration_id",
  );
  return rows.map((r) => r.migration_id);
}

async function markPgMigrationApplied(
  client: NonNullable<SupabaseAdminClient>,
  migration: PgMigration,
): Promise<void> {
  await client.query(
    "INSERT INTO schema_migrations (migration_id, name) VALUES ($1, $2) ON CONFLICT (migration_id) DO NOTHING",
    [migration.id, migration.name],
  );
}

export async function runPgMigrations(): Promise<{
  applied: string[];
  failed: { migration: string; error: string }[];
}> {
  const client = getPgPool();
  const applied: string[] = [];
  const failed: { migration: string; error: string }[] = [];

  if (!client) {
    failed.push({ migration: "connection", error: "DATABASE_URL is not configured" });
    return { applied, failed };
  }

  logger.info("Starting PostgreSQL migrations");

  const appliedMigrations = await getPgAppliedMigrations(client);

  for (const migration of pgMigrations) {
    if (appliedMigrations.includes(migration.id)) {
      continue;
    }

    logger.info(`Applying migration: ${migration.id} - ${migration.name}`);

    try {
      await migration.up?.(client);
      await markPgMigrationApplied(client, migration);
      applied.push(migration.id);
      logger.info(`Migration applied successfully: ${migration.id}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Migration failed: ${migration.id}`, { error: errorMsg });
      failed.push({ migration: migration.id, error: errorMsg });
      break;
    }
  }

  logger.info("PostgreSQL migration run complete", {
    applied: applied.length,
    failed: failed.length,
  });

  return { applied, failed };
}

export async function getPgPendingMigrations(): Promise<PgMigration[]> {
  const client = getPgPool();
  if (!client) {
    return pgMigrations;
  }
  const appliedMigrations = await getPgAppliedMigrations(client);
  return pgMigrations.filter((m) => !appliedMigrations.includes(m.id));
}

export async function getPgMigrationStatus(): Promise<{
  total: number;
  applied: number;
  pending: PgMigration[];
}> {
  const client = getPgPool();

  if (!client) {
    return {
      total: pgMigrations.length,
      applied: 0,
      pending: pgMigrations,
    };
  }

  const appliedMigrations = await getPgAppliedMigrations(client);

  return {
    total: pgMigrations.length,
    applied: appliedMigrations.length,
    pending: pgMigrations.filter((m) => !appliedMigrations.includes(m.id)),
  };
}