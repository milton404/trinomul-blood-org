// PostgreSQL port of the remaining SQLite functions from lib/db.ts.
// Used by lib/db-actions.ts server actions when isSupabaseAvailable() is true.
import { query } from "@/lib/supabase/client";
import {

  isLastChanceRequest,
  generateTrackingCode,
} from "@/lib/db";
import {
  RANGPUR_DISTRICTS,
  RANGPUR_UPAZILAS,
  RANGPUR_UNIONS,
} from "@/lib/constants/rangpur";
import { toValidBangladeshCoordinates } from "@/lib/location-coordinates";

// ── Helpers ───────────────────────────────────────────────────────────

function resolveCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
  districtName?: string | null,
  upazilaName?: string | null,
  unionName?: string | null,
): { lat: number; lng: number } {
  const exactCoords = toValidBangladeshCoordinates(lat, lng);
  if (exactCoords) return exactCoords;
  if (unionName) {
    const lower = unionName.toLowerCase();
    const union = RANGPUR_UNIONS.find(
      (u) => u.id === lower || u.name_en.toLowerCase() === lower || u.name_bn === unionName,
    );
    if (union) return { lat: union.lat, lng: union.lng };
  }
  if (upazilaName) {
    const lower = upazilaName.toLowerCase();
    const upazila = RANGPUR_UPAZILAS.find(
      (u) => u.id === lower || u.name_en.toLowerCase() === lower || u.name_bn === upazilaName,
    );
    if (upazila) return { lat: upazila.lat, lng: upazila.lng };
  }
  if (districtName) {
    const lower = districtName.toLowerCase();
    const district = RANGPUR_DISTRICTS.find(
      (d) =>
        d.id === lower ||
        d.name_en.toLowerCase() === lower ||
        d.name_bn === districtName,
    );
    if (district) return { lat: district.lat, lng: district.lng };
  }
  return { lat: 25.7439, lng: 89.2752 };
}


async function countSql(sql: string, params: unknown[] = []): Promise<number> {
  const { rows } = await query(sql, params);
  return Number((rows[0] as any)?.count ?? 0);
}

// Boolean columns that need coercion from PG true/false to the 0/1 or
// boolean shape the frontend expects.
const PROFILE_BOOLEAN_COLS = new Set([
  "is_active",
  "has_chronic_disease",
  "show_on_leaderboard",
  "is_anonymous",
  "is_approved",
  "email_opt_in",
  "is_verified",
  "phone_verified",
]);

const PROFILE_NUMERIC_COLS = new Set([
  "weight_kg",
  "hb_level",
  "lat",
  "lng",
  "patient_hb_level",
  "response_count",
  "response_total_ms",
]);

function coerceProfileVal(key: string, value: any): any {
  if (PROFILE_BOOLEAN_COLS.has(key)) {
    if (value === null || value === undefined || value === "") return false;
    return value === true || value === 1 || value === "1" || value === "true";
  }
  if (PROFILE_NUMERIC_COLS.has(key)) {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }
  return value === undefined ? null : value;
}

// ── Profile queries ───────────────────────────────────────────────────

export async function createProfilePg(profile: Record<string, any>): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO profiles (email, password_hash, full_name_en, full_name_bn, phone, blood_group, role, district, upazila, union_name, hospital_name_en, hospital_name_bn, license_number, website, lat, lng)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
    [
      profile.email,
      profile.passwordHash,
      profile.fullNameEn ?? null,
      profile.fullNameBn ?? null,
      profile.phone ?? null,
      profile.bloodGroup ?? null,
      profile.role ?? "donor",
      profile.district ?? null,
      profile.upazila ?? null,
      profile.unionName ?? null,
      profile.hospitalNameEn ?? null,
      profile.hospitalNameBn ?? null,
      profile.licenseNumber ?? null,
      profile.website ?? null,
      profile.lat ?? null,
      profile.lng ?? null,
    ],
  );
  return rows[0].id;
}

export async function getAllProfilesPg() {
  const { rows } = await query("SELECT * FROM profiles ORDER BY created_at DESC");
  return rows;
}

export async function getProfilesByRolesPg(roles: string[]) {
  if (roles.length === 0) return [];
  const placeholders = roles.map((_, i) => `$${i + 1}`).join(",");
  const { rows } = await query(
    `SELECT * FROM profiles WHERE role IN (${placeholders}) ORDER BY created_at DESC`,
    roles,
  );
  return rows;
}

export async function deleteProfilePg(id: number): Promise<number> {
  const { rowCount } = await query("DELETE FROM profiles WHERE id = $1", [id]);
  return rowCount || 0;
}

export async function searchProfilesPg(filters?: {
  role?: string;
  isActive?: boolean;
  search?: string;
  districts?: string[];
  hbStatus?: "eligible" | "low_hb" | "not_tested";
  limit?: number;
  offset?: number;
}) {
  let sql = "SELECT * FROM profiles WHERE 1=1";
  const params: any[] = [];
  let p = 1;

  if (filters?.role && filters.role !== "all") {
    sql += ` AND role = $${p++}`;
    params.push(filters.role);
  }
  if (filters?.districts && filters.districts.length > 0) {
    const ph = filters.districts.map((_, i) => `$${p + i}`).join(",");
    sql += ` AND LOWER(COALESCE(district, '')) IN (${ph})`;
    params.push(...filters.districts.map((d) => d.toLowerCase()));
    p += filters.districts.length;
  }
  if (filters?.isActive === true) {
    sql += " AND is_active = TRUE";
  } else if (filters?.isActive === false) {
    sql += " AND is_active = FALSE";
  }
  if (filters?.search) {
    sql += ` AND (full_name_en LIKE $${p} OR full_name_bn LIKE $${p} OR phone LIKE $${p} OR email LIKE $${p})`;
    params.push(`%${filters.search}%`);
    p++;
  }
  const lowHbClause = `(
    (COALESCE(sex, '') = 'female' AND hb_level IS NOT NULL AND hb_level < 12.5)
    OR (COALESCE(sex, '') != 'female' AND hb_level IS NOT NULL AND hb_level < 13.0)
  )`;
  if (filters?.hbStatus === "low_hb") {
    sql += ` AND ${lowHbClause}`;
  } else if (filters?.hbStatus === "eligible") {
    sql += ` AND hb_level IS NOT NULL AND NOT ${lowHbClause}`;
  } else if (filters?.hbStatus === "not_tested") {
    sql += " AND hb_level IS NULL";
  }

  // Count query (before LIMIT/OFFSET)
  const countSqlStr = sql.replace("SELECT *", "SELECT COUNT(*) as count");
  const countParams = [...params];
  const total = await countSql(countSqlStr, countParams);

  sql += " ORDER BY created_at DESC";
  if (filters?.limit) {
    sql += ` LIMIT $${p++} OFFSET $${p++}`;
    params.push(filters.limit, filters.offset || 0);
  }

  const { rows } = await query(sql, params);
  return { rows, total };
}

