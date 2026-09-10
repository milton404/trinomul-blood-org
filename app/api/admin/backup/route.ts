import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { query as pgQuery, isSupabaseAvailable } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const BACKUP_TABLES = [
  "profiles",
  "organizations",
  "blood_requests",
  "donations",
  "social_posts",
  "social_post_likes",
  "social_post_comments",
  "social_post_shares",
  "auth_rate_limits",
  "password_resets",
  "request_status_log",
  "request_edit_history",
  "request_translations",
  "donor_matches",
  "saved_patients",
  "site_settings",
  "activity_log",
  "donor_bookmarks",
  "donor_contact_clicks",
  "email_log",
  "email_templates",
  "email_settings",
  "schema_migrations",
  "stories",
  "social_post_saves",
  "push_subscriptions",
  "story_views",
  "notifications",
  "contact_messages",
] as const;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseAvailable()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  const { rows: userRows } = await pgQuery<{
    id: number;
    role: string;
  }>("SELECT id, role FROM profiles WHERE email = $1", [session.email]);
  const adminUser = userRows[0];
  if (!adminUser || !["super_admin", "admin"].includes(adminUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";

  const tableClauses = BACKUP_TABLES.map(
    (t) => `'${t}',(SELECT jsonb_agg(to_jsonb(x)) FROM public.${t} x)`,
  ).join(",");

  const backupQuery = `
    SELECT jsonb_build_object(
      'exported_at', now()::text,
      'exported_by', $1::text,
      'database', 'trinomul-blood-bank-rangpur',
      'supabase_project', 'yjgntukywudukskarawo',
      'table_count', ${BACKUP_TABLES.length},
      'tables', jsonb_build_object(${tableClauses})
    ) AS backup;
  `;

  const { rows } = await pgQuery(backupQuery, [session.email]);
  const backup = (rows[0] as Record<string, unknown>)?.backup;

  if (!backup) {
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }

  try {
    await pgQuery(
      `INSERT INTO activity_log (actor_id, actor_email, action, entity_type, details)
       VALUES ($1, $2, 'backup_exported', 'system', 'Full database backup exported (${format} format, ${BACKUP_TABLES.length} tables)')`,
      [adminUser.id, session.email],
    );
  } catch (e) {
    console.error("Failed to log backup:", e);
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `trinomul-backup-${date}.json`;
  const jsonStr = JSON.stringify(backup, null, 2);

  return new NextResponse(jsonStr, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(Buffer.byteLength(jsonStr, "utf-8")),
    },
  });
}