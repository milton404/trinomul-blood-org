// PostgreSQL port of the blood-request layer + homepage/public stats.
// Mirrors the SQLite functions in lib/db.ts but uses the Supabase pool.
// Pure lifecycle helpers (date math) are imported from lib/db.ts — they
// never touch getDb(), so importing them is serverless-safe.
import { query } from "@/lib/supabase/client";
import {
  computeNeededExpiryMs,
  isLastChanceRequest,
  getRequestGraceMs,
  getFulfilledSealHideMs,
  generateTrackingCode,
} from "@/lib/db";
import { resolveLocationCoordinates } from "@/lib/location-coordinates";

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRED_SEAL_DISPLAY_MS = DAY_MS;

function resolveCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
  districtName?: string,
  upazilaName?: string,
  unionName?: string,
): { lat: number; lng: number } {
  // District-scoped hierarchy matching lives in lib/location-coordinates —
  // it prevents same-named upazilas in different districts (Pirganj,
  // Phulbari) from resolving to the wrong district's centroid.
  return resolveLocationCoordinates(
    lat,
    lng,
    districtName,
    upazilaName,
    unionName,
  );
}

// ── Lifecycle sweep ───────────────────────────────────────────────────

export async function purgeOldArchivedRequestsPg(
  retentionHours: number = 48,
  nowMs: number = Date.now(),
): Promise<number> {
  const cutoff = new Date(nowMs - retentionHours * 3_600_000).toISOString();
  const { rowCount } = await query(
    `DELETE FROM blood_requests
     WHERE archived_at IS NOT NULL AND archived_at < $1`,
    [cutoff],
  );
  return rowCount || 0;
}

export async function runRequestLifecycleSweepPg(
  nowMs: number = Date.now(),
): Promise<number> {
  let archived = 0;

  // 1) Active requests whose needed time + grace period has passed.
  const { rows: active } = await query(
    `SELECT id, when_needed, needed_date, needed_time, created_at
     FROM blood_requests WHERE status = 'active' AND archived_at IS NULL`,
  );
  for (const row of active as any[]) {
    const expiry = computeNeededExpiryMs(row);
    if (Number.isNaN(expiry)) continue;
    if (nowMs > expiry + getRequestGraceMs(row)) {
      const upd = await query(
        `UPDATE blood_requests
         SET status = 'expired', current_status = 'expired', updated_at = NOW()
         WHERE id = $1 AND status = 'active' AND archived_at IS NULL`,
        [row.id],
      );
      if ((upd.rowCount || 0) > 0) {
        await query(
          `INSERT INTO request_status_log (request_id, status, changed_by, note)
           VALUES ($1, 'expired', 'system', 'Auto-expired after grace period')`,
          [row.id],
        );
        archived++;
      }
    }
  }

  // 1b) Expired requests whose seal display window has ended — now archive.
  const { rows: expiredVisible } = await query(
    `SELECT id, when_needed, needed_date, needed_time, created_at
     FROM blood_requests WHERE status = 'expired' AND archived_at IS NULL`,
  );
  for (const row of expiredVisible as any[]) {
    const expiry = computeNeededExpiryMs(row);
    if (Number.isNaN(expiry)) continue;
    if (nowMs > expiry + getRequestGraceMs(row) + EXPIRED_SEAL_DISPLAY_MS) {
      const upd = await query(
        `UPDATE blood_requests
         SET archived_at = NOW(), archive_reason = 'expired', updated_at = NOW()
         WHERE id = $1 AND status = 'expired' AND archived_at IS NULL`,
        [row.id],
      );
      if ((upd.rowCount || 0) > 0) {
        await query("DELETE FROM request_translations WHERE request_id = $1", [row.id]);
        archived++;
      }
    }
  }

  // 2) Fulfilled requests whose "Completed" seal window has ended.
  const { rows: fulfilled } = await query(
    `SELECT id, fulfilled_at, donated_at, updated_at
     FROM blood_requests WHERE status = 'fulfilled' AND archived_at IS NULL`,
  );
  for (const row of fulfilled as any[]) {
    const hideAt = getFulfilledSealHideMs(row);
    if (Number.isNaN(hideAt)) continue;
    if (nowMs > hideAt) {
      const upd = await query(
        `UPDATE blood_requests
         SET archived_at = NOW(), archive_reason = 'fulfilled', updated_at = NOW()
         WHERE id = $1 AND status = 'fulfilled' AND archived_at IS NULL`,
        [row.id],
      );
      if ((upd.rowCount || 0) > 0) {
        await query("DELETE FROM request_translations WHERE request_id = $1", [row.id]);
        archived++;
      }
    }
  }

  // 3) Hard-delete rows archived more than 48h ago.
  await purgeOldArchivedRequestsPg(48, nowMs);

  return archived;
}