export async function getAdminsPg(filters?: {
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let sql = "SELECT * FROM profiles WHERE role IN ('admin', 'super_admin')";
  const params: any[] = [];
  let p = 1;

  if (filters?.role && filters.role !== "all") {
    sql += ` AND role = $${p++}`;
    params.push(filters.role);
  }
  if (filters?.search) {
    sql += ` AND (full_name_en LIKE $${p} OR full_name_bn LIKE $${p} OR phone LIKE $${p} OR email LIKE $${p})`;
    params.push(`%${filters.search}%`);
    p++;
  }

  const countSqlStr = sql.replace("SELECT *", "SELECT COUNT(*) as count");
  const total = await countSql(countSqlStr, [...params]);

  sql += " ORDER BY created_at DESC";
  if (filters?.limit) {
    sql += ` LIMIT $${p++} OFFSET $${p++}`;
    params.push(filters.limit, filters.offset || 0);
  }

  const { rows } = await query(sql, params);
  return { rows, total };
}

export async function getPendingVerificationsPg(filters?: {
  district?: string;
  limit?: number;
  offset?: number;
}) {
  let sql = `
    SELECT id, full_name_en, full_name_bn, phone, blood_group, district, upazila,
           nid_number, nid_front_url, nid_back_url, nid_uploaded_at,
           verification_status, phone_verified, is_verified, created_at
    FROM profiles
    WHERE verification_status = 'pending' AND role = 'donor'
  `;
  const params: any[] = [];
  let p = 1;
  if (filters?.district) {
    sql += ` AND district = $${p++}`;
    params.push(filters.district);
  }
  sql += " ORDER BY nid_uploaded_at ASC NULLS LAST";
  if (filters?.limit) {
    sql += ` LIMIT $${p++} OFFSET $${p++}`;
    params.push(filters.limit, filters.offset || 0);
  }
  const { rows } = await query(sql, params);
  return rows;
}

export async function getDonorApplicationsPg(filters?: {
  district?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let sql = `
    SELECT id, full_name_en, full_name_bn, email, phone, whatsapp_number,
           blood_group, district, upazila, address, sex, date_of_birth,
           weight_kg, avatar_url, occupation, preferred_contact,
           hb_level, last_hb_test_date, last_donation_date,
           has_chronic_disease, disease_details,
           verification_status, verification_note, is_approved, created_at
    FROM profiles
    WHERE role = 'donor' AND is_approved = FALSE
  `;
  const params: any[] = [];
  let p = 1;
  if (filters?.district) {
    sql += ` AND district = $${p++}`;
    params.push(filters.district);
  }
  if (filters?.search) {
    sql += ` AND (full_name_en LIKE $${p} OR full_name_bn LIKE $${p} OR phone LIKE $${p} OR email LIKE $${p})`;
    params.push(`%${filters.search}%`);
    p++;
  }
  sql += " ORDER BY created_at DESC";
  if (filters?.limit) {
    sql += ` LIMIT $${p++} OFFSET $${p++}`;
    params.push(filters.limit, filters.offset || 0);
  }
  const { rows } = await query(sql, params);
  return rows;
}

export async function countDonorApplicationsPg(filters?: {
  district?: string;
  search?: string;
}) {
  let sql = "SELECT COUNT(*) as count FROM profiles WHERE role = 'donor' AND is_approved = FALSE";
  const params: any[] = [];
  let p = 1;
  if (filters?.district) {
    sql += ` AND district = $${p++}`;
    params.push(filters.district);
  }
  if (filters?.search) {
    sql += ` AND (full_name_en LIKE $${p} OR full_name_bn LIKE $${p} OR phone LIKE $${p} OR email LIKE $${p})`;
    params.push(`%${filters.search}%`);
    p++;
  }
  return countSql(sql, params);
}

export async function setAdminAssignmentPg(
  profileId: number,
  assignedDistrict: string | null,
  assignedUpazila: string | null,
): Promise<number> {
  const { rowCount } = await query(
    "UPDATE profiles SET assigned_district = $1, assigned_upazila = $2, updated_at = NOW() WHERE id = $3 AND role = 'admin'",
    [assignedDistrict, assignedUpazila, profileId],
  );
  return rowCount || 0;
}

export async function recordAdminPolicyAcceptancePg(profileId: number): Promise<number> {
  const { rowCount } = await query(
    "UPDATE profiles SET admin_policy_accepted_at = NOW() WHERE id = $1 AND role IN ('admin', 'super_admin')",
    [profileId],
  );
  return rowCount || 0;
}

// ── Blood request queries ─────────────────────────────────────────────

export async function searchBloodRequestsPg(filters?: {
  status?: string;
  urgencyLevel?: string;
  bloodGroup?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  let sql = "SELECT * FROM blood_requests WHERE 1=1";
  const params: any[] = [];
  let p = 1;

  if (filters?.status && filters.status !== "all") {
    sql += ` AND status = $${p++}`;
    params.push(filters.status);
  }
  if (filters?.urgencyLevel && filters.urgencyLevel !== "all") {
    sql += ` AND urgency_level = $${p++}`;
    params.push(filters.urgencyLevel);
  }
  if (filters?.bloodGroup && filters.bloodGroup !== "all") {
    sql += ` AND blood_group = $${p++}`;
    params.push(filters.bloodGroup);
  }
  if (filters?.search) {
    sql += ` AND (patient_name LIKE $${p} OR hospital_name LIKE $${p} OR contact_number LIKE $${p})`;
    params.push(`%${filters.search}%`);
    p++;
  }

  const countSqlStr = sql.replace("SELECT *", "SELECT COUNT(*) as count");
  const total = await countSql(countSqlStr, [...params]);

  sql += " ORDER BY created_at DESC";
  if (filters?.limit) {
    sql += ` LIMIT $${p++} OFFSET $${p++}`;
    params.push(filters.limit, filters.offset || 0);
  }

  const { rows } = await query(sql, params);
  return { rows, total };
}

export async function updateBloodRequestPg(id: number, data: Record<string, any>): Promise<number> {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    const { rowCount } = await query("UPDATE blood_requests SET updated_at = NOW() WHERE id = $1", [id]);
    return rowCount || 0;
  }
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const params = keys.map((k) => data[k]);
  params.push(id);
  const { rowCount } = await query(
    `UPDATE blood_requests SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
    params,
  );
  return rowCount || 0;
}

export async function updateRequestStatusPg(id: number, status: string): Promise<number> {
  if (status === "cancelled") {
    const { rowCount } = await query(
      `UPDATE blood_requests
       SET status = 'cancelled', current_status = 'cancelled',
           archived_at = COALESCE(archived_at, NOW()),
           archive_reason = COALESCE(archive_reason, 'cancelled'),
           updated_at = NOW()
       WHERE id = $1`,
      [id],
    );
    return rowCount || 0;
  }
  if (status === "fulfilled") {
    const { rowCount } = await query(
      `UPDATE blood_requests
       SET status = 'fulfilled', current_status = 'fulfilled',
           fulfilled_at = COALESCE(fulfilled_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [id],
    );
    return rowCount || 0;
  }
  const { rowCount } = await query(
    "UPDATE blood_requests SET status = $1, updated_at = NOW() WHERE id = $2",
    [status, id],
  );
  return rowCount || 0;
}

export async function deleteRequestPg(id: number): Promise<number> {
  const { rowCount } = await query("DELETE FROM blood_requests WHERE id = $1", [id]);
  return rowCount || 0;
}

export async function getVisibleBloodRequestsPg2() {
  const { rows } = await query(
    "SELECT * FROM blood_requests WHERE archived_at IS NULL ORDER BY created_at DESC",
  );
  const now = Date.now();
  return rows.map((r: any) => ({
    ...r,
    is_last_chance: isLastChanceRequest(r, now),
  }));
}

export async function getRequestStatusCountsPg() {
  const { rows } = await query(
    `SELECT id, status, archive_reason, archived_at, when_needed,
            needed_date, needed_time, created_at
     FROM blood_requests`,
  );
  const counts = {
    active: 0,
    lastChance: 0,
    fulfilled: 0,
    expired: 0,
    cancelled: 0,
    deleted: 0,
    all: rows.length,
  };
  const now = Date.now();
  for (const r of rows as any[]) {
    if (!r.archived_at && r.status === "active") {
      if (isLastChanceRequest(r, now)) counts.lastChance++;
      else counts.active++;
    } else if (r.archive_reason === "deleted_by_user") counts.deleted++;
    else if (r.status === "fulfilled") counts.fulfilled++;
    else if (r.status === "expired") counts.expired++;
    else if (r.status === "cancelled") counts.cancelled++;
  }
  return counts;
}

export async function getAdminRequestsPg(filters?: {
  view?: string;
  urgencyLevel?: string;
  bloodGroup?: string;
  search?: string;
  districts?: string[];
  limit?: number;
  offset?: number;
}) {
  const { rows } = await query("SELECT * FROM blood_requests ORDER BY created_at DESC");
  const now = Date.now();
  const view = filters?.view || "active";

  let filtered = (rows as any[]).filter((r) => {
    const lastChance = isLastChanceRequest(r, now);
    switch (view) {
      case "active":
        if (r.archived_at || r.status !== "active" || lastChance) return false;
        break;
      case "last_chance":
        if (r.archived_at || !lastChance) return false;
        break;
      case "fulfilled":
        if (r.status !== "fulfilled") return false;
        break;
      case "expired":
        if (r.status !== "expired") return false;
        break;
      case "cancelled":
        if (r.status !== "cancelled" || r.archive_reason === "deleted_by_user") return false;
        break;
      case "deleted":
        if (r.archive_reason !== "deleted_by_user") return false;
        break;
      case "all":
      default:
        break;
    }
    if (filters?.urgencyLevel && filters.urgencyLevel !== "all" && r.urgency_level !== filters.urgencyLevel) return false;
    if (filters?.bloodGroup && filters.bloodGroup !== "all" && r.blood_group !== filters.bloodGroup) return false;
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      const hay = `${r.patient_name || ""} ${r.hospital_name || ""} ${r.contact_number || ""} ${r.tracking_code || ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (filters?.districts && filters.districts.length > 0) {
      const allowed = filters.districts.map((d) => d.toLowerCase());
      if (!allowed.includes((r.district || "").toLowerCase())) return false;
    }
    return true;
  });

  const total = filtered.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || filtered.length;
  return {
    rows: filtered.slice(offset, offset + limit).map((r) => ({
      ...r,
      is_last_chance: isLastChanceRequest(r, now),
    })),
    total,
  };
}

export async function getBloodRequestsByHospitalPg(hospitalNameEn: string, hospitalNameBn?: string) {
  const patterns = [hospitalNameEn];
  if (hospitalNameBn && hospitalNameBn !== hospitalNameEn) patterns.push(hospitalNameBn);
  const clauses = patterns.map((_, i) => `hospital_name LIKE $${i + 1}`).join(" OR ");
  const params = patterns.map((p) => `%${p}%`);
  const { rows } = await query(
    `SELECT * FROM blood_requests WHERE (${clauses}) ORDER BY created_at DESC`,
    params,
  );
  return rows;
}

export async function getDonationsByHospitalPg(hospitalNameEn: string, hospitalNameBn?: string) {
  const patterns = [hospitalNameEn];
  if (hospitalNameBn && hospitalNameBn !== hospitalNameEn) patterns.push(hospitalNameBn);
  const clauses = patterns.map((_, i) => `hospital_name LIKE $${i + 1}`).join(" OR ");
  const params = patterns.map((p) => `%${p}%`);
  const { rows } = await query(
    `SELECT d.*, p.full_name_en as donor_name, p.phone as donor_phone, p.blood_group as donor_blood_group
     FROM donations d
     LEFT JOIN profiles p ON d.donor_id = p.id
     WHERE (${clauses}) ORDER BY d.donation_date DESC`,
    params,
  );
  return rows;
}

export async function getHospitalStatsPg(hospitalNameEn: string, hospitalNameBn?: string) {
  const patterns = [hospitalNameEn];
  if (hospitalNameBn && hospitalNameBn !== hospitalNameEn) patterns.push(hospitalNameBn);
  const clauses = patterns.map((_, i) => `hospital_name LIKE $${i + 1}`).join(" OR ");
  const params = patterns.map((p) => `%${p}%`);

  const totalRequests = await countSql(`SELECT COUNT(*) as count FROM blood_requests WHERE (${clauses})`, params);
  const activeRequests = await countSql(`SELECT COUNT(*) as count FROM blood_requests WHERE (${clauses}) AND status = 'active' AND archived_at IS NULL`, params);
  const fulfilledRequests = await countSql(`SELECT COUNT(*) as count FROM blood_requests WHERE (${clauses}) AND status = 'fulfilled'`, params);
  const totalDonations = await countSql(`SELECT COUNT(*) as count FROM donations WHERE (${clauses})`, params);
  const { rows: sumRows } = await query(`SELECT COALESCE(SUM(units), 0) as sum FROM donations WHERE (${clauses})`, params);
  const totalUnits = Number((sumRows[0] as any)?.sum || 0);

  return { totalRequests, activeRequests, fulfilledRequests, totalDonations, totalUnits };
}

export async function getRequestCollectedUnitsPg(requestId: number): Promise<number> {
  const { rows } = await query("SELECT COALESCE(SUM(units), 0) AS collected FROM donations WHERE request_id = $1", [requestId]);
  return Number((rows[0] as any)?.collected ?? 0);
}

// ── Own/guest request management ──────────────────────────────────────

const OWN_REQUEST_EDITABLE_FIELDS = [
  "patient_name", "patient_age", "units_needed", "urgency_level",
  "when_needed", "needed_date", "needed_time", "hospital_name",
  "hospital_address", "contact_number", "alternative_number",
  "reason", "patient_hb_level",
];

export async function updateOwnBloodRequestPg(
  requestId: number,
  userId: number,
  data: Record<string, any>,
): Promise<number> {
  const { rows } = await query(
    "SELECT * FROM blood_requests WHERE id = $1 AND requester_id = $2 AND status = 'active' AND archived_at IS NULL",
    [requestId, userId],
  );
  const req = rows[0] as any;
  if (!req) return 0;

  const sets: string[] = [];
  const values: any[] = [];
  const newValues: Record<string, any> = {};
  let p = 1;
  for (const field of OWN_REQUEST_EDITABLE_FIELDS) {
    if (field in data) {
      sets.push(`${field} = $${p++}`);
      values.push(data[field]);
      newValues[field] = data[field];
    }
  }
  if (sets.length === 0) return 0;
  sets.push("updated_at = NOW()");
  values.push(requestId, userId);
  const { rowCount } = await query(
    `UPDATE blood_requests SET ${sets.join(", ")} WHERE id = $${p++} AND requester_id = $${p++} AND status = 'active' AND archived_at IS NULL`,
    values,
  );
  const changes = rowCount || 0;

  if (changes > 0) {
    const previousValues: Record<string, any> = {};
    for (const field of Object.keys(newValues)) previousValues[field] = req[field];
    await recordRequestEditHistoryPg({
      requestId, editorType: "user", editorId: userId, previousValues, newValues,
    });
  }
  return changes;
}

export async function updateGuestBloodRequestPg(
  requestId: number,
  visitorIp: string,
  visitorUa: string,
  data: Record<string, any>,
): Promise<number> {
  const { rows } = await query("SELECT * FROM blood_requests WHERE id = $1", [requestId]);
  const req = rows[0] as any;
  if (!req) return 0;
  if (req.requester_id != null) return 0;
  if (req.status !== "active" || req.archived_at != null) return 0;

  const ipMatch = !!req.ip_address && req.ip_address !== "unknown" && req.ip_address === visitorIp;
  const uaMatch = !!req.user_agent && req.user_agent !== "unknown" && req.user_agent === visitorUa;
  if (!ipMatch && !uaMatch) return 0;

  const sets: string[] = [];
  const values: any[] = [];
  const newValues: Record<string, any> = {};
  let p = 1;
  for (const field of OWN_REQUEST_EDITABLE_FIELDS) {
    if (field in data) {
      sets.push(`${field} = $${p++}`);
      values.push(data[field]);
      newValues[field] = data[field];
    }
  }
  if (sets.length === 0) return 0;
  sets.push("updated_at = NOW()");
  values.push(requestId);
  const { rowCount } = await query(
    `UPDATE blood_requests SET ${sets.join(", ")} WHERE id = $${p++} AND requester_id IS NULL AND status = 'active' AND archived_at IS NULL`,
    values,
  );
  const changes = rowCount || 0;

  if (changes > 0) {
    const previousValues: Record<string, any> = {};
    for (const field of Object.keys(newValues)) previousValues[field] = req[field];
    await recordRequestEditHistoryPg({
      requestId, editorType: "guest", editorIp: visitorIp, previousValues, newValues,
    });
  }
  return changes;
}

export async function archiveGuestRequestPg(
  requestId: number,
  visitorIp: string,
  visitorUa: string,
): Promise<number> {
  const { rows } = await query(
    "SELECT requester_id, ip_address, user_agent, status, archived_at FROM blood_requests WHERE id = $1",
    [requestId],
  );
  const req = rows[0] as any;
  if (!req) return 0;
  if (req.requester_id != null) return 0;
  if (req.status !== "active" || req.archived_at != null) return 0;

  const ipMatch = !!req.ip_address && req.ip_address !== "unknown" && req.ip_address === visitorIp;
  const uaMatch = !!req.user_agent && req.user_agent !== "unknown" && req.user_agent === visitorUa;
  if (!ipMatch && !uaMatch) return 0;

  const { rowCount } = await query(
    `UPDATE blood_requests SET status = 'cancelled', archived_at = NOW(), archive_reason = 'cancelled_by_guest', updated_at = NOW() WHERE id = $1 AND requester_id IS NULL AND archived_at IS NULL`,
    [requestId],
  );
  const changes = rowCount || 0;
  if (changes > 0) {
    await query(
      `INSERT INTO request_status_log (request_id, status, changed_by, note) VALUES ($1, 'cancelled', 'guest', 'Cancelled by guest requester')`,
      [requestId],
    );
  }
  return changes;
}

export async function archiveOwnRequestPg(requestId: number, userId: number): Promise<number> {
  const { rows } = await query("SELECT requester_id, status FROM blood_requests WHERE id = $1", [requestId]);
  const req = rows[0] as any;
  if (!req || req.requester_id == null || req.requester_id !== userId) return 0;

  const newStatus = req.status === "active" ? "cancelled" : req.status;
  const { rowCount } = await query(
    `UPDATE blood_requests SET status = $1, archived_at = NOW(), archive_reason = 'deleted_by_user', updated_at = NOW() WHERE id = $2 AND archived_at IS NULL`,
    [newStatus, requestId],
  );
  const changes = rowCount || 0;
  if (changes > 0) {
    await query("DELETE FROM request_translations WHERE request_id = $1", [requestId]);
    await query(
      `INSERT INTO request_status_log (request_id, status, changed_by, note) VALUES ($1, 'cancelled', 'requester', 'Deleted by requester')`,
      [requestId],
    );
  }
  return changes;
}

export async function markOwnRequestFulfilledPg(requestId: number, userId: number): Promise<number> {
  const { rowCount } = await query(
    `UPDATE blood_requests SET status = 'fulfilled', current_status = 'fulfilled', donated_at = NOW(), updated_at = NOW() WHERE id = $1 AND requester_id = $2 AND status = 'active' AND archived_at IS NULL`,
    [requestId, userId],
  );
  const changes = rowCount || 0;
  if (changes > 0) {
    await addStatusLogPg(requestId, "fulfilled", "requester", "Marked fulfilled by requester");
  }
  return changes;
}

export async function boostOwnRequestPg(requestId: number, userId: number): Promise<number> {
  const { rowCount } = await query(
    `UPDATE blood_requests SET boosted_at = NOW(), updated_at = NOW() WHERE id = $1 AND requester_id = $2 AND status = 'active' AND archived_at IS NULL AND (boosted_at IS NULL OR boosted_at < NOW() - INTERVAL '1 day')`,
    [requestId, userId],
  );
  return rowCount || 0;
}

export async function recordRequestEditHistoryPg(entry: {
  requestId: number;
  editorType: "guest" | "user" | "admin";
  editorId?: number | null;
  editorEmail?: string | null;
  editorIp?: string | null;
  editorName?: string | null;
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
}): Promise<void> {
  const changedFields = Object.keys(entry.newValues).filter(
    (k) => JSON.stringify(entry.previousValues[k] ?? null) !== JSON.stringify(entry.newValues[k] ?? null),
  );
  if (changedFields.length === 0) return;

  await query(
    `INSERT INTO request_edit_history (request_id, editor_type, editor_id, editor_email, editor_ip, editor_name, previous_values, new_values, changed_fields) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      entry.requestId, entry.editorType, entry.editorId ?? null, entry.editorEmail ?? null,
      entry.editorIp ?? null, entry.editorName ?? null,
      JSON.stringify(entry.previousValues), JSON.stringify(entry.newValues), JSON.stringify(changedFields),
    ],
  );
  await query(
    "UPDATE blood_requests SET edited_at = NOW(), edit_count = COALESCE(edit_count, 0) + 1 WHERE id = $1",
    [entry.requestId],
  );
}

export async function getRequestEditHistoryPg(requestId: number) {
  const { rows } = await query("SELECT * FROM request_edit_history WHERE request_id = $1 ORDER BY created_at DESC", [requestId]);
  return rows;
}

// ── Request translations ──────────────────────────────────────────────

export async function saveRequestTranslationPg(requestId: number, bnText: string, bnFields?: string): Promise<void> {
  await query(
    `INSERT INTO request_translations (request_id, bn_text, bn_fields) VALUES ($1, $2, $3) ON CONFLICT (request_id) DO UPDATE SET bn_text = EXCLUDED.bn_text, bn_fields = EXCLUDED.bn_fields, created_at = NOW()`,
    [requestId, bnText, bnFields ?? null],
  );
}

export async function getRequestTranslationPg(requestId: number): Promise<string | null> {
  const { rows } = await query("SELECT bn_text FROM request_translations WHERE request_id = $1", [requestId]);
  return (rows[0] as any)?.bn_text ?? null;
}

export async function getRequestTranslationFieldsPg(requestId: number): Promise<string | null> {
  const { rows } = await query("SELECT bn_fields FROM request_translations WHERE request_id = $1", [requestId]);
  return (rows[0] as any)?.bn_fields ?? null;
}

export async function deleteRequestTranslationPg(requestId: number): Promise<void> {
  await query("DELETE FROM request_translations WHERE request_id = $1", [requestId]);
}

// ── Donor matching ────────────────────────────────────────────────────

const COMPATIBLE_DONORS: Record<string, string[]> = {
  "O-": ["O-"], "O+": ["O-", "O+"], "A-": ["O-", "A-"], "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"], "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"], "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "ANY": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findMatchingDonorsPg(
  bloodGroup: string,
  district?: string,
  upazila?: string,
  urgencyLevel: string = "normal",
  limit?: number,
  requestLat?: number | null,
  requestLng?: number | null,
  exactMatch?: boolean,
): Promise<any[]> {
  const compatibleGroups = exactMatch ? [bloodGroup] : COMPATIBLE_DONORS[bloodGroup] || [bloodGroup];
  const maxResults = limit || (urgencyLevel === "critical" ? 10 : 5);
  const reqCoords = resolveCoords(requestLat, requestLng, district, upazila);

  const placeholders = compatibleGroups.map((_, i) => `$${i + 1}`).join(",");
  const { rows: donors } = await query(
    `WITH per_type AS (
       SELECT donor_id,
         MAX(CASE WHEN donation_type = 'whole_blood' OR donation_type IS NULL THEN donation_date END) as last_wb,
         MAX(CASE WHEN donation_type = 'platelets' THEN donation_date END) as last_pl,
         MAX(CASE WHEN donation_type = 'plasma' THEN donation_date END) as last_pm
       FROM donations GROUP BY donor_id
     )
     SELECT p.id, p.full_name_en, p.full_name_bn, p.phone, p.whatsapp_number,
            p.blood_group, p.district, p.upazila, p.lat, p.lng,
            p.last_donation_date, p.hb_level,
            CASE WHEN p.is_active = FALSE THEN 0
              WHEN (p.sex = 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 12.5)
                OR (p.sex != 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 13.0) THEN 0
              WHEN COALESCE(pt.last_wb, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND COALESCE(p.last_donation_type,'whole_blood') = 'whole_blood' THEN p.last_donation_date END) IS NULL THEN 1
              WHEN (NOW() - COALESCE(pt.last_wb::timestamptz, p.last_donation_date::timestamptz)) >= INTERVAL '90 days' THEN 1
              WHEN COALESCE(pt.last_pl, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'platelets' THEN p.last_donation_date END) IS NULL THEN 1
              WHEN (NOW() - COALESCE(pt.last_pl::timestamptz, p.last_donation_date::timestamptz)) >= INTERVAL '14 days' THEN 1
              WHEN COALESCE(pt.last_pm, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'plasma' THEN p.last_donation_date END) IS NULL THEN 1
              WHEN (NOW() - COALESCE(pt.last_pm::timestamptz, p.last_donation_date::timestamptz)) >= INTERVAL '30 days' THEN 1
              ELSE 0
            END as is_eligible,
            COALESCE(d.donation_count, 0) as total_donations
     FROM profiles p
     LEFT JOIN per_type pt ON p.id = pt.donor_id
     LEFT JOIN (SELECT donor_id, COUNT(*) as donation_count FROM donations GROUP BY donor_id) d ON p.id = d.donor_id
      WHERE p.role = 'donor' AND p.is_active = TRUE AND p.is_approved = TRUE AND p.blood_group IN (${placeholders})
       AND p.full_name_en IS NOT NULL AND p.full_name_en != ''
       AND p.phone IS NOT NULL AND p.phone != ''
       AND NOT ((p.sex = 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 12.5) OR (p.sex != 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 13.0))`,
    compatibleGroups,
  );

  const scored = (donors as any[])
    .filter((d) => d.is_eligible === 1)
    .map((d) => {
      const reasons: string[] = [];
      if (d.hb_level == null) reasons.push("hb_not_tested");
      let score = 0;
      if (d.blood_group === bloodGroup) { score += 100; reasons.push("exact_blood_match"); }
      else { score += 40; reasons.push("compatible_blood"); }
      if (district && d.district === district) { score += 30; reasons.push("same_district"); }
      const donorCoords = resolveCoords(d.lat, d.lng, d.district, d.upazila, d.union_name);
      const distance = haversineKm(reqCoords.lat, reqCoords.lng, donorCoords.lat, donorCoords.lng);
      if (distance < 5) score += 20; else if (distance < 15) score += 15;
      else if (distance < 30) score += 10; else if (distance < 50) score += 5;
      if (!d.last_donation_date) { score += 10; reasons.push("never_donated"); }
      else {
        const daysSince = Math.floor((Date.now() - new Date(d.last_donation_date).getTime()) / 86400000);
        if (daysSince >= 90) score += 10; else if (daysSince >= 30) score += 7; else if (daysSince >= 14) score += 4;
      }
      return { ...d, match_rank: 0, match_score: score, match_reasons: reasons, distance_km: Math.round(distance * 10) / 10, lat: donorCoords.lat, lng: donorCoords.lng };
    });

  return scored
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, maxResults)
    .map((d, idx) => ({ ...d, match_rank: idx + 1 }));
}

