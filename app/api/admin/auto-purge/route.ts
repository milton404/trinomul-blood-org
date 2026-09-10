import { NextResponse } from "next/server";
import { isSupabaseAvailable } from "@/lib/supabase/client";
import { query as pgQuery } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseAvailable()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const results = {
    profiles_purged: 0,
    profiles_skipped: 0,
    posts_purged: 0,
    requests_purged: 0,
    orgs_purged: 0,
    stories_purged: 0,
    errors: [] as string[],
  };

  try {
    const { rows: profileRows } = await pgQuery<{ id: number; donation_count: string }>(
      `SELECT p.id,
              COALESCE((SELECT COUNT(*) FROM donations d WHERE d.donor_id = p.id), 0)::text AS donation_count
       FROM profiles p
       WHERE p.is_active = false AND p.role NOT IN ('admin', 'super_admin')`,
    );
    const profileIdsToPurge = profileRows
      .filter((r) => Number(r.donation_count) === 0)
      .map((r) => r.id);
    results.profiles_skipped = profileRows.length - profileIdsToPurge.length;

    if (profileIdsToPurge.length > 0) {
      const ph = profileIdsToPurge.map((_, i) => `$${i + 1}`).join(", ");
      const { rowCount } = await pgQuery(
        `DELETE FROM profiles WHERE id IN (${ph}) AND is_active = false AND role NOT IN ('admin', 'super_admin')`,
        profileIdsToPurge,
      );
      results.profiles_purged = rowCount ?? 0;
    }

    const { rows: postRows } = await pgQuery<{ id: number }>(
      `SELECT id FROM social_posts WHERE status = 'deleted'`,
    );
    if (postRows.length > 0) {
      const postIds = postRows.map((r) => r.id);
      const ph = postIds.map((_, i) => `$${i + 1}`).join(", ");
      const { rowCount } = await pgQuery(
        `DELETE FROM social_posts WHERE id IN (${ph}) AND status = 'deleted'`,
        postIds,
      );
      results.posts_purged = rowCount ?? 0;
    }

    const { rows: reqRows } = await pgQuery<{ id: number }>(
      `SELECT id FROM blood_requests WHERE archived_at IS NOT NULL`,
    );
    if (reqRows.length > 0) {
      const reqIds = reqRows.map((r) => r.id);
      const ph = reqIds.map((_, i) => `$${i + 1}`).join(", ");
      await pgQuery(`DELETE FROM request_translations WHERE request_id IN (${ph})`, reqIds);
      const { rowCount } = await pgQuery(
        `DELETE FROM blood_requests WHERE id IN (${ph}) AND archived_at IS NOT NULL`,
        reqIds,
      );
      results.requests_purged = rowCount ?? 0;
    }

    const { rows: orgRows } = await pgQuery<{ id: number }>(
      `SELECT id FROM organizations WHERE is_active = false`,
    );
    if (orgRows.length > 0) {
      const orgIds = orgRows.map((r) => r.id);
      const ph = orgIds.map((_, i) => `$${i + 1}`).join(", ");
      const { rowCount } = await pgQuery(
        `DELETE FROM organizations WHERE id IN (${ph}) AND is_active = false`,
        orgIds,
      );
      results.orgs_purged = rowCount ?? 0;
    }

    const { rows: storyRows } = await pgQuery<{ id: number }>(
      `SELECT id FROM stories WHERE expires_at < NOW()`,
    );
    if (storyRows.length > 0) {
      const storyIds = storyRows.map((r) => r.id);
      const ph = storyIds.map((_, i) => `$${i + 1}`).join(", ");
      const { rowCount } = await pgQuery(
        `DELETE FROM stories WHERE id IN (${ph}) AND expires_at < NOW()`,
        storyIds,
      );
      results.stories_purged = rowCount ?? 0;
    }

    try {
      await pgQuery(
        `INSERT INTO activity_log (actor_id, actor_email, action, entity_type, details)
         VALUES (NULL, 'system@cron', 'auto_purge', 'system', $1)`,
        [JSON.stringify(results)],
      );
    } catch (e) {
      console.error("Failed to log auto-purge:", e);
    }

    return NextResponse.json({
      ok: true,
      ...results,
      total_purged:
        results.profiles_purged +
        results.posts_purged +
        results.requests_purged +
        results.orgs_purged +
        results.stories_purged,
    });
  } catch (err: any) {
    console.error("Auto-purge failed:", err);
    return NextResponse.json(
      { error: err?.message || "Auto-purge failed", ...results },
      { status: 500 },
    );
  }
}