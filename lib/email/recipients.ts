/**
 * Donor alert email recipient selection.
 *
 * Targeting rules (per docs/EMAIL-SYSTEM-PLAN.md §2):
 *  - Rangpur core area (Paglapir / Rangpur Sadar / a union of Rangpur Sadar):
 *      donors within 5 km of the request location
 *      + donors in the SAME union
 *      + donors in Rangpur Sadar / Paglapir
 *  - Any other upazila: donors in THAT upazila only.
 *
 * Every recipient must pass the eligibility filter (active, exact blood
 * group, past the donation cooldown, has an email, opted in to emails).
 * Hard cap: MAX_EMAIL_RECIPIENTS per request, closest donors first.
 *
 * SERVER-ONLY (imports the DB layer).
 */

import { getDb } from "@/lib/db";
import {
  RANGPUR_UPAZILAS,
  RANGPUR_DISTRICTS,
} from "@/lib/constants/rangpur";
import { toValidBangladeshCoordinates } from "@/lib/location-coordinates";
import { getEmailSettingInt } from "@/lib/email/template-settings";

export const MAX_EMAIL_RECIPIENTS = 15;
export const MAX_SOS_EMAIL_RECIPIENTS = 40;
const NEARBY_RADIUS_KM = 5;

/** Upazilas treated as the "Rangpur core area" (name_en lowercase + name_bn). */
const RANGPUR_CORE_UPAZILAS = new Set(
  RANGPUR_UPAZILAS.filter(
    (u) => u.id === "rangpur_sadar" || u.id === "rangpur_paglapir",
  ).flatMap((u) => [u.name_en.toLowerCase(), u.name_bn]),
);

export interface DonorAlertRecipient {
  id: number;
  email: string;
  full_name_en: string | null;
  full_name_bn: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  union_name: string | null;
  distance_km: number | null;
  /** Why this donor was selected (ranking/debug). */
  selection_reason:
    | "within_5km"
    | "same_union"
    | "core_upazila"
    | "same_upazila"
    | "sos_same_upazila"
    | "sos_same_district";
  match_rank: number;
  match_score: number;
}

/** Raw donor row shape produced by the eligibility query. */
export interface EmailDonorRow {
  id: number;
  email: string;
  full_name_en: string | null;
  full_name_bn: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  union_name: string | null;
  lat: number | null;
  lng: number | null;
  is_eligible: number;
}

const norm = (s: string | null | undefined) =>
  (s || "").trim().toLowerCase();

/** True when the request is in Paglapir, Rangpur Sadar, or one of its unions. */
export function isRangpurCoreRequest(request: {
  upazila?: string | null;
  union_name?: string | null;
}): boolean {
  if (request.union_name && request.union_name.trim()) return true;
  return RANGPUR_CORE_UPAZILAS.has(norm(request.upazila));
}

// ── Coordinate resolution (mirrors lib/db.ts resolveCoords logic) ───────