export async function recordDonorMatchesPg(requestId: number, matches: any[], method: string = "sms"): Promise<number> {
  let count = 0;
  for (const m of matches) {
    await query(
      "INSERT INTO donor_matches (request_id, donor_id, match_rank, match_score, notification_method) VALUES ($1,$2,$3,$4,$5)",
      [requestId, m.id, m.match_rank, m.match_score, method],
    );
    count++;
  }
  return count;
}

export async function updateDonorMatchResponsePg(
  requestId: number,
  donorId: number,
  responseStatus: "accepted" | "declined" | "no_response",
): Promise<number> {
  const { rows } = await query("SELECT created_at FROM donor_matches WHERE request_id = $1 AND donor_id = $2", [requestId, donorId]);
  const matchRow = rows[0] as any;

  const { rowCount } = await query(
    "UPDATE donor_matches SET response_status = $1, responded_at = NOW() WHERE request_id = $2 AND donor_id = $3",
    [responseStatus, requestId, donorId],
  );
  const changes = rowCount || 0;

  if (changes > 0 && matchRow && (responseStatus === "accepted" || responseStatus === "declined")) {
    try {
      const createdAtMs = new Date(matchRow.created_at).getTime();
      const responseMs = Date.now() - createdAtMs;
      if (responseMs > 0 && responseMs < 30 * 24 * 60 * 60 * 1000) {
        await query(
          "UPDATE profiles SET response_count = COALESCE(response_count, 0) + 1, response_total_ms = COALESCE(response_total_ms, 0) + $1 WHERE id = $2",
          [Math.round(responseMs), donorId],
        );
      }
    } catch { /* best-effort */ }
  }
  return changes;
}

