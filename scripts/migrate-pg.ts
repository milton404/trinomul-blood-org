// CLI runner for PostgreSQL (Supabase) migrations.
// Usage: npm run migrate:pg
import { config } from "dotenv";
import { runPgMigrations } from "../lib/migrations/pg-migrations";

config();

async function main() {
  const result = await runPgMigrations();

  for (const id of result.applied) {
    console.log(`✓ applied: ${id}`);
  }

  for (const failure of result.failed) {
    console.error(`✗ failed: ${failure.migration} — ${failure.error}`);
  }

  if (result.failed.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`Done. Applied ${result.applied.length} migration(s), ${result.failed.length} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});