function resolvePoint(
  lat?: number | null,
  lng?: number | null,
  districtName?: string | null,
  upazilaName?: string | null,
): { lat: number; lng: number } {
  const exact = toValidBangladeshCoordinates(lat, lng);
  if (exact) return exact;
  if (upazilaName) {
    const lower = upazilaName.toLowerCase();
    const u = RANGPUR_UPAZILAS.find(
      (x) => x.name_en.toLowerCase() === lower || x.name_bn === upazilaName,
    );
    if (u) return { lat: u.lat, lng: u.lng };
  }
  if (districtName) {
    const lower = districtName.toLowerCase();
    const d = RANGPUR_DISTRICTS.find(
      (x) => x.name_en.toLowerCase() === lower || x.name_bn === districtName,
    );
    if (d) return { lat: d.lat, lng: d.lng };
  }
  return { lat: 25.7439, lng: 89.2752 }; // Rangpur city center
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Pure selection function: given a request and a list of *eligible* donor
 * rows (already filtered for blood group, cooldown, activity, email, opt-in
 * by the SQL query), apply the geo targeting rules and pick at most
 * maxRecipients recipients (default MAX_EMAIL_RECIPIENTS), closest first.
 *
 * Exported separately from the DB query so it is unit-testable.
 */
export function selectDonorAlertRecipientsFromDonors(
  request: {
    district?: string | null;
    upazila?: string | null;
    union_name?: string | null;
    lat?: number | null;
    lng?: number | null;
  },
  donors: EmailDonorRow[],
  maxRecipients: number = MAX_EMAIL_RECIPIENTS,
): DonorAlertRecipient[] {
  const reqPoint = resolvePoint(
    request.lat,
    request.lng,
    request.district,
    request.upazila,
  );
  const core = isRangpurCoreRequest(request);
  const reqUpazila = norm(request.upazila);
  const reqUnion = norm(request.union_name);

  const selected: DonorAlertRecipient[] = [];

  for (const d of donors) {
    if (d.is_eligible !== 1) continue;

    const donorPoint = resolvePoint(
      d.lat,
      d.lng,
      d.district,
      d.upazila,
    );
    const distance = haversineKm(
      reqPoint.lat,
      reqPoint.lng,
      donorPoint.lat,
      donorPoint.lng,
    );

    let reason: DonorAlertRecipient["selection_reason"] | null = null;
    if (core) {
      if (distance <= NEARBY_RADIUS_KM) reason = "within_5km";
      else if (reqUnion && norm(d.union_name) === reqUnion)
        reason = "same_union";
      else if (RANGPUR_CORE_UPAZILAS.has(norm(d.upazila)))
        reason = "core_upazila";
    } else {
      if (reqUpazila && norm(d.upazila) === reqUpazila)
        reason = "same_upazila";
    }
    if (!reason) continue;

    selected.push({
      id: d.id,
      email: d.email,
      full_name_en: d.full_name_en,
      full_name_bn: d.full_name_bn,
      blood_group: d.blood_group,
      district: d.district,
      upazila: d.upazila,
      union_name: d.union_name,
      distance_km: Math.round(distance * 10) / 10,
      selection_reason: reason,
      match_rank: 0,
      match_score: 0,
    });
  }

  // Rank: 5 km ring first (closest first), then same-union, then
  // core-upazila / same-upazila (closest first within each bucket).
  const bucketOrder = (r: DonorAlertRecipient) =>
    r.selection_reason === "within_5km"
      ? 0
      : r.selection_reason === "same_union"
        ? 1
        : 2;

  selected.sort(
    (a, b) =>
      bucketOrder(a) - bucketOrder(b) ||
      (a.distance_km ?? 9999) - (b.distance_km ?? 9999) ||
      a.id - b.id,
  );

  return selected.slice(0, maxRecipients).map((r, idx) => ({
    ...r,
    match_rank: idx + 1,
    // Simple score: distance-based, consistent with "closest = best".
    match_score: Math.max(
      1,
      100 - idx * 2 - Math.round(r.distance_km ?? 50),
    ),
  }));
}

/**
 * SOS Emergency selection (pure, unit-testable):
 * donors in the SAME upazila first, then the SAME district (zila),
 * same blood group, active + eligible only, closest first within each
 * bucket, hard cap maxRecipients (default MAX_SOS_EMAIL_RECIPIENTS, 40).
 */
export function selectSosAlertRecipientsFromDonors(
  request: {
    district?: string | null;
    upazila?: string | null;
    union_name?: string | null;
    lat?: number | null;
    lng?: number | null;
  },
  donors: EmailDonorRow[],
  maxRecipients: number = MAX_SOS_EMAIL_RECIPIENTS,
): DonorAlertRecipient[] {
  const reqPoint = resolvePoint(
    request.lat,
    request.lng,
    request.district,
    request.upazila,
  );
  const reqUpazila = norm(request.upazila);
  const reqDistrict = norm(request.district);

  const selected: DonorAlertRecipient[] = [];

  for (const d of donors) {
    if (d.is_eligible !== 1) continue;

    let reason: DonorAlertRecipient["selection_reason"] | null = null;
    if (reqUpazila && norm(d.upazila) === reqUpazila) {
      reason = "sos_same_upazila";
    } else if (reqDistrict && norm(d.district) === reqDistrict) {
      reason = "sos_same_district";
    }
    if (!reason) continue;

    const donorPoint = resolvePoint(d.lat, d.lng, d.district, d.upazila);
    const distance = haversineKm(
      reqPoint.lat,
      reqPoint.lng,
      donorPoint.lat,
      donorPoint.lng,
    );

    selected.push({
      id: d.id,
      email: d.email,
      full_name_en: d.full_name_en,
      full_name_bn: d.full_name_bn,
      blood_group: d.blood_group,
      district: d.district,
      upazila: d.upazila,
      union_name: d.union_name,
      distance_km: Math.round(distance * 10) / 10,
      selection_reason: reason,
      match_rank: 0,
      match_score: 0,
    });
  }

  // Same-upazila donors rank before same-district ones; closest first.
  selected.sort(
    (a, b) =>
      (a.selection_reason === "sos_same_upazila" ? 0 : 1) -
        (b.selection_reason === "sos_same_upazila" ? 0 : 1) ||
      (a.distance_km ?? 9999) - (b.distance_km ?? 9999) ||
      a.id - b.id,
  );

  return selected.slice(0, maxRecipients).map((r, idx) => ({
    ...r,
    match_rank: idx + 1,
    match_score: Math.max(1, 100 - idx - Math.round(r.distance_km ?? 50)),
  }));
}

/**
 * Query eligible donors (exact blood group, active, past cooldown, has
 * email, opted in) — shared by the normal and SOS selection functions.
 */
function queryEligibleDonors(bloodGroup: string): EmailDonorRow[] {
  const db = getDb();

  // Eligibility mirrors findMatchingDonors() in lib/db.ts:
  // active donor-role profiles, exact blood group, Hb deferral, and
  // per-type donation cooldowns (whole blood 90d, platelets 14d, plasma 30d).
  return db
    .prepare(
      `
      WITH per_type AS (
        SELECT
          donor_id,
          MAX(CASE WHEN donation_type = 'whole_blood' OR donation_type IS NULL THEN donation_date END) as last_wb,
          MAX(CASE WHEN donation_type = 'platelets' THEN donation_date END) as last_pl,
          MAX(CASE WHEN donation_type = 'plasma' THEN donation_date END) as last_pm
        FROM donations GROUP BY donor_id
      )
      SELECT p.id, p.email, p.full_name_en, p.full_name_bn,
             p.blood_group, p.district, p.upazila, p.union_name,
             p.lat, p.lng,
             CASE WHEN p.is_active != 1 THEN 0
               WHEN (p.sex = 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 12.5)
                 OR (p.sex != 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 13.0) THEN 0
               WHEN COALESCE(pt.last_wb, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND COALESCE(p.last_donation_type,'whole_blood') = 'whole_blood' THEN p.last_donation_date END) IS NULL THEN 1
               WHEN (julianday('now') - julianday(COALESCE(pt.last_wb, p.last_donation_date))) >= 90 THEN 1
               WHEN COALESCE(pt.last_pl, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'platelets' THEN p.last_donation_date END) IS NULL THEN 1
               WHEN (julianday('now') - julianday(COALESCE(pt.last_pl, p.last_donation_date))) >= 14 THEN 1
               WHEN COALESCE(pt.last_pm, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'plasma' THEN p.last_donation_date END) IS NULL THEN 1
               WHEN (julianday('now') - julianday(COALESCE(pt.last_pm, p.last_donation_date))) >= 30 THEN 1
               ELSE 0
             END as is_eligible
      FROM profiles p
      LEFT JOIN per_type pt ON p.id = pt.donor_id
      WHERE p.role = 'donor'
        AND p.is_active = 1
        AND p.blood_group = ?
        AND p.email IS NOT NULL AND p.email != ''
        AND COALESCE(p.email_opt_in, 1) = 1
    `,
    )
    .all(bloodGroup) as EmailDonorRow[];
}

/** Normal request: apply the geo targeting rules to eligible donors. */
export function getEmailAlertRecipients(
  request: {
    blood_group: string;
    district?: string | null;
    upazila?: string | null;
    union_name?: string | null;
    lat?: number | null;
    lng?: number | null;
  },
): DonorAlertRecipient[] {
  // Admin-configurable cap (Email Center → Alert Settings), default 15.
  const cap = getEmailSettingInt("alert_recipient_cap", MAX_EMAIL_RECIPIENTS);
  return selectDonorAlertRecipientsFromDonors(
    request,
    queryEligibleDonors(request.blood_group),
    cap,
  );
}

/** Emergency SOS: same upazila + same district donors, cap 40. */
export function getSosAlertRecipients(
  request: {
    blood_group: string;
    district?: string | null;
    upazila?: string | null;
    union_name?: string | null;
    lat?: number | null;
    lng?: number | null;
  },
): DonorAlertRecipient[] {
  // Admin-configurable cap (Email Center → Alert Settings), default 40.
  const cap = getEmailSettingInt("sos_recipient_cap", MAX_SOS_EMAIL_RECIPIENTS);
  return selectSosAlertRecipientsFromDonors(
    request,
    queryEligibleDonors(request.blood_group),
    cap,
  );
}