export async function getDonorMatchesForRequestPg(requestId: number) {
  const { rows } = await query(
    `SELECT dm.*, p.full_name_en, p.full_name_bn, p.phone, p.whatsapp_number, p.blood_group, p.district, p.upazila
     FROM donor_matches dm JOIN profiles p ON dm.donor_id = p.id WHERE dm.request_id = $1 ORDER BY dm.match_rank ASC`,
    [requestId],
  );
  return rows;
}

export async function getAllDonorMatchesPg(filters?: {
  limit?: number; offset?: number; status?: string; requestId?: number; donorId?: number;
}) {
  let sql = `
    SELECT dm.id, dm.request_id, dm.donor_id, dm.match_rank, dm.match_score,
           dm.notification_method, dm.response_status, dm.responded_at, dm.created_at,
           br.patient_name, br.blood_group, br.urgency_level, br.district, br.status AS request_status,
           p.full_name_en AS donor_name, p.full_name_bn AS donor_name_bn, p.phone AS donor_phone
    FROM donor_matches dm
    LEFT JOIN blood_requests br ON dm.request_id = br.id
    LEFT JOIN profiles p ON dm.donor_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let p = 1;
  if (filters?.status && filters.status !== "all") { sql += ` AND dm.response_status = $${p++}`; params.push(filters.status); }
  if (filters?.requestId) { sql += ` AND dm.request_id = $${p++}`; params.push(filters.requestId); }
  if (filters?.donorId) { sql += ` AND dm.donor_id = $${p++}`; params.push(filters.donorId); }

  const countSqlStr = sql.replace(/SELECT [\s\S]*?FROM/, "SELECT COUNT(*) as count FROM").replace(/WHERE 1=1/, "WHERE 1=1");
  const total = await countSql(countSqlStr, [...params]);

  sql += " ORDER BY dm.created_at DESC";
  if (filters?.limit) { sql += ` LIMIT $${p++} OFFSET $${p++}`; params.push(filters.limit, filters.offset || 0); }

  const { rows } = await query(sql, params);
  return { rows, total };
}

// ── Status log ────────────────────────────────────────────────────────

export async function addStatusLogPg(requestId: number, status: string, changedBy?: string, note?: string): Promise<number> {
  await query(
    "INSERT INTO request_status_log (request_id, status, changed_by, note) VALUES ($1,$2,$3,$4)",
    [requestId, status, changedBy || null, note || null],
  );
  const { rowCount } = await query("UPDATE blood_requests SET current_status = $1, updated_at = NOW() WHERE id = $2", [status, requestId]);
  return rowCount || 0;
}

export async function getStatusLogsPg(requestId: number) {
  const { rows } = await query("SELECT * FROM request_status_log WHERE request_id = $1 ORDER BY created_at ASC", [requestId]);
  return rows;
}

// ── Donation queries ──────────────────────────────────────────────────

export async function getAllDonationsPg() {
  const { rows } = await query(
    `SELECT d.*, p.full_name_en as donor_name, p.phone as donor_phone,
            br.patient_name, rp.full_name_en as referrer_profile_name
     FROM donations d
     LEFT JOIN profiles p ON d.donor_id = p.id
     LEFT JOIN blood_requests br ON d.request_id = br.id
     LEFT JOIN profiles rp ON d.referrer_profile_id = rp.id
     ORDER BY d.donation_date DESC`,
  );
  return rows;
}

export async function updateDonationPg(id: number, data: Record<string, any>): Promise<number> {
  const allowed = ["donor_id","request_id","blood_group","units","hospital_name","donation_date","donation_type","recipient_type","notes","referrer_profile_id","referrer_name","referrer_phone"];
  const updates = Object.entries(data).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return 0;
  const sets = updates.map(([k], i) => `${k} = $${i + 1}`);
  const params = updates.map(([, v]) => v);
  params.push(id);
  const { rowCount } = await query(`UPDATE donations SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
  return rowCount || 0;
}

