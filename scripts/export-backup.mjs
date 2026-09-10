import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");

function getEnv(name) {
  const match = envContent.match(new RegExp(`^${name}\\s*=\\s*(.+)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const TABLES = [
  "profiles", "organizations", "blood_requests", "donations",
  "social_posts", "social_post_likes", "social_post_comments", "social_post_shares",
  "auth_rate_limits", "password_resets", "request_status_log", "request_edit_history",
  "request_translations", "donor_matches", "saved_patients", "site_settings",
  "activity_log", "donor_bookmarks", "donor_contact_clicks", "email_log",
  "email_templates", "email_settings", "schema_migrations", "stories",
  "social_post_saves", "push_subscriptions", "story_views", "notifications", "contact_messages",
];

const restBase = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;

async function fetchTable(name) {
  const url = `${restBase}/${name}?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Range": "0-10000",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`  ${name}: HTTP ${res.status} — ${text.slice(0, 100)}`);
    return [];
  }
  return res.json();
}

async function main() {
  console.log("Exporting via Supabase REST API...\n");
  const tables = {};
  let totalRows = 0;

  for (const table of TABLES) {
    const rows = await fetchTable(table);
    tables[table] = rows;
    totalRows += rows.length;
    console.log(`  ${table.padEnd(28)} ${rows.length} rows`);
  }

  const backup = {
    exported_at: new Date().toISOString(),
    exported_by: "scripts/export-backup.mjs",
    database: "trinomul-blood-bank-rangpur",
    table_count: TABLES.length,
    tables,
  };

  const date = new Date().toISOString().slice(0, 10);
  const backupDir = join(process.cwd(), "backups");
  mkdirSync(backupDir, { recursive: true });
  const filename = `trinomul-backup-${date}.json`;
  const filepath = join(backupDir, filename);

  const jsonStr = JSON.stringify(backup, null, 2);
  writeFileSync(filepath, jsonStr, "utf-8");

  const sizeKB = (Buffer.byteLength(jsonStr, "utf-8") / 1024).toFixed(1);
  console.log(`\nBackup saved: backups/${filename} (${sizeKB} KB)`);
  console.log(`Tables: ${TABLES.length} | Total rows: ${totalRows}`);
  console.log("\nStore this file somewhere safe (Google Drive, USB, etc.)");
  console.log("It contains password hashes, phone numbers, and other PII.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