// ── Reads ─────────────────────────────────────────────────────────────

export async function getVisibleBloodRequestsPg() {
  await runRequestLifecycleSweepPg();
  const { rows } = await query(
    `SELECT br.*, COALESCE(d.total, 0) AS donated_units
     FROM blood_requests br
     LEFT JOIN (SELECT request_id, SUM(COALESCE(units, 1)) AS total FROM donations GROUP BY request_id) d
       ON d.request_id = br.id
     WHERE br.archived_at IS NULL ORDER BY br.created_at DESC`,
  );
  const now = Date.now();
  return rows.map((r: any) => ({
    ...r,
    is_last_chance: isLastChanceRequest(r, now),
  }));
}

export async function getActiveBloodRequestsPg(limit: number = 10) {
  await runRequestLifecycleSweepPg();
  const { rows } = await query(
    `SELECT * FROM blood_requests
     WHERE status = 'active' AND archived_at IS NULL
     ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  const now = Date.now();
  return rows.map((r: any) => ({
    ...r,
    is_last_chance: isLastChanceRequest(r, now),
  }));
}

export async function getAllBloodRequestsPg() {
  await runRequestLifecycleSweepPg();
  const { rows } = await query(
    "SELECT * FROM blood_requests ORDER BY created_at DESC",
  );
  return rows;
}

export async function getBloodRequestByIdPg(id: number) {
  const { rows } = await query(
    `SELECT br.*, COALESCE(d.total, 0) AS donated_units
     FROM blood_requests br
     LEFT JOIN (SELECT request_id, SUM(COALESCE(units, 1)) AS total FROM donations GROUP BY request_id) d
       ON d.request_id = br.id
     WHERE br.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function getBloodRequestByTrackingCodePg(code: string) {
  const { rows } = await query(
    `SELECT br.*, COALESCE(d.total, 0) AS donated_units
     FROM blood_requests br
     LEFT JOIN (SELECT request_id, SUM(COALESCE(units, 1)) AS total FROM donations GROUP BY request_id) d
       ON d.request_id = br.id
     WHERE br.tracking_code = $1`,
    [code],
  );
  return rows[0] || null;
}

export async function incrementRequestViewPg(id: number): Promise<number> {
  const { rowCount } = await query(
    "UPDATE blood_requests SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1",
    [id],
  );
  return rowCount || 0;
}

// ── Create ────────────────────────────────────────────────────────────

export async function createBloodRequestPg(request: Record<string, any>): Promise<number> {
  const coords = resolveCoords(
    request.lat,
    request.lng,
    request.district,
    request.upazila,
    request.unionName,
  );

  let trackingCode = generateTrackingCode();
  for (let i = 0; i < 5; i++) {
    const { rows } = await query(
      "SELECT 1 FROM blood_requests WHERE tracking_code = $1",
      [trackingCode],
    );
    if (rows.length === 0) break;
    trackingCode = generateTrackingCode();
  }

  const { rows } = await query(
    `INSERT INTO blood_requests (
       requester_id, requester_type, patient_name, patient_age, blood_group,
       units_needed, urgency_level, when_needed, needed_date, needed_time,
       district, upazila, union_name, lat, lng, hospital_name, hospital_address,
       contact_number, alternative_number, whatsapp_number, reason,
       patient_hb_level, status, tracking_code, current_status, ip_address, user_agent
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
     RETURNING id`,
    [
      request.requesterId ?? null,
      request.requesterType ?? "guest",
      request.patientName,
      request.patientAge ?? null,
      request.bloodGroup,
      request.unitsNeeded ?? 1,
      request.urgencyLevel ?? "normal",
      request.whenNeeded ?? "today",
      request.neededDate ?? null,
      request.neededTime ?? null,
      request.district ?? null,
      request.upazila ?? null,
      request.unionName ?? null,
      coords.lat,
      coords.lng,
      request.hospitalName ?? null,
      request.hospitalAddress ?? null,
      request.contactNumber ?? null,
      request.alternativeNumber ?? null,
      request.whatsappNumber ?? null,
      request.reason ?? null,
      request.patientHbLevel ?? null,
      request.status ?? "active",
      trackingCode,
      "submitted",
      request.ipAddress ?? null,
      request.userAgent ?? null,
    ],
  );
  return (rows[0] as { id: number }).id;
}

// ── Stats ─────────────────────────────────────────────────────────────

async function count(sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await query(sql, params);
  return Number((rows[0] as any)?.count ?? 0);
}

export async function getHomepageStatsPg() {
  const totalDonors = await count(
    "SELECT COUNT(*) as count FROM profiles WHERE role = 'donor'",
  );
  const activeRequests = await count(
    "SELECT COUNT(*) as count FROM blood_requests WHERE status = 'active' AND archived_at IS NULL",
  );
  const totalDonations = await count("SELECT COUNT(*) as count FROM donations");
  const districts = await count(
    `SELECT COUNT(DISTINCT district) as count FROM profiles
     WHERE district IS NOT NULL AND district <> ''`,
  );
  return { totalDonors, activeRequests, totalDonations, districts };
}

export async function getPublicTransparencyStatsPg() {
  const totalDonations = await count("SELECT COUNT(*) as count FROM donations");
  const totalUnits = await count(
    "SELECT COALESCE(SUM(units), 0) as count FROM donations",
  );
  const totalDonors = await count(
    "SELECT COUNT(*) as count FROM profiles WHERE role = 'donor' AND is_active = TRUE",
  );
  const totalRequests = await count("SELECT COUNT(*) as count FROM blood_requests");
  const fulfilledRequests = await count(
    "SELECT COUNT(*) as count FROM blood_requests WHERE status = 'fulfilled'",
  );
  const activeRequests = await count(
    "SELECT COUNT(*) as count FROM blood_requests WHERE status = 'active'",
  );
  const totalHospitals = await count(
    "SELECT COUNT(*) as count FROM profiles WHERE role = 'hospital' AND is_active = TRUE",
  );
  const districtsCovered = await count(
    `SELECT COUNT(DISTINCT district) as count FROM profiles
     WHERE district IS NOT NULL AND district <> ''`,
  );
  const livesSaved = totalUnits;
  const donationsThisMonth = await count(
    "SELECT COUNT(*) as count FROM donations WHERE donation_date >= NOW() - INTERVAL '30 days'",
  );
  const currentYear = new Date().getFullYear();
  const donationsThisYear = await count(
    "SELECT COUNT(*) as count FROM donations WHERE donation_date >= $1",
    [`${currentYear}-01-01`],
  );
  const fulfillmentRate =
    totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0;

  const { rows: bloodGroupDistribution } = await query<{ blood_group: string; count: number }>(
    `SELECT blood_group, COUNT(*) as count FROM profiles
     WHERE role = 'donor' AND is_active = TRUE AND blood_group IS NOT NULL
     GROUP BY blood_group ORDER BY count DESC`,
  );
  const { rows: monthlyTrends } = await query<{ month: string; donations: number; units: number }>(
    `SELECT TO_CHAR(donation_date, 'YYYY-MM') as month,
            COUNT(*) as donations,
            COALESCE(SUM(units), 0) as units
     FROM donations
     WHERE donation_date >= NOW() - INTERVAL '12 months'
     GROUP BY 1 ORDER BY month ASC`,
  );
  const { rows: districtDonors } = await query<{ district: string; count: number }>(
    `SELECT COALESCE(district, 'Unknown') as district, COUNT(*) as count
     FROM profiles WHERE role = 'donor' AND is_active = TRUE AND district IS NOT NULL
     GROUP BY district ORDER BY count DESC`,
  );

  return {
    totalDonations,
    totalUnits,
    totalDonors,
    totalRequests,
    fulfilledRequests,
    activeRequests,
    totalHospitals,
    districtsCovered,
    livesSaved,
    donationsThisMonth,
    donationsThisYear,
    fulfillmentRate,
    bloodGroupDistribution,
    monthlyTrends,
    districtDonors,
  };
}

export async function getDonorOfTheMonthPg() {
  const { rows } = await query(
    `SELECT
       p.id, p.full_name_en, p.full_name_bn, p.blood_group, p.district, p.upazila,
       p.show_on_leaderboard,
       COUNT(d.id) as monthly_donations,
       COALESCE(SUM(d.units), 0) as monthly_units,
       (SELECT COUNT(*) FROM donations WHERE donor_id = p.id) as total_donations
     FROM profiles p
     JOIN donations d ON p.id = d.donor_id
     WHERE p.role = 'donor' AND p.is_active = TRUE AND p.show_on_leaderboard = TRUE
       AND TO_CHAR(d.donation_date, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')
     GROUP BY p.id
     ORDER BY monthly_donations DESC, monthly_units DESC
     LIMIT 1`,
  );
  const result = rows[0] as any;
  if (!result) return null;
  return result;
}

export async function getDonationImpactStatsPg() {
  const totalUnits = await count(
    "SELECT COALESCE(SUM(units), 0) as count FROM donations",
  );
  const livesImpacted = totalUnits * 3;
  const activeDistricts = await count(
    `SELECT COUNT(DISTINCT district) as count FROM profiles
     WHERE role = 'donor' AND is_active = TRUE AND district IS NOT NULL`,
  );
  const totalDonors = await count(
    "SELECT COUNT(*) as count FROM profiles WHERE role = 'donor'",
  );
  const totalDonations = await count("SELECT COUNT(*) as count FROM donations");
  const avgDonationsPerDonor =
    totalDonors > 0 ? Math.round((totalDonations / totalDonors) * 10) / 10 : 0;
  return { totalUnits, livesImpacted, activeDistricts, avgDonationsPerDonor };
}

export async function getTopReferrersPg(limit: number = 20) {
  const { rows } = await query(
    `SELECT
       d.referrer_profile_id,
       COALESCE(p.full_name_en, d.referrer_name) AS referrer_name,
       COALESCE(p.full_name_bn, d.referrer_name) AS referrer_name_bn,
       COALESCE(p.phone, d.referrer_phone) AS referrer_phone,
       p.blood_group,
       p.district,
       p.upazila,
       COUNT(*) AS total_referrals,
       MAX(d.donation_date) AS last_referral_date
     FROM donations d
     LEFT JOIN profiles p ON d.referrer_profile_id = p.id
     WHERE d.referrer_profile_id IS NOT NULL
        OR (d.referrer_name IS NOT NULL AND d.referrer_name <> '')
     GROUP BY COALESCE(d.referrer_profile_id::TEXT, 'phone:' || d.referrer_phone, 'name:' || d.referrer_name),
              d.referrer_profile_id, p.full_name_en, p.full_name_bn, p.phone, p.blood_group, p.district, p.upazila
     ORDER BY total_referrals DESC, last_referral_date DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}