export async function deleteDonationPg(id: number): Promise<number> {
  const { rowCount } = await query("DELETE FROM donations WHERE id = $1", [id]);
  return rowCount || 0;
}

// ── Stats ─────────────────────────────────────────────────────────────

export async function getDashboardStatsPg() {
  const totalUsers = await countSql("SELECT COUNT(*) as count FROM profiles");
  const totalRequests = await countSql("SELECT COUNT(*) as count FROM blood_requests");
  const activeRequests = await countSql("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'active'");
  const totalHospitals = await countSql("SELECT COUNT(*) as count FROM profiles WHERE role = 'hospital'");
  const totalDonations = await countSql("SELECT COUNT(*) as count FROM donations");
  return { totalUsers, totalRequests, activeRequests, totalHospitals, totalDonations };
}

export async function getAnalyticsStatsPg() {
  const totalUsers = await countSql("SELECT COUNT(*) as count FROM profiles");
  const totalDonors = await countSql("SELECT COUNT(*) as count FROM profiles WHERE role = 'donor'");
  const totalPatients = await countSql("SELECT COUNT(*) as count FROM profiles WHERE role = 'patient'");
  const totalHospitals = await countSql("SELECT COUNT(*) as count FROM profiles WHERE role = 'hospital'");
  const totalRequests = await countSql("SELECT COUNT(*) as count FROM blood_requests");
  const activeRequests = await countSql("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'active' AND archived_at IS NULL");
  const fulfilledRequests = await countSql("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'fulfilled'");
  const totalDonations = await countSql("SELECT COUNT(*) as count FROM donations");
  const donationsThisMonth = await countSql("SELECT COUNT(*) as count FROM donations WHERE donation_date >= NOW() - INTERVAL '30 days'");

  const { rows: bloodGroups } = await query("SELECT blood_group, COUNT(*) as count FROM profiles WHERE blood_group IS NOT NULL GROUP BY blood_group");
  const { rows: urgencyLevels } = await query("SELECT urgency_level, COUNT(*) as count FROM blood_requests GROUP BY urgency_level");
  const { rows: recentActivity } = await query("SELECT * FROM profiles ORDER BY created_at DESC LIMIT 10");

  return { totalUsers, totalDonors, totalPatients, totalHospitals, totalRequests, activeRequests, fulfilledRequests, donationsThisMonth, totalDonations, bloodGroups, urgencyLevels, recentActivity };
}

export async function getBloodInventoryPg() {
  const { rows } = await query(
    `SELECT blood_group, COUNT(*) as count FROM profiles
     WHERE role = 'donor' AND is_active = TRUE AND blood_group IS NOT NULL AND (
       last_donation_date IS NULL OR (
         CASE COALESCE(last_donation_type, 'whole_blood')
           WHEN 'platelets' THEN (NOW() - last_donation_date::timestamptz) >= INTERVAL '14 days'
           WHEN 'plasma' THEN (NOW() - last_donation_date::timestamptz) >= INTERVAL '30 days'
           ELSE (NOW() - last_donation_date::timestamptz) >= INTERVAL '90 days'
         END
       )
     ) GROUP BY blood_group ORDER BY blood_group`,
  );
  return rows;
}

export async function getDistrictStatsPg() {
  const { rows } = await query(
    `SELECT COALESCE(district, 'Unknown') as district, COUNT(*) as donors,
       SUM(CASE WHEN role = 'donor' THEN 1 ELSE 0 END) as donor_count,
       SUM(CASE WHEN role = 'hospital' THEN 1 ELSE 0 END) as hospital_count,
       SUM(CASE WHEN role = 'patient' THEN 1 ELSE 0 END) as patient_count
     FROM profiles WHERE district IS NOT NULL GROUP BY district ORDER BY donors DESC`,
  );
  return rows;
}

export async function getMonthlyStatsPg() {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const currentYear = new Date().getFullYear();
  const result: any[] = [];
  for (let index = 0; index < 12; index++) {
    const monthStr = String(index + 1).padStart(2, "0");
    const startDate = `${currentYear}-${monthStr}-01`;
    const nextMonth = index < 11 ? `${currentYear}-${String(index + 2).padStart(2, "0")}-01` : `${currentYear + 1}-01-01`;
    const requests = await countSql("SELECT COUNT(*) as count FROM blood_requests WHERE created_at >= $1 AND created_at < $2", [startDate, nextMonth]);
    const donors = await countSql("SELECT COUNT(DISTINCT donor_id) as count FROM donations WHERE donation_date >= $1 AND donation_date < $2", [startDate, nextMonth]);
    const donations = await countSql("SELECT COUNT(*) as count FROM donations WHERE donation_date >= $1 AND donation_date < $2", [startDate, nextMonth]);
    const { rows: unitRows } = await query("SELECT COALESCE(SUM(units), 0) as count FROM donations WHERE donation_date >= $1 AND donation_date < $2", [startDate, nextMonth]);
    const units = Number((unitRows[0] as any)?.count || 0);
    const newUsers = await countSql("SELECT COUNT(*) as count FROM profiles WHERE created_at >= $1 AND created_at < $2", [startDate, nextMonth]);
    result.push({ month: months[index], requests, donors, donations, units, newUsers });
  }
  return result;
}

export async function getDailyStatsPg(days: number = 30) {
  const result: any[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today); day.setDate(day.getDate() - i);
    const dayStart = day.toISOString().slice(0, 10);
    const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
    const dayEnd = nextDay.toISOString().slice(0, 10);
    const donations = await countSql("SELECT COUNT(*) as count FROM donations WHERE donation_date >= $1 AND donation_date < $2", [dayStart, dayEnd]);
    const { rows: unitRows } = await query("SELECT COALESCE(SUM(units), 0) as count FROM donations WHERE donation_date >= $1 AND donation_date < $2", [dayStart, dayEnd]);
    const units = Number((unitRows[0] as any)?.count || 0);
    const newDonors = await countSql("SELECT COUNT(*) as count FROM donations d1 WHERE d1.donation_date >= $1 AND d1.donation_date < $2 AND NOT EXISTS (SELECT 1 FROM donations d2 WHERE d2.donor_id = d1.donor_id AND d2.donation_date < $3)", [dayStart, dayEnd, dayStart]);
    const newUsers = await countSql("SELECT COUNT(*) as count FROM profiles WHERE created_at >= $1 AND created_at < $2", [dayStart, dayEnd]);
    const newRequests = await countSql("SELECT COUNT(*) as count FROM blood_requests WHERE created_at >= $1 AND created_at < $2", [dayStart, dayEnd]);
    result.push({ date: dayStart, donations, units, newDonors, newUsers, newRequests });
  }
  return result;
}

export async function getWeeklyStatsPg(weeks: number = 12) {
  const result: any[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - dayOfWeek - i * 7);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
    const startStr = weekStart.toISOString().slice(0, 10);
    const endStr = weekEnd.toISOString().slice(0, 10);
    const donations = await countSql("SELECT COUNT(*) as count FROM donations WHERE donation_date >= $1 AND donation_date < $2", [startStr, endStr]);
    const { rows: unitRows } = await query("SELECT COALESCE(SUM(units), 0) as count FROM donations WHERE donation_date >= $1 AND donation_date < $2", [startStr, endStr]);
    const units = Number((unitRows[0] as any)?.count || 0);
    const newDonors = await countSql("SELECT COUNT(*) as count FROM donations d1 WHERE d1.donation_date >= $1 AND d1.donation_date < $2 AND NOT EXISTS (SELECT 1 FROM donations d2 WHERE d2.donor_id = d1.donor_id AND d2.donation_date < $3)", [startStr, endStr, startStr]);
    const newUsers = await countSql("SELECT COUNT(*) as count FROM profiles WHERE created_at >= $1 AND created_at < $2", [startStr, endStr]);
    const newRequests = await countSql("SELECT COUNT(*) as count FROM blood_requests WHERE created_at >= $1 AND created_at < $2", [startStr, endStr]);
    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    result.push({ weekStart: startStr, weekLabel: label, donations, units, newDonors, newUsers, newRequests });
  }
  return result;
}

export async function seedDonorEligibilityDataPg(): Promise<number> {
  const { rows: donors } = await query("SELECT id FROM profiles WHERE role = 'donor' ORDER BY id");
  let count = 0;
  for (const donor of donors as any[]) {
    const mod = donor.id % 10;
    const updates: Record<number, { date: string | null; type: string }> = {
      1: { date: "2025-12-14", type: "whole_blood" }, 2: { date: "2026-02-22", type: "whole_blood" },
      3: { date: "2026-03-24", type: "platelets" }, 4: { date: "2026-04-03", type: "plasma" },
      5: { date: null, type: "whole_blood" }, 6: { date: "2026-01-03", type: "whole_blood" },
      7: { date: "2026-03-14", type: "whole_blood" }, 8: { date: "2026-04-08", type: "platelets" },
      9: { date: null, type: "whole_blood" }, 0: { date: "2026-03-19", type: "plasma" },
    };
    const u = updates[mod];
    await query("UPDATE profiles SET last_donation_date = $1, last_donation_type = $2 WHERE id = $3", [u.date, u.type, donor.id]);
    count++;
  }
  return count;
}

// ── Organizations ────────────────────────────────────────────────────

export async function getOrganizationsPg() {
  const { rows } = await query("SELECT * FROM organizations WHERE is_active = TRUE ORDER BY created_at ASC");
  return rows;
}

export async function getAllOrganizationsPg() {
  const { rows } = await query("SELECT * FROM organizations ORDER BY created_at DESC");
  return rows;
}

export async function createOrganizationPg(data: {
  name_en: string; name_bn?: string; description?: string; contact_phone?: string;
  contact_email?: string; district?: string; is_active?: number;
}): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO organizations (name_en, name_bn, description, contact_phone, contact_email, district, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [data.name_en, data.name_bn ?? null, data.description ?? null, data.contact_phone ?? null, data.contact_email ?? null, data.district ?? null, data.is_active ?? 1],
  );
  return rows[0].id;
}

export async function updateOrganizationPg(id: number, data: Record<string, any>): Promise<number> {
  const keys = Object.keys(data);
  if (keys.length === 0) return 0;
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const params = keys.map((k) => data[k]); params.push(id);
  const { rowCount } = await query(`UPDATE organizations SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
  return rowCount || 0;
}

export async function deleteOrganizationPg(id: number): Promise<number> {
  const { rowCount } = await query("UPDATE organizations SET is_active = FALSE WHERE id = $1", [id]);
  return rowCount || 0;
}

// ── Site settings ────────────────────────────────────────────────────

export async function getSiteSettingsPg(): Promise<Record<string, string>> {
  const { rows } = await query("SELECT key, value FROM site_settings");
  const out: Record<string, string> = {};
  for (const r of rows as any[]) out[r.key] = r.value ?? "";
  return out;
}

export async function updateSiteSettingsPg(settings: Record<string, string>): Promise<number> {
  for (const [key, value] of Object.entries(settings)) {
    await query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value ?? ""],
    );
  }
  return Object.keys(settings).length;
}

// ── Activity log ─────────────────────────────────────────────────────

export async function recordActivityLogPg(entry: {
  actorId?: number | null; actorEmail?: string | null; action: string;
  entityType?: string | null; entityId?: string | null; details?: string | null; ipAddress?: string | null;
}): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO activity_log (actor_id, actor_email, action, entity_type, entity_id, details, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [entry.actorId ?? null, entry.actorEmail ?? null, entry.action, entry.entityType ?? null, entry.entityId ?? null, entry.details ?? null, entry.ipAddress ?? null],
  );
  return rows[0].id;
}

export async function getActivityLogPg(filters?: {
  limit?: number; offset?: number; action?: string; entityType?: string; actorId?: number; sinceHours?: number;
}) {
  let sql = "SELECT * FROM activity_log WHERE 1=1";
  const params: any[] = [];
  let p = 1;
  if (filters?.action && filters.action !== "all") { sql += ` AND action LIKE $${p++}`; params.push(`%${filters.action}%`); }
  if (filters?.entityType && filters.entityType !== "all") { sql += ` AND entity_type = $${p++}`; params.push(filters.entityType); }
  if (filters?.actorId) { sql += ` AND actor_id = $${p++}`; params.push(filters.actorId); }
  if (filters?.sinceHours) { sql += ` AND created_at >= NOW() - ($${p++} || ' hours')::interval`; params.push(String(filters.sinceHours)); }

  const countSqlStr = sql.replace("SELECT *", "SELECT COUNT(*) as count");
  const total = await countSql(countSqlStr, [...params]);

  sql += " ORDER BY created_at DESC";
  if (filters?.limit) { sql += ` LIMIT $${p++} OFFSET $${p++}`; params.push(filters.limit, filters.offset || 0); }

  const { rows } = await query(sql, params);
  return { rows, total };
}

// ── Bulk operations ──────────────────────────────────────────────────

export async function bulkDeleteProfilesPg(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const { rowCount } = await query(`DELETE FROM profiles WHERE id IN (${placeholders}) AND role NOT IN ('admin', 'super_admin')`, ids);
  return rowCount || 0;
}

export async function bulkDeactivateProfilesPg(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const { rowCount } = await query(`UPDATE profiles SET is_active = FALSE WHERE id IN (${placeholders}) AND role NOT IN ('admin', 'super_admin')`, ids);
  return rowCount || 0;
}

export async function bulkActivateProfilesPg(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const { rowCount } = await query(`UPDATE profiles SET is_active = TRUE WHERE id IN (${placeholders})`, ids);
  return rowCount || 0;
}

export async function bulkDeleteRequestsPg(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  await query(`DELETE FROM request_translations WHERE request_id IN (${placeholders})`, ids);
  const { rowCount } = await query(`UPDATE blood_requests SET status = 'deleted', archived_at = NOW() WHERE id IN (${placeholders})`, ids);
  return rowCount || 0;
}

export async function bulkUpdateRequestStatusPg(ids: number[], status: string): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(", ");
  const { rowCount } = await query(`UPDATE blood_requests SET status = $1, current_status = $1 WHERE id IN (${placeholders})`, [status, ...ids]);
  return rowCount || 0;
}

export async function bulkDeleteDonationsPg(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const { rowCount } = await query(`DELETE FROM donations WHERE id IN (${placeholders})`, ids);
  return rowCount || 0;
}

// ── Social feed ──────────────────────────────────────────────────────

function mapSocialPostRow(r: any, viewerId: number | null) {
  return {
    kind: "post" as const, id: r.id, postId: r.id, authorId: r.author_id,
    authorName: r.author_name || "User", authorRole: r.author_role,
    authorAvatarUrl: r.author_avatar_url || null, content: r.content,
    images: r.images ? JSON.parse(r.images) : [], postType: r.post_type,
    relatedRequestId: r.related_request_id, pinned: !!r.pinned, isPublic: !!r.is_public,
    status: r.status, likeCount: r.like_count || 0, commentCount: r.comment_count || 0,
    shareCount: r.share_count || 0, likedByMe: viewerId ? r.my_like > 0 : false,
    saveCount: r.save_count || 0, savedByMe: viewerId ? r.my_save > 0 : false,
    createdAt: r.created_at,
  };
}

const URGENCY_WEIGHT: Record<string, number> = { critical: 3, urgent: 2.5, high: 2, normal: 1.5, low: 1 };

function scoreFeedItem(item: any): number {
  const raw = item.createdAt ? String(item.createdAt) : "";
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasTz = /[+-]\d{2}:?\d{2}$/.test(normalized) || normalized.endsWith("Z");
  const createdMs = normalized ? new Date(hasTz ? normalized : normalized + "Z").getTime() : Date.now();
  const ageHours = Math.max(0, (Date.now() - createdMs) / 3_600_000);
  const recency = 1 / (1 + ageHours / 24);
  let typeBoost = 1;
  if (item.kind === "request") {
    const u = String(item.urgency || "normal").toLowerCase();
    typeBoost = 1.4 + (URGENCY_WEIGHT[u] || 1);
    if (item.isLastChance) typeBoost += 1.5;
  } else if (item.postType === "admin_announcement") typeBoost = 3;
  else if (item.postType === "donation_update") typeBoost = 1.8;
  const engagement = (item.likeCount || 0) * 0.4 + (item.commentCount || 0) * 0.6 + (item.shareCount || 0) * 0.2;
  return recency * typeBoost + engagement * 0.05;
}

export async function getSocialFeedPg(opts: {
  viewerId?: number | null; isAdmin?: boolean; limit?: number; offset?: number;
  filter?: "all" | "updates" | "requests" | "announcements";
} = {}) {
  const { viewerId = null, isAdmin = false, limit = 30, offset = 0, filter = "all" } = opts;

  const { rows: postRows } = await query(
    `SELECT p.*, pr.full_name_en AS author_name, pr.avatar_url AS author_avatar_url,
       (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS like_count,
       (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id) AS comment_count,
       (SELECT COUNT(*) FROM social_post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = $1) AS my_like,
       (SELECT COUNT(*) FROM social_post_saves s WHERE s.post_id = p.id) AS save_count,
       (SELECT COUNT(*) FROM social_post_saves s2 WHERE s2.post_id = p.id AND s2.user_id = $1) AS my_save
     FROM social_posts p LEFT JOIN profiles pr ON pr.id = p.author_id
     WHERE p.status = 'active' ORDER BY p.created_at DESC`,
    [viewerId ?? -1],
  );

  let posts = (postRows as any[]).map((r) => mapSocialPostRow(r, viewerId))
    .filter((p) => p.isPublic || viewerId === p.authorId || isAdmin === true);

  // Active blood requests
  const { rows: requestRows } = await query(
    "SELECT * FROM blood_requests WHERE archived_at IS NULL AND status = 'active' ORDER BY created_at DESC LIMIT 300",
  );
  const now = Date.now();
  const requestItems = (requestRows as any[]).map((r) => ({
    kind: "request" as const, id: `req-${r.id}`, requestId: r.id, authorName: r.patient_name,
    authorRole: "patient", bloodGroup: r.blood_group, units: r.units_needed, urgency: r.urgency_level,
    district: r.district, upazila: r.upazila, neededDate: r.needed_date, neededTime: r.needed_time,
    whenNeeded: r.when_needed, hospitalName: r.hospital_name, contactNumber: r.contact_number,
    reason: r.reason, status: r.status, isLastChance: isLastChanceRequest(r, now), createdAt: r.created_at,
    likeCount: 0, commentCount: 0, shareCount: 0, pinned: false,
  }));

  let merged: any[] = [];
  if (filter === "requests") merged = requestItems;
  else if (filter === "announcements") merged = posts.filter((p) => p.postType === "admin_announcement");
  else if (filter === "updates") merged = posts.filter((p) => p.postType === "general" || p.postType === "donation_update");
  else merged = [...posts, ...requestItems];

  for (const item of merged) item._score = item.pinned ? Infinity : scoreFeedItem(item);
  merged.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return b._score - a._score;
  });

  const total = merged.length;
  const items = merged.slice(offset, offset + limit);
  return { items, total, hasMore: offset + limit < total };
}

export async function createSocialPostPg(input: {
  authorId: number; authorRole: string; content: string; images?: string[];
  postType?: string; relatedRequestId?: number | null; isPublic?: boolean;
}): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO social_posts (author_id, author_role, content, images, post_type, related_request_id, is_public) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [input.authorId, input.authorRole, input.content, input.images && input.images.length ? JSON.stringify(input.images) : null, input.postType || "general", input.relatedRequestId ?? null, input.isPublic !== false],
  );
  return rows[0].id;
}

export async function getSocialPostByIdPg(id: number) {
  const { rows } = await query(
    `SELECT p.*, pr.full_name_en AS author_name, pr.avatar_url AS author_avatar_url,
       (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS like_count,
       (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id) AS comment_count,
       (SELECT COUNT(*) FROM social_post_saves s WHERE s.post_id = p.id) AS save_count
      FROM social_posts p LEFT JOIN profiles pr ON pr.id = p.author_id WHERE p.id = $1`,
    [id],
  );
  const row = rows[0] as any;
  return row ? mapSocialPostRow(row, null) : null;
}

export async function updateSocialPostPg(id: number, data: { content?: string; images?: string[]; isPublic?: boolean }): Promise<number> {
  const fields: string[] = [];
  const params: any[] = [];
  let p = 1;
  if (data.content !== undefined) { fields.push(`content = $${p++}`); params.push(data.content); }
  if (data.images !== undefined) { fields.push(`images = $${p++}`); params.push(data.images && data.images.length ? JSON.stringify(data.images) : null); }
  if (data.isPublic !== undefined) { fields.push(`is_public = $${p++}`); params.push(data.isPublic); }
  if (!fields.length) return 0;
  fields.push("updated_at = NOW()");
  params.push(id);
  const { rowCount } = await query(`UPDATE social_posts SET ${fields.join(", ")} WHERE id = $${p++}`, params);
  return rowCount || 0;
}

export async function deleteSocialPostPg(id: number): Promise<number> {
  const { rowCount } = await query("UPDATE social_posts SET status = 'deleted', content = '', images = NULL WHERE id = $1", [id]);
  return rowCount || 0;
}

export async function toggleSocialPostLikePg(postId: number, userId: number) {
  const { rows } = await query("SELECT id FROM social_post_likes WHERE post_id = $1 AND user_id = $2", [postId, userId]);
  let liked: boolean;
  if (rows.length > 0) {
    await query("DELETE FROM social_post_likes WHERE post_id = $1 AND user_id = $2", [postId, userId]);
    liked = false;
  } else {
    await query("INSERT INTO social_post_likes (post_id, user_id) VALUES ($1, $2)", [postId, userId]);
    liked = true;
  }
  const { rows: countRows } = await query("SELECT COUNT(*) AS c FROM social_post_likes WHERE post_id = $1", [postId]);
  return { liked, likeCount: Number((countRows[0] as any)?.c || 0) };
}

export async function addSocialPostCommentPg(postId: number, authorId: number, authorRole: string, authorName: string, content: string): Promise<number> {
  const { rows } = await query<{ id: number }>(
    "INSERT INTO social_post_comments (post_id, author_id, author_role, author_name, content) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [postId, authorId, authorRole, authorName, content],
  );
  return rows[0].id;
}

export async function getSocialPostCommentsPg(postId: number) {
  const { rows } = await query("SELECT * FROM social_post_comments WHERE post_id = $1 ORDER BY created_at ASC", [postId]);
  return rows;
}

export async function incrementSocialPostSharePg(postId: number, userId: number): Promise<number> {
  await query("INSERT INTO social_post_shares (post_id, user_id) VALUES ($1, $2) ON CONFLICT (post_id, user_id) DO NOTHING", [postId, userId]);
  const { rowCount } = await query("UPDATE social_posts SET share_count = (SELECT COUNT(*) FROM social_post_shares WHERE post_id = $1) WHERE id = $2", [postId, postId]);
  return rowCount || 0;
}

export async function pinSocialPostPg(id: number, pinned: boolean): Promise<number> {
  const { rowCount } = await query("UPDATE social_posts SET pinned = $1 WHERE id = $2", [pinned, id]);
  return rowCount || 0;
}

export async function adminGetSocialPostsPg(opts: { filter?: string; page?: number; pageSize?: number } = {}) {
  const { filter = "all", page = 1, pageSize = 20 } = opts;
  let where = "1=1";
  if (filter === "pinned") where = "p.pinned = TRUE";
  else if (filter === "deleted") where = "p.status = 'deleted'";
  const { rows } = await query(
    `SELECT p.*, pr.full_name_en AS author_name,
       (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) AS like_count,
       (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id) AS comment_count
     FROM social_posts p LEFT JOIN profiles pr ON pr.id = p.author_id WHERE ${where} ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize],
  );
  const total = await countSql(`SELECT COUNT(*) as count FROM social_posts p WHERE ${where}`);
  return { items: (rows as any[]).map((r) => mapSocialPostRow(r, null)), total, hasMore: page * pageSize < total };
}

// ── Stories (24h auto-expire) ────────────────────────────────────────

export async function createStoryPg(input: {
  authorId: number; imageUrl?: string | null; content?: string | null;
}): Promise<number> {
  const { rows } = await query<{ id: number }>(
    `INSERT INTO stories (author_id, image_url, content, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours') RETURNING id`,
    [input.authorId, input.imageUrl ?? null, input.content ?? null],
  );
  return rows[0].id;
}

export async function getStoriesPg() {
  const { rows } = await query(
    `SELECT s.*, pr.full_name_en AS author_name, pr.avatar_url AS author_avatar_url
       FROM stories s LEFT JOIN profiles pr ON pr.id = s.author_id
      WHERE s.expires_at > NOW() ORDER BY s.created_at DESC LIMIT 200`,
  );
  return rows;
}

export async function deleteStoryPg(id: number, authorId: number): Promise<number> {
  const { rowCount } = await query(
    "DELETE FROM stories WHERE id = $1 AND author_id = $2",
    [id, authorId],
  );
  return rowCount || 0;
}

// ── Post saves / bookmarks ───────────────────────────────────────────

export async function toggleSocialPostSavePg(postId: number, userId: number) {
  const { rows } = await query(
    "SELECT id FROM social_post_saves WHERE post_id = $1 AND user_id = $2",
    [postId, userId],
  );
  let saved: boolean;
  if (rows.length > 0) {
    await query("DELETE FROM social_post_saves WHERE post_id = $1 AND user_id = $2", [postId, userId]);
    saved = false;
  } else {
    await query("INSERT INTO social_post_saves (post_id, user_id) VALUES ($1, $2)", [postId, userId]);
    saved = true;
  }
  const { rows: countRows } = await query(
    "SELECT COUNT(*) AS c FROM social_post_saves WHERE post_id = $1",
    [postId],
  );
  return { saved, saveCount: Number((countRows[0] as any)?.c || 0) };
}

// ── Web Push subscriptions ───────────────────────────────────────────

export async function addPushSubscriptionPg(input: {
  userId?: number | null; endpoint: string; p256dh: string; auth: string;
}): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth_key = EXCLUDED.auth_key`,
    [input.userId ?? null, input.endpoint, input.p256dh, input.auth],
  );
}

export async function deletePushSubscriptionPg(endpoint: string): Promise<void> {
  await query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
}

export async function getAllPushSubscriptionsPg() {
  const { rows } = await query(
    "SELECT endpoint, p256dh, auth_key FROM push_subscriptions",
  );
  return (rows as any[]).map((r) => ({
    endpoint: r.endpoint,
    keys: { p256dh: r.p256dh, auth: r.auth_key },
  }));
}

// ── Bookmarks ────────────────────────────────────────────────────────

export async function toggleBookmarkPg(userId: number, donorId: number): Promise<boolean> {
  if (userId === donorId) return false;
  const { rows } = await query("SELECT 1 FROM donor_bookmarks WHERE user_id = $1 AND donor_id = $2", [userId, donorId]);
  if (rows.length > 0) {
    await query("DELETE FROM donor_bookmarks WHERE user_id = $1 AND donor_id = $2", [userId, donorId]);
    return false;
  }
  await query("INSERT INTO donor_bookmarks (user_id, donor_id) VALUES ($1, $2)", [userId, donorId]);
  return true;
}

export async function isBookmarkedPg(userId: number, donorId: number): Promise<boolean> {
  const { rows } = await query("SELECT 1 FROM donor_bookmarks WHERE user_id = $1 AND donor_id = $2", [userId, donorId]);
  return rows.length > 0;
}

export async function getBookmarkedDonorIdsPg(userId: number): Promise<number[]> {
  const { rows } = await query("SELECT donor_id FROM donor_bookmarks WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return (rows as any[]).map((r) => r.donor_id);
}

export async function getBookmarkedDonorsPg(userId: number) {
  const { rows } = await query(
    `SELECT p.* FROM donor_bookmarks b JOIN profiles p ON p.id = b.donor_id WHERE b.user_id = $1 AND p.role = 'donor' ORDER BY b.created_at DESC`,
    [userId],
  );
  return rows;
}

// ── Presence tracking ────────────────────────────────────────────────

export async function updateLastActivePg(userId: number): Promise<void> {
  const now = new Date().toISOString();
  const { rows } = await query("SELECT last_active_at FROM profiles WHERE id = $1", [userId]);
  const row = rows[0] as any;
  if (row?.last_active_at) {
    try {
      const last = new Date(row.last_active_at).getTime();
      if (Date.now() - last < 4 * 60 * 1000) return;
    } catch { /* fall through */ }
  }
  await query("UPDATE profiles SET last_active_at = $1 WHERE id = $2", [now, userId]);
}

// ── Contact click tracking ───────────────────────────────────────────

export async function recordContactClickPg(donorId: number, buttonType: string, clickerIp: string | null, clickerUserId: number | null, clickerUserName: string | null): Promise<void> {
  await query(
    "INSERT INTO donor_contact_clicks (donor_id, button_type, clicker_ip, clicker_user_id, clicker_user_name) VALUES ($1,$2,$3,$4,$5)",
    [donorId, buttonType, clickerIp, clickerUserId, clickerUserName],
  );
}

export async function getDonorContactClickStatsPg(donorId: number) {
  const { rows: totalsRows } = await query(
    `SELECT SUM(CASE WHEN button_type = 'call' THEN 1 ELSE 0 END) as total_call,
       SUM(CASE WHEN button_type = 'whatsapp' THEN 1 ELSE 0 END) as total_whatsapp,
       COUNT(*) as total_clicks, COUNT(DISTINCT COALESCE(clicker_user_id, clicker_ip)) as unique_clickers
     FROM donor_contact_clicks WHERE donor_id = $1`,
    [donorId],
  );
  const totals = totalsRows[0] as any;
  const { rows: recentClicks } = await query("SELECT * FROM donor_contact_clicks WHERE donor_id = $1 ORDER BY created_at DESC LIMIT 20", [donorId]);
  return {
    totalCall: Number(totals?.total_call ?? 0), totalWhatsapp: Number(totals?.total_whatsapp ?? 0),
    totalClicks: Number(totals?.total_clicks ?? 0), uniqueClickers: Number(totals?.unique_clickers ?? 0), recentClicks,
  };
}

// ── Referrer candidates ──────────────────────────────────────────────

export async function searchReferrerCandidatesPg(search: string, limit: number = 8) {
  const { rows } = await query(
    `SELECT id, full_name_en, full_name_bn, phone FROM profiles WHERE is_active = TRUE AND (full_name_en LIKE $1 OR full_name_bn LIKE $1 OR phone LIKE $1) ORDER BY full_name_en ASC LIMIT $2`,
    [`%${search}%`, limit],
  );
  return rows;
}