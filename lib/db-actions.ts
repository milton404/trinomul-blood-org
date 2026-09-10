"use server";

import {
  getProfileByUserId,
  getProfileByEmail,
  getProfileByPhone,
  createProfile as dbCreateProfile,
  updateProfile as dbUpdateProfile,
  getAllProfiles,
  getProfilesByRole,
  getProfilesByRoles,
  deleteProfile as dbDeleteProfile,
  searchProfiles as dbSearchProfiles,
  getPendingVerifications as dbGetPendingVerifications,
  getAdmins as dbGetAdmins,
  getActiveBloodRequests,
  getAllBloodRequests,
  searchBloodRequests as dbSearchBloodRequests,
  createBloodRequest as dbCreateBloodRequest,
  updateBloodRequest as dbUpdateBloodRequest,
  updateRequestStatus as dbUpdateRequestStatus,
  deleteRequest as dbDeleteRequest,
  createDonation as dbCreateDonation,
  getDonationsByDonorId,
  getAllDonations,
  getBloodRequestsByHospital,
  getDonationsByHospital,
  getHospitalStats,
  getDashboardStats,
  getAnalyticsStats,
  getDonorsWithStats,
  getMonthlyStats,
  getDailyStats,
  getWeeklyStats,
  getHomepageStats,
  getBloodInventory,
  getDistrictStats,
  seedDonorEligibilityData,
  findMatchingDonors,
  recordDonorMatches,
  updateDonorMatchResponse,
  getDonorMatchesForRequest,
  addStatusLog,
  getStatusLogs,
  getBloodRequestByTrackingCode,
  getBloodRequestById,
  generateTrackingCode,
  getPublicTransparencyStats,
  getTopDonors,
  getDonorOfTheMonth,
  getDonationImpactStats,
  getOrganizations,
  getAllOrganizations as dbGetAllOrganizations,
  createOrganization as dbCreateOrganization,
  updateOrganization as dbUpdateOrganization,
  deleteOrganization as dbDeleteOrganization,
  updateDonation as dbUpdateDonation,
  deleteDonation as dbDeleteDonation,
  getAllDonorMatches as dbGetAllDonorMatches,
  getSiteSettings as dbGetSiteSettings,
  updateSiteSettings as dbUpdateSiteSettings,
  recordActivityLog as dbRecordActivityLog,
  getActivityLog as dbGetActivityLog,
  getVisibleBloodRequests,
  getRequestStatusCounts,
  getAdminRequests,
  getTopReferrers,
  archiveOwnRequest as dbArchiveOwnRequest,
  getBloodRequestsByRequester,
  searchReferrerCandidates,
  getActiveRequestsForDonor,
  getRequestCollectedUnits,
  updateOwnBloodRequest,
  markOwnRequestFulfilled,
  boostOwnRequest,
  updateGuestBloodRequest,
  archiveGuestRequest,
  recordRequestEditHistory,
  getRequestEditHistory,
  saveRequestTranslation,
  getRequestTranslation,
  getRequestTranslationFields,
  deleteRequestTranslation,
  createSavedPatient,
  getSavedPatients,
  deleteSavedPatient,
  setAdminAssignment,
  recordAdminPolicyAcceptance,
  // social feed
  createSocialPost,
  getSocialFeed,
  getSocialPostById,
  updateSocialPost,
  deleteSocialPost,
  toggleSocialPostLike,
  addSocialPostComment,
  getSocialPostComments,
  incrementSocialPostShare,
  pinSocialPost,
  adminGetSocialPosts,
  createStory,
  getStories,
  deleteStory,
  toggleSocialPostSave,
  incrementPostView,
  recordStoryView,
  getStoryViewers,
  getSocialPostFull,
  getMyPosts,
  getSavedPosts,
  createNotification,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  insertContactMessage as dbInsertContactMessage,
  getContactMessages as dbGetContactMessages,
  markContactMessageRead as dbMarkContactMessageRead,
  getUnreadContactMessageCount as dbGetUnreadContactMessageCount,

  runRequestLifecycleSweep,
  purgeOldArchivedRequests,
  toggleBookmark as dbToggleBookmark,
  isBookmarked as dbIsBookmarked,
  getBookmarkedDonorIds as dbGetBookmarkedDonorIds,
  getBookmarkedDonors as dbGetBookmarkedDonors,
  updateLastActive as dbUpdateLastActive,
  recordContactClick as dbRecordContactClick,
  getDonorContactClickStats as dbGetDonorContactClickStats,
  getDonorApplications as dbGetDonorApplications,
  countDonorApplications as dbCountDonorApplications,
  bulkDeleteProfiles,
  bulkDeactivateProfiles,
  bulkActivateProfiles,
  bulkDeleteRequests,
  bulkUpdateRequestStatus,
  bulkDeleteDonations,
} from "./db";
import {
  getAdminContext,
  requireAdmin,
  requireFullAdmin,
  assertDistrictAllowed,
  districtMatchValues,
} from "./auth/permissions";
import { getSession } from "./auth/session";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  incrementRateLimit,
  enforceRateLimit,
} from "./auth/rateLimit";
import { RANGPUR_DISTRICTS, RANGPUR_UPAZILAS, RANGPUR_UNIONS } from "./constants/rangpur";
import { toValidBangladeshCoordinates } from "./location-coordinates";
import { callLLM } from "./ai/providers";
import { hashPassword } from "./auth/password";
import {
  sendDonorApplicationRejectedEmail,
  sendApplicationApprovedEmail,
  dispatchBloodRequestEmails,
} from "./email";
import { sendContactMessageEmail } from "./email/templates/contact-message";
import {
  getEmailSettingBool,
  getEmailSettingInt,
} from "./email/template-settings";
import { isSupabaseAvailable, query as pgQuery } from "@/lib/supabase/client";
import { sendPushToAll, savePushSubscription, removePushSubscription } from "./push";
import {
  getVisibleBloodRequestsPg,
  getActiveBloodRequestsPg,
  getAllBloodRequestsPg,
  getBloodRequestByIdPg,
  getBloodRequestByTrackingCodePg,
  createBloodRequestPg,
  runRequestLifecycleSweepPg,
  purgeOldArchivedRequestsPg,
  getHomepageStatsPg,
  getPublicTransparencyStatsPg,
  getDonorOfTheMonthPg,
  getDonationImpactStatsPg,
  getTopReferrersPg,
} from "@/lib/pg/requests";
import {
  createProfilePg,
  getAllProfilesPg,
  getProfilesByRolesPg,
  deleteProfilePg,
  searchProfilesPg,
  getAdminsPg,
  getPendingVerificationsPg,
  getDonorApplicationsPg,
  countDonorApplicationsPg,
  setAdminAssignmentPg,
  recordAdminPolicyAcceptancePg,
  searchBloodRequestsPg,
  updateBloodRequestPg,
  updateRequestStatusPg,
  deleteRequestPg,
  getVisibleBloodRequestsPg2,
  getRequestStatusCountsPg,
  getAdminRequestsPg,
  getBloodRequestsByHospitalPg,
  getDonationsByHospitalPg,
  getHospitalStatsPg,
  getRequestCollectedUnitsPg,
  updateOwnBloodRequestPg,
  updateGuestBloodRequestPg,
  archiveGuestRequestPg,
  archiveOwnRequestPg,
  markOwnRequestFulfilledPg,
  boostOwnRequestPg,
  recordRequestEditHistoryPg,
  getRequestEditHistoryPg,
  saveRequestTranslationPg,
  getRequestTranslationPg,
  getRequestTranslationFieldsPg,
  deleteRequestTranslationPg,
  findMatchingDonorsPg,
  recordDonorMatchesPg,
  updateDonorMatchResponsePg,
  getDonorMatchesForRequestPg,
  getAllDonorMatchesPg,
  addStatusLogPg,
  getStatusLogsPg,
  getAllDonationsPg,
  updateDonationPg,
  deleteDonationPg,
  getDashboardStatsPg,
  getAnalyticsStatsPg,
  getBloodInventoryPg,
  getDistrictStatsPg,
  getMonthlyStatsPg,
  getDailyStatsPg,
  getWeeklyStatsPg,
  seedDonorEligibilityDataPg,
  getOrganizationsPg,
  getAllOrganizationsPg,
  createOrganizationPg,
  updateOrganizationPg,
  deleteOrganizationPg,
  getSiteSettingsPg,
  updateSiteSettingsPg,
  recordActivityLogPg,
  getActivityLogPg,
  bulkDeleteProfilesPg,
  bulkDeactivateProfilesPg,
  bulkActivateProfilesPg,
  bulkDeleteRequestsPg,
  bulkUpdateRequestStatusPg,
  bulkDeleteDonationsPg,
  getSocialFeedPg,
  createSocialPostPg,
  getSocialPostByIdPg,
  updateSocialPostPg,
  deleteSocialPostPg,
  toggleSocialPostLikePg,
  addSocialPostCommentPg,
  getSocialPostCommentsPg,
  incrementSocialPostSharePg,
  pinSocialPostPg,
  adminGetSocialPostsPg,
  createStoryPg,
  getStoriesPg,
  deleteStoryPg,
  toggleSocialPostSavePg,
  incrementPostViewPg,
  recordStoryViewPg,
  getStoryViewersPg,
  getSocialPostFullPg,
  getMyPostsPg,
  getSavedPostsPg,
  createNotificationPg,
  getMyNotificationsPg,
  markNotificationReadPg,
  markAllNotificationsReadPg,
  toggleBookmarkPg,
  isBookmarkedPg,
  getBookmarkedDonorIdsPg,
  getBookmarkedDonorsPg,
  updateLastActivePg,
  recordContactClickPg,
  getDonorContactClickStatsPg,
  searchReferrerCandidatesPg,
  insertContactMessagePg,
  getContactMessagesPg,
  markContactMessageReadPg,
  getUnreadContactMessageCountPg,
} from "@/lib/pg/queries";

// Profile actions
export async function serverGetProfileByUserId(userId: number) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery("SELECT * FROM profiles WHERE id = $1", [userId]);
    return rows[0] || null;
  }
  return getProfileByUserId(userId);
}

export async function serverGetProfileByEmail(email: string) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery("SELECT * FROM profiles WHERE email = $1", [email]);
    return rows[0] || null;
  }
  return getProfileByEmail(email);
}

export async function serverGetProfileByPhone(phone: string) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery("SELECT * FROM profiles WHERE phone = $1", [phone]);
    return rows[0] || null;
  }
  return getProfileByPhone(phone);
}

/**
 * If the payload has no valid lat/lng but includes district/upazila/union,
 * auto-resolve coordinates from the geographic hierarchy so the donor
 * shows on the map at their upazila/union centroid even without a map pick.
 *
 * - lat/lng present & valid → kept as-is (user picked a precise location)
 * - lat/lng absent (key not in object) → not touched (preserves existing DB coords)
 * - lat/lng explicitly null + district/upazila/union present → resolved
 */
function withResolvedCoords(data: Record<string, any>): Record<string, any> {
  const valid = toValidBangladeshCoordinates(data.lat, data.lng);
  if (valid) return data;
  if (!("lat" in data) && !("lng" in data)) return data;
  if (data.district || data.upazila || data.union_name) {
    const coords = resolveCoordsLocal(
      null, null, data.district, data.upazila, data.union_name,
    );
    return { ...data, lat: coords.lat, lng: coords.lng };
  }
  return data;
}

export async function serverCreateProfile(profile: Record<string, any>) {
  const resolved = withResolvedCoords(profile);
  if (isSupabaseAvailable()) return createProfilePg(resolved);
  return dbCreateProfile(resolved);
}

/**
 * Quick-create a minimal donor profile from the admin donation modal when
 * the searched donor is not registered. Requires admin auth. If a profile
 * with the same phone already exists, returns that profile instead of
 * creating a duplicate. Generates a placeholder email + random password
 * so the NOT NULL constraints on `profiles` are satisfied.
 */
export async function serverQuickCreateDonor(input: {
  fullName: string;
  phone: string;
  bloodGroup: string;
  district?: string | null;
  upazila?: string | null;
  password?: string;
}): Promise<{ id: number; full_name_en: string; full_name_bn: string | null; phone: string; blood_group: string }> {
  await requireAdmin();

  const phone = input.phone.trim();
  const fullName = input.fullName.trim();
  if (!fullName) throw new Error("Name is required");
  if (!phone) throw new Error("Phone is required");

  const usePg = isSupabaseAvailable();

  // Reuse existing profile by phone — don't create duplicates
  const existing = (await (usePg ? serverGetProfileByPhone(phone) : getProfileByPhone(phone))) as any;
  if (existing) {
    return {
      id: existing.id,
      full_name_en: existing.full_name_en || existing.full_name_bn || fullName,
      full_name_bn: existing.full_name_bn || null,
      phone: existing.phone,
      blood_group: existing.blood_group || input.bloodGroup,
    };
  }

  // Generate placeholder email (UNIQUE NOT NULL); hash the admin-provided password
  const placeholderEmail = `donor_${phone.replace(/\D/g, "")}@guest.local`;
  const passwordHash = input.password
    ? await hashPassword(input.password)
    : `$2a$10$${Math.random().toString(36).slice(2).padEnd(22, "0")}${Math.random().toString(36).slice(2).padEnd(22, "0")}`;

  let id: number;
  if (usePg) {
    const { rows } = await pgQuery<{ id: number }>(
      `INSERT INTO profiles (email, password_hash, full_name_en, full_name_bn, phone, blood_group, role, district, upazila)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        placeholderEmail,
        passwordHash,
        fullName,
        null,
        phone,
        input.bloodGroup,
        "donor",
        input.district || null,
        input.upazila || null,
      ],
    );
    id = rows[0].id;

    try {
      await pgQuery(
        `INSERT INTO activity_log (actor_id, actor_email, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [null, null, "donor_quick_created", "profile", String(id), `Quick-created donor "${fullName}" (${phone}) from donation modal`],
      );
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
  } else {
    id = dbCreateProfile({
      email: placeholderEmail,
      passwordHash: passwordHash,
      fullNameEn: fullName,
      fullNameBn: null,
      phone,
      bloodGroup: input.bloodGroup,
      role: "donor",
      district: input.district || null,
      upazila: input.upazila || null,
      hospitalNameEn: null,
      hospitalNameBn: null,
      licenseNumber: null,
      website: null,
      lat: null,
      lng: null,
    });

    try {
      dbRecordActivityLog({
        actorId: null,
        actorEmail: null,
        action: "donor_quick_created",
        entityType: "profile",
        entityId: String(id),
        details: `Quick-created donor "${fullName}" (${phone}) from donation modal`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
  }

  return {
    id,
    full_name_en: fullName,
    full_name_bn: null,
    phone,
    blood_group: input.bloodGroup,
  };
}

/**
 * Fields regular users can never change about themselves.
 *
 * Verification fields (is_verified, verification_status, verified_by_admin_id,
 * verified_at, verification_note) are protected so a donor cannot self-verify
 * via serverUpdateProfile. Admins set these through dedicated server actions
 * (serverVerifyDonor / serverSetPhoneVerified) which call requireAdmin().
 */
const PROTECTED_PROFILE_FIELDS = [
  "role",
  "assigned_district",
  "assigned_upazila",
  "admin_policy_accepted_at",
  "is_verified",
  "verification_status",
  "verified_by_admin_id",
  "verified_at",
  "verification_note",
];

const PG_BOOLEAN_COLUMNS = new Set([
  "is_active",
  "has_chronic_disease",
  "show_on_leaderboard",
  "is_anonymous",
  "is_approved",
  "email_opt_in",
]);

const PG_NUMERIC_COLUMNS = new Set([
  "weight_kg",
  "hb_level",
  "lat",
  "lng",
  "patient_hb_level",
  "response_count",
  "response_total_ms",
]);

function coerceProfileValue(key: string, value: any): any {
  if (PG_BOOLEAN_COLUMNS.has(key)) {
    if (value === null || value === undefined || value === "") return false;
    return value === true || value === 1 || value === "1" || value === "true";
  }
  if (PG_NUMERIC_COLUMNS.has(key)) {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }
  return value === undefined ? null : value;
}

async function updateProfilePg(id: number, data: Record<string, any>) {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    const { rowCount } = await pgQuery(
      "UPDATE profiles SET updated_at = NOW() WHERE id = $1",
      [id],
    );
    return rowCount || 0;
  }
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  const params = keys.map((k) => coerceProfileValue(k, data[k]));
  params.push(id);
  const { rowCount } = await pgQuery(
    `UPDATE profiles SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
    params,
  );
  const changes = rowCount || 0;
  const coerced = Object.fromEntries(
    keys.map((k) => [k, coerceProfileValue(k, data[k])]),
  );

  if (
    changes > 0 &&
    coerced.hb_level != null &&
    coerced.role !== "patient" &&
    coerced.role !== "hospital"
  ) {
    const { rows } = await pgQuery(
      "SELECT sex, role, full_name_en FROM profiles WHERE id = $1",
      [id],
    );
    const profile = rows[0] as any;
    if (profile && profile.role === "donor") {
      const isLow =
        (profile.sex === "female" && coerced.hb_level < 12.5) ||
        (profile.sex !== "female" && coerced.hb_level < 13.0);
      if (isLow) {
        await pgQuery(
          `INSERT INTO activity_log (actor_id, actor_email, action, entity_type, entity_id, details)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            "",
            "low_hb_detected",
            "profile",
            String(id),
            `Donor ${profile.full_name_en || `#${id}`} registered with low Hb: ${coerced.hb_level} g/dL`,
          ],
        );
      }
    }
  }
  return changes;
}

export async function serverUpdateProfile(
  id: number,
  data: Record<string, any>,
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const usePg = isSupabaseAvailable();

  // Own-profile edit (donor/patient/hospital settings page): allowed, but
  // protected fields are stripped so users can't escalate privileges.
  if (Number(session.sub) === id) {
    const safe = withResolvedCoords({ ...data });
    for (const f of PROTECTED_PROFILE_FIELDS) delete safe[f];
    if (usePg) return updateProfilePg(id, safe);
    return dbUpdateProfile(id, safe);
  }

  // Editing someone else → admin territory.
  const ctx = await requireAdmin();
  const target = (await (usePg ? serverGetProfileByUserId(id) : getProfileByUserId(id))) as any;
  if (!target) throw new Error("Profile not found");

  if (ctx.isDistrictAdmin) {
    // District admins can update (not delete) donors/patients/hospitals in
    // their own district only — never admin accounts, never other districts.
    if (target.role === "admin" || target.role === "super_admin") {
      throw new Error("Forbidden: district admins cannot modify admin accounts");
    }
    assertDistrictAllowed(ctx, target.district);
    const safe = withResolvedCoords({ ...data });
    for (const f of PROTECTED_PROFILE_FIELDS) delete safe[f];
    if (usePg) return updateProfilePg(id, safe);
    return dbUpdateProfile(id, safe);
  }

  const resolved = withResolvedCoords(data);
  if (usePg) return updateProfilePg(id, resolved);
  return dbUpdateProfile(id, resolved);
}

export async function serverGetAllProfiles() {
  if (isSupabaseAvailable()) return getAllProfilesPg();
  return getAllProfiles();
}

export async function serverGetProfilesByRole(role: string) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery(
      "SELECT * FROM profiles WHERE role = $1 ORDER BY created_at DESC",
      [role],
    );
    return rows;
  }
  return getProfilesByRole(role);
}

export async function serverGetProfilesByRoles(roles: string[]) {
  if (isSupabaseAvailable()) return getProfilesByRolesPg(roles);
  return getProfilesByRoles(roles);
}

/**
 * Permanent profile deletion — main admins only. District sub-admins can
 * NEVER delete donors (or anyone); they may only deactivate via update.
 * super_admin accounts are protected at the server level too.
 */
export async function serverDeleteProfile(id: number) {
  const ctx = await requireFullAdmin();
  const target = (await (isSupabaseAvailable() ? serverGetProfileByUserId(id) : getProfileByUserId(id))) as any;
  if (!target) throw new Error("Profile not found");
  if (target.role === "super_admin") {
    throw new Error("Cannot delete a super admin account");
  }
  if (isSupabaseAvailable()) {
    const result = deleteProfilePg(id);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "profile_deleted",
        entityType: "profile",
        entityId: String(id),
        details: `Deleted ${target.role} "${target.full_name_en || target.email}" (#${id})`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = dbDeleteProfile(id);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "profile_deleted",
      entityType: "profile",
      entityId: String(id),
      details: `Deleted ${target.role} "${target.full_name_en || target.email}" (#${id})`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

export async function serverSearchProfiles(filters?: {
  role?: string;
  isActive?: boolean;
  search?: string;
  hbStatus?: "eligible" | "low_hb" | "not_tested";
  limit?: number;
  offset?: number;
}) {
  const ctx = await requireAdmin();
  const scoped = { ...(filters || {}) } as any;
  if (ctx.isDistrictAdmin) {
    // District admins only ever see their own district's users, and never
    // admin accounts.
    if (scoped.role === "admin" || scoped.role === "super_admin") {
      throw new Error("Forbidden: district admins cannot list admin accounts");
    }
    scoped.districts = districtMatchValues(ctx.assignedDistrict);
  }
  if (isSupabaseAvailable()) return searchProfilesPg(scoped);
  return dbSearchProfiles(scoped);
}

export async function serverGetAdmins(filters?: {
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  await requireFullAdmin();
  if (isSupabaseAvailable()) return getAdminsPg(filters);
  return dbGetAdmins(filters);
}

// ── Admin context, policy & district assignment ───────────────────────

/** The calling admin's own context — used by AdminShell/AdminSidebar to
 *  adapt the UI (hide super-only items, show district badge, policy gate). */
export async function serverGetMyAdminContext() {
  const ctx = await getAdminContext();
  if (!ctx) return null;
  return {
    id: ctx.id,
    email: ctx.email,
    role: ctx.role,
    isFullAdmin: ctx.isFullAdmin,
    isDistrictAdmin: ctx.isDistrictAdmin,
    assignedDistrict: ctx.assignedDistrict,
    assignedUpazila: ctx.assignedUpazila,
    policyAccepted: ctx.policyAccepted,
  };
}

/** Record the calling admin's acceptance of the admin policy & terms. */
export async function serverAcceptAdminPolicy() {
  const ctx = await requireAdmin();
  if (isSupabaseAvailable()) {
    const changes = recordAdminPolicyAcceptancePg(ctx.id);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "admin_policy_accepted",
        entityType: "profile",
        entityId: String(ctx.id),
        details: `${ctx.email} accepted the admin policy & terms`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return changes;
  }
  const changes = recordAdminPolicyAcceptance(ctx.id);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "admin_policy_accepted",
      entityType: "profile",
      entityId: String(ctx.id),
      details: `${ctx.email} accepted the admin policy & terms`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return changes;
}

/** Assign (or clear, with null) a district scope for an admin account.
 *  Main admins only. */
export async function serverSetAdminAssignment(
  profileId: number,
  assignedDistrict: string | null,
  assignedUpazila: string | null,
) {
  const ctx = await requireFullAdmin();
  if (isSupabaseAvailable()) {
    const changes = setAdminAssignmentPg(
      profileId,
      assignedDistrict || null,
      assignedUpazila || null,
    );
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "admin_assignment_changed",
        entityType: "profile",
        entityId: String(profileId),
        details: `Set admin #${profileId} scope to district=${assignedDistrict || "(full)"} upazila=${assignedUpazila || "(all)"}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return changes;
  }
  const changes = setAdminAssignment(
    profileId,
    assignedDistrict || null,
    assignedUpazila || null,
  );
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "admin_assignment_changed",
      entityType: "profile",
      entityId: String(profileId),
      details: `Set admin #${profileId} scope to district=${assignedDistrict || "(full)"} upazila=${assignedUpazila || "(all)"}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return changes;
}

// Blood Request actions
export async function serverGetActiveBloodRequests(limit?: number) {
  if (isSupabaseAvailable()) return getActiveBloodRequestsPg(limit);
  return getActiveBloodRequests(limit);
}

export async function serverGetAllBloodRequests() {
  if (isSupabaseAvailable()) return getAllBloodRequestsPg();
  return getAllBloodRequests();
}

export async function serverSearchBloodRequests(filters?: {
  status?: string;
  urgencyLevel?: string;
  bloodGroup?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  if (isSupabaseAvailable()) return searchBloodRequestsPg(filters);
  return dbSearchBloodRequests(filters);
}

export async function serverCreateBloodRequest(request: Record<string, any>) {
  const usePg = isSupabaseAvailable();
  const requestId = usePg
    ? await createBloodRequestPg(request)
    : dbCreateBloodRequest(request);

  setTimeout(async () => {
    try {
      const req = (await (usePg ? serverGetBloodRequestById(requestId) : getBloodRequestById(requestId))) as any;
      if (!req) return;
      const result = await serverTranslateShareText({
        patient_name: req.patient_name,
        blood_group: req.blood_group,
        units_needed: req.units_needed,
        reason: req.reason || null,
        hospital_name: req.hospital_name,
        hospital_address: req.hospital_address || null,
        district: req.district,
        upazila: req.upazila,
        when_needed: req.when_needed,
        needed_date: req.needed_date || null,
        needed_time: req.needed_time || null,
        phone: req.contact_number || null,
        contact_number: req.contact_number || null,
        whatsapp_number: req.whatsapp_number || null,
        share_link: null,
        patient_hb_level: req.patient_hb_level ?? null,
      });
      if (result?.text) {
        let fieldsJson: string | undefined;
        try {
          const fields = await serverGetBnImageFields({
            patient_name: req.patient_name,
            blood_group: req.blood_group,
            units_needed: req.units_needed,
            reason: req.reason || null,
            hospital_name: req.hospital_name,
            hospital_address: req.hospital_address || null,
            district: req.district,
            upazila: req.upazila,
            when_needed: req.when_needed,
            needed_date: req.needed_date || null,
            needed_time: req.needed_time || null,
            urgency_level: req.urgency_level || null,
          });
          fieldsJson = JSON.stringify(fields);
        } catch {}
        saveRequestTranslation(requestId, result.text, fieldsJson);
      }
    } catch (e) {
      console.error("Background BN translation failed:", e);
    }
  }, 120_000);

  // Background job: email nearby eligible donors + confirm to requester.
  // Short delay so the request is fully committed before alerts go out.
  // Emergency SOS requests use district+upazila wide targeting
  // and are recorded with notification_method = 'email_sos'.
  // Caps/delays/SOS toggle are admin-configurable in the Email Center
  // (email_settings table) with sensible defaults.
  const isSosFlag = request.isEmergencySos === true;
  const sosEnabled =
    isSosFlag && getEmailSettingBool("sos_emails_enabled", true);
  const isSos = isSosFlag && sosEnabled;
  const delaySec = isSos
    ? getEmailSettingInt("sos_send_delay_seconds", 2)
    : getEmailSettingInt("alert_send_delay_seconds", 5);
  setTimeout(() => {
    dispatchBloodRequestEmails(
      requestId,
      isSos ? "email_sos" : "email",
      { sos: isSos },
    ).catch(() => {});
  }, delaySec * 1_000);

  // Best-effort PWA push notification for new blood requests.
  void sendPushToAll({
    title: `🩸 Blood needed: ${request.blood_group || ""}`.trim(),
    body: `${request.patient_name || "A patient"} needs ${request.units_needed || 1} unit(s) at ${request.hospital_name || "a hospital"}`.slice(0, 140),
    url: "/feed",
    tag: "blood-request",
  }).catch(() => {});

  return requestId;
}

export async function serverUpdateBloodRequest(
  id: number,
  data: Record<string, any>,
) {
  const ctx = await requireAdmin();
  const usePg = isSupabaseAvailable();
  if (ctx.isDistrictAdmin) {
    const req = (await (usePg ? getBloodRequestByIdPg(id) : getBloodRequestById(id))) as any;
    assertDistrictAllowed(ctx, req?.district);
  }
  const previous = (await (usePg ? getBloodRequestByIdPg(id) : getBloodRequestById(id))) as any;
  if (usePg) {
    const changes = await updateBloodRequestPg(id, data);
    if (changes > 0 && previous) {
      await recordRequestEditHistoryPg({
        requestId: id,
        editorType: "admin",
        editorId: ctx.id,
        editorEmail: ctx.email,
        previousValues: previous,
        newValues: data,
      });
    }
    return changes;
  }
  const changes = dbUpdateBloodRequest(id, data);
  if (changes > 0 && previous) {
    recordRequestEditHistory({
      requestId: id,
      editorType: "admin",
      editorId: ctx.id,
      editorEmail: ctx.email,
      previousValues: previous,
      newValues: data,
    });
  }
  return changes;
}

export async function serverUpdateRequestStatus(id: number, status: string) {
  const ctx = await requireAdmin();
  const usePg = isSupabaseAvailable();
  if (ctx.isDistrictAdmin) {
    const req = (await (usePg ? getBloodRequestByIdPg(id) : getBloodRequestById(id))) as any;
    assertDistrictAllowed(ctx, req?.district);
  }
  if (usePg) return updateRequestStatusPg(id, status);
  return dbUpdateRequestStatus(id, status);
}

/**
 * Admin updates the lifecycle status of a request (submitted → matching →
 * donor_found → donating → fulfilled). For intermediate statuses, only
 * current_status is updated and a log entry is added; the overall status
 * stays "active". For fulfilled/cancelled, the full status is updated too.
 */
export async function serverAdminUpdateLifecycleStatus(id: number, status: string) {
  const ctx = await requireAdmin();
  const usePg = isSupabaseAvailable();
  if (ctx.isDistrictAdmin) {
    const req = (await (usePg ? getBloodRequestByIdPg(id) : getBloodRequestById(id))) as any;
    assertDistrictAllowed(ctx, req?.district);
  }
  if (usePg) {
    if (status === "fulfilled" || status === "cancelled") {
      await updateRequestStatusPg(id, status);
    }
    return addStatusLogPg(id, status, ctx.email || "admin");
  }
  if (status === "fulfilled" || status === "cancelled") {
    dbUpdateRequestStatus(id, status);
  }
  return addStatusLog(id, status, ctx.email || "admin");
}

/** Permanent request deletion — main admins only. */
export async function serverDeleteRequest(id: number) {
  const ctx = await requireFullAdmin();
  if (isSupabaseAvailable()) {
    deleteRequestTranslationPg(id);
    const result = await deleteRequestPg(id);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "request_deleted_permanent",
        entityType: "blood_request",
        entityId: String(id),
        details: `Permanently deleted request #${id}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  deleteRequestTranslation(id);
  const result = dbDeleteRequest(id);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "request_deleted_permanent",
      entityType: "blood_request",
      entityId: String(id),
      details: `Permanently deleted request #${id}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

// Donation actions
export async function serverCreateDonation(donation: Record<string, any>) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery(
      `INSERT INTO donations (donor_id, request_id, blood_group, units, hospital_name, donation_date, donation_type, recipient_type, referrer_profile_id, referrer_name, referrer_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        donation.donorId,
        donation.requestId ?? null,
        donation.bloodGroup,
        donation.units ?? 1,
        donation.hospitalName ?? null,
        donation.donationDate,
        donation.donationType || "whole_blood",
        donation.recipientType || "Patient",
        donation.referrerProfileId ?? null,
        donation.referrerName ?? null,
        donation.referrerPhone ?? null,
      ],
    );
    const donationId = rows[0].id;

    if (donation.donorId && donation.donationDate) {
      await pgQuery(
        `UPDATE profiles
         SET last_donation_date = $1,
             last_donation_type = COALESCE($2, 'whole_blood'),
             show_on_leaderboard = TRUE
         WHERE id = $3
           AND ($1 >= COALESCE(NULLIF(last_donation_date, ''), '0000-01-01'))`,
        [
          donation.donationDate,
          donation.donationType || "whole_blood",
          donation.donorId,
        ],
      );
      await pgQuery(
        `UPDATE profiles SET show_on_leaderboard = TRUE WHERE id = $1 AND show_on_leaderboard = FALSE`,
        [donation.donorId],
      );
    }

    const hasReferrer =
      donation.referrerProfileId != null ||
      (donation.referrerName && String(donation.referrerName).trim() !== "");
    if (donation.requestId && hasReferrer) {
      await pgQuery(
        `UPDATE blood_requests
         SET referrer_profile_id = $1,
             referrer_name = $2,
             referrer_phone = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [
          donation.referrerProfileId ?? null,
          donation.referrerName ?? null,
          donation.referrerPhone ?? null,
          donation.requestId,
        ],
      );
    }
    return donationId;
  }
  return dbCreateDonation(donation);
}

export async function serverGetDonationsByDonorId(donorId: number, _cacheBuster?: number) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery(
      "SELECT * FROM donations WHERE donor_id = $1 ORDER BY donation_date DESC",
      [donorId],
    );
    return rows;
  }
  return getDonationsByDonorId(donorId);
}

export async function serverGetAllDonations() {
  if (isSupabaseAvailable()) return getAllDonationsPg();
  return getAllDonations();
}

// ── QR-scan donation recording ──────────────────────────────────────────
// Donor scans a request QR → looks up the request → confirms → donation recorded.

export interface ScannedRequestInfo {
  requestId: number;
  trackingCode: string | null;
  patientName: string;
  bloodGroup: string;
  unitsNeeded: number;
  hospitalName: string | null;
  district: string | null;
  upazila: string | null;
  status: string;
  urgencyLevel: string;
  whenNeeded: string | null;
}

/** Look up a blood request from raw QR content (URL or tracking code). */
export async function serverGetRequestByQrContent(
  rawQr: string,
): Promise<{ request: ScannedRequestInfo | null; error: string | null }> {
  const { parseRequestQr } = await import("@/lib/qr-parser");
  const parsed = parseRequestQr(rawQr);
  if (!parsed.trackingCode && !parsed.requestId) {
    return { request: null, error: "Unrecognized QR code format" };
  }

  let req: any = null;
  const usePg = isSupabaseAvailable();
  if (parsed.trackingCode) {
    req = usePg ? await getBloodRequestByTrackingCodePg(parsed.trackingCode) : getBloodRequestByTrackingCode(parsed.trackingCode);
  }
  if (!req && parsed.requestId) {
    req = usePg ? await getBloodRequestByIdPg(parsed.requestId) : getBloodRequestById(parsed.requestId);
  }
  if (!req) {
    return { request: null, error: "Request not found" };
  }

  return {
    request: {
      requestId: req.id,
      trackingCode: req.tracking_code ?? null,
      patientName: req.patient_name,
      bloodGroup: req.blood_group,
      unitsNeeded: req.units_needed ?? 1,
      hospitalName: req.hospital_name ?? null,
      district: req.district ?? null,
      upazila: req.upazila ?? null,
      status: req.status,
      urgencyLevel: req.urgency_level ?? "normal",
      whenNeeded: req.needed_date ?? req.when_needed ?? null,
    },
    error: null,
  };
}

export interface RecordDonationByScanInput {
  requestId: number;
  donationType?: string;
  units?: number;
  referrerProfileId?: number | null;
  referrerName?: string | null;
  referrerPhone?: string | null;
}

export interface RecordDonationByScanResult {
  success: boolean;
  donationId?: number;
  /** True when this donation completed the request's required units. */
  fulfilled?: boolean;
  error?: string;
}

/** Record a donation by scanning a request QR. Donor must be logged in. */
export async function serverRecordDonationByScan(
  input: RecordDonationByScanInput,
): Promise<RecordDonationByScanResult> {
  const me = await getCurrentProfile();
  if (!me) {
    return { success: false, error: "You must be logged in to record a donation" };
  }

  const usePg = isSupabaseAvailable();
  const req = (usePg ? await getBloodRequestByIdPg(input.requestId) : getBloodRequestById(input.requestId)) as any;
  if (!req) {
    return { success: false, error: "Request not found" };
  }
  if (req.status === "fulfilled") {
    return { success: false, error: "This request is already fulfilled" };
  }
  if (req.status === "expired" || req.status === "cancelled") {
    return { success: false, error: `This request is ${req.status}` };
  }

  // Get the donor's full profile to check blood group
  const profile = (await (usePg ? serverGetProfileByUserId(me.id) : getProfileByUserId(me.id))) as any;
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }
  if (!profile.blood_group) {
    return { success: false, error: "Your blood group is not set in your profile" };
  }
  if (profile.blood_group !== req.blood_group) {
    return {
      success: false,
      error: `Blood group mismatch: you are ${profile.blood_group}, request needs ${req.blood_group}`,
    };
  }

  // Check for duplicate donation (same donor + same request)
  if (usePg) {
    const { rows: existingRows } = await pgQuery(
      "SELECT id FROM donations WHERE donor_id = $1 AND request_id = $2",
      [me.id, input.requestId],
    );
    if (existingRows.length > 0) {
      return { success: false, error: "You have already recorded a donation for this request" };
    }

    const donationDate = new Date().toISOString().slice(0, 10);
    const { rows: insRows } = await pgQuery<{ id: number }>(
      `INSERT INTO donations (donor_id, request_id, blood_group, units, hospital_name, donation_date, donation_type, recipient_type, referrer_profile_id, referrer_name, referrer_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        me.id,
        input.requestId,
        req.blood_group,
        input.units ?? 1,
        req.hospital_name ?? null,
        donationDate,
        input.donationType || "whole_blood",
        "Patient",
        input.referrerProfileId ?? null,
        input.referrerName ?? null,
        input.referrerPhone ?? null,
      ],
    );
    const donationId = insRows[0].id;

    await pgQuery(
      `UPDATE profiles
       SET last_donation_date = $1,
           last_donation_type = COALESCE($2, 'whole_blood'),
           show_on_leaderboard = TRUE
       WHERE id = $3
         AND ($1 >= COALESCE(NULLIF(last_donation_date, ''), '0000-01-01'))`,
      [donationDate, input.donationType || "whole_blood", me.id],
    );
    await pgQuery(
      `UPDATE profiles SET show_on_leaderboard = TRUE WHERE id = $1 AND show_on_leaderboard = FALSE`,
      [me.id],
    );

    if (input.referrerProfileId != null || (input.referrerName && String(input.referrerName).trim() !== "")) {
      await pgQuery(
        `UPDATE blood_requests
         SET referrer_profile_id = $1,
             referrer_name = $2,
             referrer_phone = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [input.referrerProfileId ?? null, input.referrerName ?? null, input.referrerPhone ?? null, input.requestId],
      );
    }

    // Lifecycle: fulfill the request once its required units are all donated,
    // otherwise advance the tracking status to "donating".
    const { rows: sumRows } = await pgQuery<{ total: string | number }>(
      "SELECT COALESCE(SUM(units), 0) AS total FROM donations WHERE request_id = $1",
      [input.requestId],
    );
    const totalUnits = Number(sumRows[0]?.total ?? 0);
    const unitsNeeded = Number(req.units_needed) || 1;
    if (totalUnits >= unitsNeeded) {
      await pgQuery(
        `UPDATE blood_requests
         SET status = 'fulfilled', current_status = 'fulfilled', donor_id = $1,
             donated_at = NOW(), fulfilled_at = NOW(), show_fulfilled_badge = 1, updated_at = NOW()
         WHERE id = $2 AND status = 'active'`,
        [me.id, input.requestId],
      );
      await addStatusLogPg(input.requestId, "fulfilled", `donor:${profile.id}`, "Fulfilled via donor QR scan");
      return { success: true, donationId, fulfilled: true };
    }
    await addStatusLogPg(
      input.requestId,
      "donating",
      `donor:${profile.id}`,
      `Donation recorded via scan (${totalUnits}/${unitsNeeded} units)`,
    );
    return { success: true, donationId, fulfilled: false };
  }
  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM donations WHERE donor_id = ? AND request_id = ?")
    .get(me.id, input.requestId);
  if (existing) {
    return { success: false, error: "You have already recorded a donation for this request" };
  }

  const donationDate = new Date().toISOString().slice(0, 10);
  const donationId = dbCreateDonation({
    donorId: me.id,
    requestId: input.requestId,
    bloodGroup: req.blood_group,
    units: input.units ?? 1,
    hospitalName: req.hospital_name ?? null,
    donationDate,
    donationType: input.donationType ?? "whole_blood",
    recipientType: "Patient",
    referrerProfileId: input.referrerProfileId ?? null,
    referrerName: input.referrerName ?? null,
    referrerPhone: input.referrerPhone ?? null,
  });

  // Lifecycle mirror of the PG path: fulfill when units met, else "donating".
  const db = getDb();
  const totalRow = db
    .prepare("SELECT COALESCE(SUM(units), 0) AS total FROM donations WHERE request_id = ?")
    .get(input.requestId) as { total: number };
  const totalUnits = Number(totalRow?.total ?? 0);
  const unitsNeeded = Number(req.units_needed) || 1;
  if (totalUnits >= unitsNeeded) {
    dbUpdateRequestStatus(input.requestId, "fulfilled");
    addStatusLog(input.requestId, "fulfilled", `donor:${profile.id}`, "Fulfilled via donor QR scan");
    return { success: true, donationId, fulfilled: true };
  }
  addStatusLog(
    input.requestId,
    "donating",
    `donor:${profile.id}`,
    `Donation recorded via scan (${totalUnits}/${unitsNeeded} units)`,
  );
  return { success: true, donationId, fulfilled: false };
}

// Stats actions
export async function serverGetDashboardStats() {
  if (isSupabaseAvailable()) return getDashboardStatsPg();
  return getDashboardStats();
}

export async function serverGetAnalyticsStats() {
  if (isSupabaseAvailable()) return getAnalyticsStatsPg() as any;
  return getAnalyticsStats();
}

export async function serverGetDonorsWithStats() {
  if (isSupabaseAvailable()) return getDonorsWithStatsPg();
  return getDonorsWithStats();
}

export async function serverSeedDonorEligibilityData() {
  if (isSupabaseAvailable()) return seedDonorEligibilityDataPg();
  return seedDonorEligibilityData();
}

export async function serverGetMonthlyStats() {
  if (isSupabaseAvailable()) return getMonthlyStatsPg();
  return getMonthlyStats();
}

export async function serverGetDailyStats(days?: number) {
  if (isSupabaseAvailable()) return getDailyStatsPg(days);
  return getDailyStats(days);
}

export async function serverGetWeeklyStats(weeks?: number) {
  if (isSupabaseAvailable()) return getWeeklyStatsPg(weeks);
  return getWeeklyStats(weeks);
}

export async function serverGetHomepageStats() {
  if (isSupabaseAvailable()) return getHomepageStatsPg();
  return getHomepageStats();
}

export async function serverGetBloodInventory() {
  if (isSupabaseAvailable()) return getBloodInventoryPg();
  return getBloodInventory();
}

export async function serverGetDistrictStats() {
  if (isSupabaseAvailable()) return getDistrictStatsPg();
  return getDistrictStats();
}

// ── Smart Donor Matching ──────────────────────────────────────────────

export async function serverFindMatchingDonors(
  bloodGroup: string,
  district?: string,
  upazila?: string,
  urgencyLevel: string = "normal",
  limit?: number,
  requestLat?: number | null,
  requestLng?: number | null,
  exactMatch?: boolean,
) {
  if (isSupabaseAvailable())
    return findMatchingDonorsPg(
      bloodGroup,
      district,
      upazila,
      urgencyLevel,
      limit,
      requestLat,
      requestLng,
      exactMatch,
    );
  return findMatchingDonors(
    bloodGroup,
    district,
    upazila,
    urgencyLevel,
    limit,
    requestLat,
    requestLng,
    exactMatch,
  );
}

export async function serverRecordDonorMatches(
  requestId: number,
  matches: any[],
  method: string = "sms",
) {
  if (isSupabaseAvailable()) return recordDonorMatchesPg(requestId, matches, method);
  return recordDonorMatches(requestId, matches, method);
}

export async function serverUpdateDonorMatchResponse(
  requestId: number,
  donorId: number,
  responseStatus: "accepted" | "declined" | "no_response",
) {
  if (isSupabaseAvailable()) return updateDonorMatchResponsePg(requestId, donorId, responseStatus);
  return updateDonorMatchResponse(requestId, donorId, responseStatus);
}

export async function serverGetDonorMatchesForRequest(requestId: number) {
  if (isSupabaseAvailable()) return getDonorMatchesForRequestPg(requestId);
  return getDonorMatchesForRequest(requestId);
}

// ── Request Status Log ────────────────────────────────────────────────

export async function serverAddStatusLog(
  requestId: number,
  status: string,
  changedBy?: string,
  note?: string,
) {
  if (isSupabaseAvailable()) return addStatusLogPg(requestId, status, changedBy, note);
  return addStatusLog(requestId, status, changedBy, note);
}

export async function serverGetStatusLogs(requestId: number) {
  if (isSupabaseAvailable()) return getStatusLogsPg(requestId);
  return getStatusLogs(requestId);
}

export async function serverGetBloodRequestByTrackingCode(code: string) {
  if (isSupabaseAvailable()) return getBloodRequestByTrackingCodePg(code);
  return getBloodRequestByTrackingCode(code);
}

export async function serverGetBloodRequestById(id: number) {
  if (isSupabaseAvailable()) return getBloodRequestByIdPg(id);
  return getBloodRequestById(id);
}

/**
 * Run the request lifecycle sweep (auto-expire + archive fulfilled + purge
 * rows archived >48h ago). Called on track-page load so a QR scan for an
 * active-but-past-due request correctly transitions to "expired" before
 * being displayed, and so the 48h hard-delete window advances on view.
 */
export async function serverRunLifecycleSweep(): Promise<number> {
  try {
    if (isSupabaseAvailable()) return await runRequestLifecycleSweepPg();
    return runRequestLifecycleSweep();
  } catch {
    return 0;
  }
}

/** Hard-delete rows archived more than `retentionHours` ago. */
export async function serverPurgeOldArchivedRequests(
  retentionHours: number = 48,
): Promise<number> {
  try {
    if (isSupabaseAvailable()) return await purgeOldArchivedRequestsPg(retentionHours);
    return purgeOldArchivedRequests(retentionHours);
  } catch {
    return 0;
  }
}

export async function serverGenerateTrackingCode() {
  return generateTrackingCode();
}

// ── Phase 5.1: Public Transparency Dashboard ──────────────────────────

export async function serverGetPublicTransparencyStats() {
  if (isSupabaseAvailable()) return getPublicTransparencyStatsPg();
  return getPublicTransparencyStats();
}

// ── Phase 5.2: Donor Leaderboard & Gamification ───────────────────────

function computeBadgesLocal(count: number, referrals: number = 0): string[] {
  const badges: string[] = [];
  if (count >= 1) badges.push("First Drop");
  if (count >= 3) badges.push("Regular Donor");
  if (count >= 5) badges.push("Silver");
  if (count >= 10) badges.push("Gold");
  if (count >= 25) badges.push("Platinum");
  if (!count || count === 0) badges.push("Newbie");
  if (referrals >= 10) badges.push("Super Connector");
  else if (referrals >= 3) badges.push("Connector");
  return badges;
}

const DONOR_CAN_DONATE_TO_LOCAL: Record<string, string[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

function resolveCoordsLocal(
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


function daysSinceDonation(dateLike: string | Date | null | undefined): number | null {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / 86_400_000;
}

export async function getDonorsWithStatsPg() {
  const { rows } = await pgQuery(
    `
    WITH per_type AS (
      SELECT donor_id,
        MAX(CASE WHEN donation_type = 'whole_blood' OR donation_type IS NULL THEN donation_date END) as last_wb,
        MAX(CASE WHEN donation_type = 'platelets' THEN donation_date END) as last_pl,
        MAX(CASE WHEN donation_type = 'plasma' THEN donation_date END) as last_pm
      FROM donations GROUP BY donor_id
    ),
    donor_stats AS (
      SELECT donor_id, COUNT(*) as donation_count, SUM(units) as unit_count, MAX(donation_date) as last_donation
      FROM donations GROUP BY donor_id
    ),
    ref_stats AS (
      SELECT referrer_profile_id, COUNT(*) as referral_count
      FROM donations WHERE referrer_profile_id IS NOT NULL
      GROUP BY referrer_profile_id
    )
    SELECT p.*,
      COALESCE(ds.donation_count, 0) as total_donations,
      COALESCE(ds.unit_count, 0) as total_units,
      ds.last_donation as donation_last_date,
      COALESCE(p.last_donation_type, 'whole_blood') as donation_type,
      COALESCE(pt.last_wb::text, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND COALESCE(p.last_donation_type,'whole_blood') = 'whole_blood' THEN p.last_donation_date END) as eff_last_wb,
      COALESCE(pt.last_pl::text, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'platelets' THEN p.last_donation_date END) as eff_last_pl,
      COALESCE(pt.last_pm::text, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'plasma' THEN p.last_donation_date END) as eff_last_pm,
      COALESCE(r.referral_count, 0) as referral_count
    FROM profiles p
    LEFT JOIN per_type pt ON p.id = pt.donor_id
    LEFT JOIN donor_stats ds ON p.id = ds.donor_id
    LEFT JOIN ref_stats r ON p.id = r.referrer_profile_id
    WHERE p.role = 'donor' AND p.is_active = TRUE AND p.is_approved = TRUE
      AND p.blood_group IS NOT NULL
      AND p.full_name_en IS NOT NULL AND p.full_name_en <> ''
      AND p.phone IS NOT NULL AND p.phone <> ''
      AND NOT (
        (p.sex = 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 12.5)
        OR (p.sex <> 'female' AND p.hb_level IS NOT NULL AND p.hb_level < 13.0)
      )
    ORDER BY total_donations DESC
  `,
  );

  return rows.map((d: any) => {
    const daysWb = daysSinceDonation(d.eff_last_wb);
    const daysPl = daysSinceDonation(d.eff_last_pl);
    const daysPm = daysSinceDonation(d.eff_last_pm);
    const eligible_whole_blood = daysWb == null || daysWb >= 90;
    const eligible_platelets = daysPl == null || daysPl >= 14;
    const eligible_plasma = daysPm == null || daysPm >= 30;
    const eligible_types_count =
      (eligible_whole_blood ? 1 : 0) + (eligible_platelets ? 1 : 0) + (eligible_plasma ? 1 : 0);

    let next_eligible_date: string | null = null;
    if (eligible_types_count === 0) {
      const candidates: Date[] = [];
      if (d.eff_last_wb) candidates.push(new Date(new Date(d.eff_last_wb).getTime() + 90 * 86_400_000));
      if (d.eff_last_pl) candidates.push(new Date(new Date(d.eff_last_pl).getTime() + 14 * 86_400_000));
      if (d.eff_last_pm) candidates.push(new Date(new Date(d.eff_last_pm).getTime() + 30 * 86_400_000));
      const min = candidates
        .filter((c) => !isNaN(c.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      next_eligible_date = min ? min.toISOString().slice(0, 10) : null;
    }

    const hb_status =
      d.hb_level == null
        ? "not_tested"
        : (d.sex === "female" && d.hb_level < 12.5) || (d.sex !== "female" && d.hb_level < 13.0)
          ? "low_hb"
          : "eligible";

    const coords = resolveCoordsLocal(d.lat, d.lng, d.district, d.upazila, d.union_name);

    return {
      ...d,
      donation_last_date: d.donation_last_date ? new Date(d.donation_last_date).toISOString() : null,
      is_active: d.is_active === true,
      is_eligible: eligible_types_count > 0,
      eligible_whole_blood,
      eligible_platelets,
      eligible_plasma,
      eligible_types_count,
      total_referrals: d.referral_count || 0,
      next_eligible_date,
      hb_status,
      badges: computeBadgesLocal(d.total_donations || 0, d.referral_count || 0),
      lat: coords.lat,
      lng: coords.lng,
    };
  });
}

export async function getDonorByIdWithStatsPg(id: number) {
  const { rows } = await pgQuery(
    `
    WITH per_type AS (
      SELECT donor_id,
        MAX(CASE WHEN donation_type = 'whole_blood' OR donation_type IS NULL THEN donation_date END) as last_wb,
        MAX(CASE WHEN donation_type = 'platelets' THEN donation_date END) as last_pl,
        MAX(CASE WHEN donation_type = 'plasma' THEN donation_date END) as last_pm
      FROM donations GROUP BY donor_id
    ),
    donor_stats AS (
      SELECT donor_id, COUNT(*) as donation_count, SUM(units) as unit_count, MAX(donation_date) as last_donation
      FROM donations GROUP BY donor_id
    ),
    ref_stats AS (
      SELECT referrer_profile_id, COUNT(*) as referral_count
      FROM donations WHERE referrer_profile_id IS NOT NULL
      GROUP BY referrer_profile_id
    )
    SELECT p.*,
      COALESCE(ds.donation_count, 0) as total_donations,
      COALESCE(ds.unit_count, 0) as total_units,
      ds.last_donation as donation_last_date,
      COALESCE(p.last_donation_type, 'whole_blood') as donation_type,
      COALESCE(pt.last_wb::text, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND COALESCE(p.last_donation_type,'whole_blood') = 'whole_blood' THEN p.last_donation_date END) as eff_last_wb,
      COALESCE(pt.last_pl::text, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'platelets' THEN p.last_donation_date END) as eff_last_pl,
      COALESCE(pt.last_pm::text, CASE WHEN NULLIF(p.last_donation_date,'') IS NOT NULL AND p.last_donation_type = 'plasma' THEN p.last_donation_date END) as eff_last_pm,
      COALESCE(r.referral_count, 0) as referral_count
    FROM profiles p
    LEFT JOIN per_type pt ON p.id = pt.donor_id
    LEFT JOIN donor_stats ds ON p.id = ds.donor_id
    LEFT JOIN ref_stats r ON p.id = r.referrer_profile_id
    WHERE p.id = $1 AND p.role = 'donor'
  `,
    [id],
  );

  if (rows.length === 0) return null;
  const d: any = rows[0];
  const daysWb = daysSinceDonation(d.eff_last_wb);
  const daysPl = daysSinceDonation(d.eff_last_pl);
  const daysPm = daysSinceDonation(d.eff_last_pm);
  const eligible_whole_blood = daysWb == null || daysWb >= 90;
  const eligible_platelets = daysPl == null || daysPl >= 14;
  const eligible_plasma = daysPm == null || daysPm >= 30;
  const eligible_types_count =
    (eligible_whole_blood ? 1 : 0) + (eligible_platelets ? 1 : 0) + (eligible_plasma ? 1 : 0);

  let next_eligible_date: string | null = null;
  if (eligible_types_count === 0) {
    const candidates: Date[] = [];
    if (d.eff_last_wb) candidates.push(new Date(new Date(d.eff_last_wb).getTime() + 90 * 86_400_000));
    if (d.eff_last_pl) candidates.push(new Date(new Date(d.eff_last_pl).getTime() + 14 * 86_400_000));
    if (d.eff_last_pm) candidates.push(new Date(new Date(d.eff_last_pm).getTime() + 30 * 86_400_000));
    const min = candidates
      .filter((c) => !isNaN(c.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    next_eligible_date = min ? min.toISOString().slice(0, 10) : null;
  }

  const hb_status =
    d.hb_level == null
      ? "not_tested"
      : (d.sex === "female" && d.hb_level < 12.5) || (d.sex !== "female" && d.hb_level < 13.0)
        ? "low_hb"
        : "eligible";

  const coords = resolveCoordsLocal(d.lat, d.lng, d.district, d.upazila, d.union_name);

  return {
    ...d,
    donation_last_date: d.donation_last_date ? new Date(d.donation_last_date).toISOString() : null,
    is_active: d.is_active === true,
    is_eligible: eligible_types_count > 0,
    eligible_whole_blood,
    eligible_platelets,
    eligible_plasma,
    eligible_types_count,
    total_referrals: d.referral_count || 0,
    next_eligible_date,
    hb_status,
    badges: computeBadgesLocal(d.total_donations || 0, d.referral_count || 0),
    lat: coords.lat,
    lng: coords.lng,
  };
}

export async function serverGetDonorByIdWithStats(id: number) {
  if (isSupabaseAvailable()) return getDonorByIdWithStatsPg(id);
  const all = getDonorsWithStats();
  return all.find((d: any) => d.id === id) || null;
}

export async function serverGetTopDonors(limit: number = 20) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery(
      `SELECT
         p.id,
         p.full_name_en,
         p.full_name_bn,
         p.blood_group,
         p.district,
         p.upazila,
         p.show_on_leaderboard,
         COALESCE(d.donation_count, 0) as total_donations,
         COALESCE(d.unit_count, 0) as total_units,
         d.last_donation as last_donation_date
       FROM profiles p
       LEFT JOIN (
         SELECT donor_id, COUNT(*) as donation_count, SUM(units) as unit_count, MAX(donation_date) as last_donation
         FROM donations GROUP BY donor_id
       ) d ON p.id = d.donor_id
       WHERE p.role = 'donor'
         AND p.is_active = TRUE
         AND p.show_on_leaderboard = TRUE
         AND COALESCE(d.donation_count, 0) > 0
       ORDER BY total_donations DESC, total_units DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((d: any) => ({
      ...d,
      badges: computeBadgesLocal(d.total_donations || 0),
    }));
  }
  return getTopDonors(limit);
}

export async function serverGetDonorOfTheMonth() {
  if (isSupabaseAvailable()) return getDonorOfTheMonthPg();
  return getDonorOfTheMonth();
}

export async function serverGetDonationImpactStats() {
  if (isSupabaseAvailable()) return getDonationImpactStatsPg();
  return getDonationImpactStats();
}

// ── Phase 5.3: Organizations ──────────────────────────────────────────

export async function serverGetOrganizations() {
  if (isSupabaseAvailable()) return getOrganizationsPg();
  return getOrganizations();
}

// ── Phase 4.1: AI-Powered Donor Insights ─────────────────────────────

export async function serverGetDashboardAISnapshot() {
  const rateKey = await enforceRateLimit(
    "ai-dashboard-snapshot",
    5,
    10 * 60 * 1000,
    30 * 60 * 1000,
  );
  const { getDashboardAISnapshot } = await import("./ai/insights");
  const result = await getDashboardAISnapshot();
  if (rateKey) await incrementRateLimit(rateKey, 10 * 60 * 1000);
  return result;
}

export async function serverGenerateAIInsights() {
  const rateKey = await enforceRateLimit(
    "ai-generate-insights",
    10,
    10 * 60 * 1000,
    30 * 60 * 1000,
  );
  const { generateAIInsights } = await import("./ai/insights");
  const result = await generateAIInsights();
  if (rateKey) await incrementRateLimit(rateKey, 10 * 60 * 1000);
  return result;
}

export async function serverAskNaturalLanguageQuery(question: string) {
  const rateKey = await enforceRateLimit(
    "ai-nl-query",
    10,
    10 * 60 * 1000,
    30 * 60 * 1000,
  );
  const { askNaturalLanguageQuery } = await import("./ai/insights");
  const result = await askNaturalLanguageQuery(question);
  if (rateKey) await incrementRateLimit(rateKey, 10 * 60 * 1000);
  return result;
}

// ── Phase 4 Extension: User-Facing AI Assistant ──────────────────────

export async function serverChatWithAssistant(
  message: string,
  history?: { user: string; ai: string }[],
  isBn = false,
  workflowState?: import("./ai/assistant-workflow").AssistantWorkflowState | null,
  location?: { latitude: number; longitude: number },
) {
  if (typeof message !== "string" || message.length > 500) {
    throw new Error("Invalid message");
  }
  const safeHistory = Array.isArray(history)
    ? history.slice(-6).filter((item) =>
      typeof item?.user === "string" && item.user.length <= 500 &&
      typeof item?.ai === "string" && item.ai.length <= 2000,
    )
    : [];
  const safeLocation = location &&
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude) &&
    Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180
    ? location
    : undefined;

  // Rate limit AI chat per IP to protect LLM cost (30 msgs / 5 min, 10 min lockout).
  // Skipped in development for easier testing.
  let rateKey = "ai-chat:unknown";
  if (process.env.NODE_ENV === "production") {
    try {
      const { getVisitorFingerprint } = await import("./auth/visitor");
      const { ip } = await getVisitorFingerprint();
      rateKey = `ai-chat:${ip}`;
    } catch {
      // fall back to a shared bucket if fingerprinting is unavailable
    }
    const limit = await checkRateLimit(rateKey, 30, 5 * 60 * 1000, 10 * 60 * 1000);
    if (!limit.allowed) {
      const waitMin = Math.ceil(
        ((limit.lockedUntil ?? limit.resetTime) - Date.now()) / 60000,
      );
      throw new Error(
        `Too many messages. Please wait about ${waitMin} minute(s) and try again.`,
      );
    }
  }

  let userProfile: Record<string, unknown> | null = null;
  try {
    const { getSession } = await import("@/lib/auth/session");
    const session = await getSession();
    if (session) {
      const profile = (await serverGetProfileByEmail(session.email)) as any;
      if (profile) {
        userProfile = {
          id: profile.id,
          name: profile.full_name_en || profile.full_name_bn || null,
          nameBn: profile.full_name_bn || null,
          email: profile.email,
          role: profile.role,
          bloodGroup: profile.blood_group || null,
          district: profile.district || null,
          upazila: profile.upazila || null,
          phone: profile.phone || null,
          weightKg: profile.weight_kg || null,
          dateOfBirth: profile.date_of_birth || null,
          sex: profile.sex || null,
          lastDonationDate: profile.last_donation_date || null,
          isActive: profile.is_active ?? 1,
          donationCount: 0,
        };
        try {
          const donations = (await serverGetDonationsByDonorId(profile.id)) as any[];
          (userProfile as any).donationCount = donations?.length || 0;
          if (donations?.length > 0) {
            (userProfile as any).lastDonationDate = donations[0].donation_date || profile.last_donation_date;
          }
        } catch {
          // donation history not critical
        }
      }
    }
  } catch {
    // session not available — continue as guest
  }

  const { chatWithAssistant } = await import("./ai/user-assistant");
  const result = await chatWithAssistant(message, safeHistory, isBn, workflowState ?? null, safeLocation, userProfile);
  if (process.env.NODE_ENV === "production") {
    await incrementRateLimit(rateKey, 5 * 60 * 1000);
  }
  return result;
}

export async function serverAnalyzeRequestContext(data: {
  bloodGroup?: string;
  district?: string;
  urgencyLevel?: string;
  unitsNeeded?: number;
}) {
  const rateKey = await enforceRateLimit(
    "ai-analyze-request",
    20,
    5 * 60 * 1000,
    15 * 60 * 1000,
  );
  const { analyzeRequestContext } = await import("./ai/user-assistant");
  const result = await analyzeRequestContext(data);
  if (rateKey) await incrementRateLimit(rateKey, 5 * 60 * 1000);
  return result;
}

export async function serverGetDonorAdvice(
  profile: {
    bloodGroup: string;
    lastDonationDate?: string;
    lastDonationType?: string;
    weightKg?: number;
    district?: string;
    dateOfBirth?: string;
  },
  donorId?: number,
) {
  const rateKey = await enforceRateLimit(
    "ai-donor-advice",
    20,
    10 * 60 * 1000,
    30 * 60 * 1000,
  );
  const { getDonorAdvice } = await import("./ai/user-assistant");
  // Fetch actual donation history from DB so eligibility is based on real
  // per-type last donation dates, not just the single last_donation_date
  // field on the profile (which may be stale or incomplete).
  let donationHistory: { donation_date: string; donation_type: string }[] = [];
  if (donorId) {
    try {
      donationHistory = ((await serverGetDonationsByDonorId(donorId)) as any[]).map((d) => ({
        donation_date: d.donation_date,
        donation_type: d.donation_type || "whole_blood",
      }));
    } catch (e) {
      console.error("Failed to fetch donation history for advice:", e);
    }
  }
  const result = await getDonorAdvice(profile, donationHistory);
  if (rateKey) await incrementRateLimit(rateKey, 10 * 60 * 1000);
  return result;
}

export async function serverGetAssistantQuickReplies() {
  const { getAssistantQuickReplies } = await import("./ai/user-assistant");
  return getAssistantQuickReplies();
}

// ── Phase 3.1: Site Settings persistence ──────────────────────────────

export async function serverGetSiteSettings() {
  if (isSupabaseAvailable()) return getSiteSettingsPg();
  return dbGetSiteSettings();
}

export async function serverUpdateSiteSettings(settings: Record<string, string>) {
  const ctx = await requireFullAdmin();
  if (isSupabaseAvailable()) {
    const result = await updateSiteSettingsPg(settings);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "settings_updated",
        entityType: "site_settings",
        entityId: null,
        details: `Updated ${result} setting(s): ${Object.keys(settings).join(", ")}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = dbUpdateSiteSettings(settings);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "settings_updated",
      entityType: "site_settings",
      entityId: null,
      details: `Updated ${result} setting(s): ${Object.keys(settings).join(", ")}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

// ── Phase 3.2: Activity Log ───────────────────────────────────────────

/** Global activity log — main admins only (they review sub-admin actions). */
export async function serverGetActivityLog(filters?: {
  limit?: number;
  offset?: number;
  action?: string;
  entityType?: string;
  actorId?: number;
}) {
  await requireFullAdmin();
  if (isSupabaseAvailable()) return getActivityLogPg(filters);
  return dbGetActivityLog(filters);
}

/** Recent activity-log entries (e.g. low-Hb alerts) for the admin
 *  notification panel — any admin role may read these. Returns the rows
 *  array (not the paginated envelope) for direct consumption. */
export async function serverGetRecentActivityLog(
  action: string,
  sinceHours = 24,
  limit = 5,
): Promise<any[]> {
  await requireAdmin();
  if (isSupabaseAvailable()) {
    const result = await getActivityLogPg({ action, sinceHours, limit });
    return result.rows;
  }
  const result = await dbGetActivityLog({ action, sinceHours, limit });
  return result.rows;
}

export async function serverRecordActivityLog(entry: {
  actorId?: number | null;
  actorEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}) {
  if (isSupabaseAvailable()) return recordActivityLogPg(entry);
  return dbRecordActivityLog(entry);
}

// ── Phase 4.1: Donations CRUD ─────────────────────────────────────────

export async function serverUpdateDonation(id: number, data: Record<string, any>) {
  if (isSupabaseAvailable()) {
    const result = await updateDonationPg(id, data);
    try {
      await recordActivityLogPg({
        actorId: null,
        actorEmail: null,
        action: "donation_updated",
        entityType: "donation",
        entityId: String(id),
        details: `Updated donation #${id}: ${Object.keys(data).join(", ")}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = dbUpdateDonation(id, data);
  try {
    dbRecordActivityLog({
      actorId: null,
      actorEmail: null,
      action: "donation_updated",
      entityType: "donation",
      entityId: String(id),
      details: `Updated donation #${id}: ${Object.keys(data).join(", ")}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

export async function serverDeleteDonation(id: number) {
  const ctx = await requireFullAdmin();
  if (isSupabaseAvailable()) {
    const result = await deleteDonationPg(id);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "donation_deleted",
        entityType: "donation",
        entityId: String(id),
        details: `Deleted donation #${id}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = dbDeleteDonation(id);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "donation_deleted",
      entityType: "donation",
      entityId: String(id),
      details: `Deleted donation #${id}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

// ── Phase 4.2: Organizations CRUD ─────────────────────────────────────

export async function serverGetAllOrganizations() {
  if (isSupabaseAvailable()) return getAllOrganizationsPg();
  return dbGetAllOrganizations();
}

export async function serverCreateOrganization(data: {
  name_en: string;
  name_bn?: string;
  description?: string;
  contact_phone?: string;
  contact_email?: string;
  district?: string;
  is_active?: number;
}) {
  if (isSupabaseAvailable()) {
    const id = await createOrganizationPg(data);
    try {
      await recordActivityLogPg({
        actorId: null,
        actorEmail: null,
        action: "organization_created",
        entityType: "organization",
        entityId: String(id),
        details: `Created organization: ${data.name_en}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return id;
  }
  const id = dbCreateOrganization(data);
  try {
    dbRecordActivityLog({
      actorId: null,
      actorEmail: null,
      action: "organization_created",
      entityType: "organization",
      entityId: String(id),
      details: `Created organization: ${data.name_en}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return id;
}

export async function serverUpdateOrganization(id: number, data: Record<string, any>) {
  if (isSupabaseAvailable()) {
    const result = await updateOrganizationPg(id, data);
    try {
      await recordActivityLogPg({
        actorId: null,
        actorEmail: null,
        action: "organization_updated",
        entityType: "organization",
        entityId: String(id),
        details: `Updated organization #${id}: ${Object.keys(data).join(", ")}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = dbUpdateOrganization(id, data);
  try {
    dbRecordActivityLog({
      actorId: null,
      actorEmail: null,
      action: "organization_updated",
      entityType: "organization",
      entityId: String(id),
      details: `Updated organization #${id}: ${Object.keys(data).join(", ")}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

export async function serverDeleteOrganization(id: number) {
  const ctx = await requireFullAdmin();
  if (isSupabaseAvailable()) {
    const result = await deleteOrganizationPg(id);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "organization_deactivated",
        entityType: "organization",
        entityId: String(id),
        details: `Deactivated organization #${id}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = dbDeleteOrganization(id);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "organization_deactivated",
      entityType: "organization",
      entityId: String(id),
      details: `Deactivated organization #${id}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

// ── Bulk Operations ─────────────────────────────────────────────────────

export async function serverBulkDeleteProfiles(ids: number[]) {
  const ctx = await requireFullAdmin();
  if (isSupabaseAvailable()) {
    const result = await bulkDeleteProfilesPg(ids);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "profiles_bulk_deleted",
        entityType: "profile",
        entityId: null,
        details: `Bulk deleted ${result} profile(s): IDs [${ids.join(", ")}]`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = bulkDeleteProfiles(ids);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "profiles_bulk_deleted",
      entityType: "profile",
      entityId: null,
      details: `Bulk deleted ${result} profile(s): IDs [${ids.join(", ")}]`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

export async function serverBulkDeactivateProfiles(ids: number[]) {
  const ctx = await requireAdmin();
  if (isSupabaseAvailable()) {
    const result = await bulkDeactivateProfilesPg(ids);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "profiles_bulk_deactivated",
        entityType: "profile",
        entityId: null,
        details: `Bulk deactivated ${result} profile(s): IDs [${ids.join(", ")}]`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = bulkDeactivateProfiles(ids);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "profiles_bulk_deactivated",
      entityType: "profile",
      entityId: null,
      details: `Bulk deactivated ${result} profile(s): IDs [${ids.join(", ")}]`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

export async function serverBulkActivateProfiles(ids: number[]) {
  const ctx = await requireAdmin();
  if (isSupabaseAvailable()) {
    const result = await bulkActivateProfilesPg(ids);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "profiles_bulk_activated",
        entityType: "profile",
        entityId: null,
        details: `Bulk activated ${result} profile(s): IDs [${ids.join(", ")}]`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = bulkActivateProfiles(ids);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "profiles_bulk_activated",
      entityType: "profile",
      entityId: null,
      details: `Bulk activated ${result} profile(s): IDs [${ids.join(", ")}]`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

export async function serverBulkDeleteRequests(ids: number[]) {
  const ctx = await requireAdmin();
  if (isSupabaseAvailable()) {
    const result = await bulkDeleteRequestsPg(ids);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "requests_bulk_deleted",
        entityType: "blood_request",
        entityId: null,
        details: `Bulk deleted ${result} request(s): IDs [${ids.join(", ")}]`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = bulkDeleteRequests(ids);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "requests_bulk_deleted",
      entityType: "blood_request",
      entityId: null,
      details: `Bulk deleted ${result} request(s): IDs [${ids.join(", ")}]`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

export async function serverBulkUpdateRequestStatus(ids: number[], status: string) {
  const ctx = await requireAdmin();
  if (isSupabaseAvailable()) {
    const result = await bulkUpdateRequestStatusPg(ids, status);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "requests_bulk_status_update",
        entityType: "blood_request",
        entityId: null,
        details: `Bulk updated ${result} request(s) to status "${status}": IDs [${ids.join(", ")}]`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = bulkUpdateRequestStatus(ids, status);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "requests_bulk_status_update",
      entityType: "blood_request",
      entityId: null,
      details: `Bulk updated ${result} request(s) to status "${status}": IDs [${ids.join(", ")}]`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

export async function serverBulkDeleteDonations(ids: number[]) {
  const ctx = await requireFullAdmin();
  if (isSupabaseAvailable()) {
    const result = await bulkDeleteDonationsPg(ids);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "donations_bulk_deleted",
        entityType: "donation",
        entityId: null,
        details: `Bulk deleted ${result} donation(s): IDs [${ids.join(", ")}]`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return result;
  }
  const result = bulkDeleteDonations(ids);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "donations_bulk_deleted",
      entityType: "donation",
      entityId: null,
      details: `Bulk deleted ${result} donation(s): IDs [${ids.join(", ")}]`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return result;
}

// ── Phase 5.1: Donor Matches overview ─────────────────────────────────

export async function serverGetAllDonorMatches(filters?: {
  limit?: number;
  offset?: number;
  status?: string;
  requestId?: number;
  donorId?: number;
}) {
  if (isSupabaseAvailable()) return getAllDonorMatchesPg(filters);
  return dbGetAllDonorMatches(filters);
}

// ── Phase 6: Request lifecycle, history & referrals ───────────────────

/** Public feed: active + last-chance + recently-fulfilled (seal window). */
export async function serverGetVisibleBloodRequests() {
  if (isSupabaseAvailable()) return getVisibleBloodRequestsPg2();
  return getVisibleBloodRequests();
}

/** Per-tab counts for the admin blood-requests page. */
export async function serverGetRequestStatusCounts() {
  if (isSupabaseAvailable()) return getRequestStatusCountsPg();
  return getRequestStatusCounts();
}

/** Admin request listing with lifecycle-aware views/tabs. */
export async function serverGetAdminRequests(filters?: {
  view?:
    | "active"
    | "last_chance"
    | "fulfilled"
    | "expired"
    | "cancelled"
    | "deleted"
    | "all";
  urgencyLevel?: string;
  bloodGroup?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const ctx = await requireAdmin();
  const scoped = { ...(filters || {}) } as any;
  if (ctx.isDistrictAdmin) {
    scoped.districts = districtMatchValues(ctx.assignedDistrict);
  }
  if (isSupabaseAvailable()) return getAdminRequestsPg(scoped);
  return getAdminRequests(scoped);
}

/** Requests owned by a registered user (profile "My Requests" section). */
export async function serverGetMyRequests(userId: number) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery(
      `SELECT * FROM blood_requests
       WHERE requester_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows;
  }
  return getBloodRequestsByRequester(userId);
}

export async function serverGetRequestsByHospital(hospitalNameEn: string, hospitalNameBn?: string) {
  if (isSupabaseAvailable()) return getBloodRequestsByHospitalPg(hospitalNameEn, hospitalNameBn);
  return getBloodRequestsByHospital(hospitalNameEn, hospitalNameBn);
}

export async function serverGetDonationsByHospital(hospitalNameEn: string, hospitalNameBn?: string) {
  if (isSupabaseAvailable()) return getDonationsByHospitalPg(hospitalNameEn, hospitalNameBn);
  return getDonationsByHospital(hospitalNameEn, hospitalNameBn);
}

export async function serverGetHospitalStats(hospitalNameEn: string, hospitalNameBn?: string) {
  if (isSupabaseAvailable()) return getHospitalStatsPg(hospitalNameEn, hospitalNameBn);
  return getHospitalStats(hospitalNameEn, hospitalNameBn);
}

/**
 * Active blood requests a donor could fulfill, ranked for the donor
 * profile "Nearby Requests" section: same district first, then urgency
 * (critical > urgent > normal), then newest.
 */
export async function serverGetRequestsForDonor(donorId: number) {
  const usePg = isSupabaseAvailable();
  const profile = (await (usePg ? serverGetProfileByUserId(donorId) : getProfileByUserId(donorId))) as any;
  if (!profile?.blood_group) return [];

  let rows: any[];
  if (usePg) {
    const groups = DONOR_CAN_DONATE_TO_LOCAL[profile.blood_group] || [profile.blood_group];
    const placeholders = groups.map((_, i) => `$${i + 1}`).join(",");
    const { rows: pgRows } = await pgQuery(
      `SELECT * FROM blood_requests
       WHERE archived_at IS NULL AND status = 'active'
         AND blood_group IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT $${groups.length + 1}`,
      [...groups, 50],
    );
    rows = pgRows;
  } else {
    rows = getActiveRequestsForDonor(profile.blood_group, 50);
  }

  const districtEntry = RANGPUR_DISTRICTS.find(
    (d) =>
      d.id === (profile.district || "").toLowerCase() ||
      d.name_en.toLowerCase() === (profile.district || "").toLowerCase(),
  );
  const districtName = (
    districtEntry?.name_en ||
    profile.district ||
    ""
  ).toLowerCase();

  const urgencyWeight = (u: string) =>
    u === "critical" ? 2 : u === "urgent" ? 1 : 0;

  return rows
    .map((r) => ({
      ...r,
      _score:
        ((r.district || "").toLowerCase() === districtName ? 100 : 0) +
        urgencyWeight(r.urgency_level) * 10 +
        (r.blood_group === profile.blood_group ? 5 : 0),
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);
}

/** Units collected so far for a request (fulfillment progress bar). */
export async function serverGetRequestProgress(requestId: number) {
  if (isSupabaseAvailable()) return getRequestCollectedUnitsPg(requestId);
  return getRequestCollectedUnits(requestId);
}

/** Status-change history for a request (pipeline timestamps). */
export async function serverGetRequestStatusLogs(requestId: number) {
  if (isSupabaseAvailable()) return getStatusLogsPg(requestId);
  return getStatusLogs(requestId);
}

/** Registered requester edits their own active request. */
export async function serverUpdateOwnRequest(
  requestId: number,
  userId: number,
  data: Record<string, any>,
) {
  if (isSupabaseAvailable()) {
    const changes = await updateOwnBloodRequestPg(requestId, userId, data);
    if (changes === 0) {
      throw new Error("Request not found, not active, or not yours");
    }
    try {
      await recordActivityLogPg({
        actorId: userId,
        actorEmail: null,
        action: "request_updated_by_user",
        entityType: "blood_request",
        entityId: String(requestId),
        details: `Requester updated request #${requestId}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return changes;
  }
  const changes = updateOwnBloodRequest(requestId, userId, data);
  if (changes === 0) {
    throw new Error("Request not found, not active, or not yours");
  }
  try {
    dbRecordActivityLog({
      actorId: userId,
      actorEmail: null,
      action: "request_updated_by_user",
      entityType: "blood_request",
      entityId: String(requestId),
      details: `Requester updated request #${requestId}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return changes;
}

/**
 * Checks whether the current visitor is allowed to edit/cancel a guest
 * blood request. Returns true when the request has requester_id = NULL
 * and the visitor's IP or user-agent matches the stored value.
 */
export async function serverCheckGuestEditEligibility(requestId: number): Promise<boolean> {
  const { getVisitorFingerprint, matchesVisitor } = await import("./auth/visitor");
  const { ip, userAgent } = await getVisitorFingerprint();
  const req = (await (isSupabaseAvailable() ? getBloodRequestByIdPg(requestId) : getBloodRequestById(requestId))) as any;
  if (!req) return false;
  if (req.requester_id != null) return false;
  if (req.status !== "active" || req.archived_at != null) return false;
  return matchesVisitor(req.ip_address, req.user_agent, ip, userAgent);
}

/** Guest (unregistered) edits their own active request via IP/UA match. */
export async function serverUpdateGuestRequest(
  requestId: number,
  data: Record<string, any>,
) {
  const { getVisitorFingerprint } = await import("./auth/visitor");
  const { ip, userAgent } = await getVisitorFingerprint();

  // Rate limit: 10 edits per 15 minutes per IP
  const rateKey = `guest-edit:${ip}`;
  const limit = await checkRateLimit(rateKey, 10, 15 * 60 * 1000, 30 * 60 * 1000);
  if (!limit.allowed) {
    const waitMin = Math.ceil(
      ((limit.lockedUntil ?? limit.resetTime) - Date.now()) / 60000,
    );
    throw new Error(
      `Too many edit attempts. Please try again in ${waitMin} minute(s).`,
    );
  }

  const usePg = isSupabaseAvailable();
  const changes = usePg
    ? await updateGuestBloodRequestPg(requestId, ip, userAgent, data)
    : updateGuestBloodRequest(requestId, ip, userAgent, data);
  if (changes === 0) {
    await recordFailedAttempt(rateKey);
    throw new Error("Request not found, not active, or not yours");
  }
  await clearRateLimit(rateKey);
  try {
    if (usePg) {
      await recordActivityLogPg({
        actorId: null,
        actorEmail: null,
        action: "request_updated_by_guest",
        entityType: "blood_request",
        entityId: String(requestId),
        details: `Guest (IP: ${ip}) updated request #${requestId}`,
        ipAddress: ip,
      });
    } else {
      dbRecordActivityLog({
        actorId: null,
        actorEmail: null,
        action: "request_updated_by_guest",
        entityType: "blood_request",
        entityId: String(requestId),
        details: `Guest (IP: ${ip}) updated request #${requestId}`,
        ipAddress: ip,
      });
    }
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return changes;
}

/** Guest (unregistered) cancels their own active request via IP/UA match. */
export async function serverCancelGuestRequest(requestId: number) {
  const { getVisitorFingerprint } = await import("./auth/visitor");
  const { ip, userAgent } = await getVisitorFingerprint();

  // Rate limit: 3 cancellations per 15 minutes per IP
  const rateKey = `guest-cancel:${ip}`;
  const limit = await checkRateLimit(rateKey, 3, 15 * 60 * 1000, 60 * 60 * 1000);
  if (!limit.allowed) {
    const waitMin = Math.ceil(
      ((limit.lockedUntil ?? limit.resetTime) - Date.now()) / 60000,
    );
    throw new Error(
      `Too many cancel attempts. Please try again in ${waitMin} minute(s).`,
    );
  }

  const usePg = isSupabaseAvailable();
  const changes = usePg
    ? await archiveGuestRequestPg(requestId, ip, userAgent)
    : archiveGuestRequest(requestId, ip, userAgent);
  if (changes === 0) {
    await recordFailedAttempt(rateKey);
    throw new Error("Request not found, not active, or not yours");
  }
  await clearRateLimit(rateKey);
  if (usePg) {
    deleteRequestTranslationPg(requestId);
  } else {
    deleteRequestTranslation(requestId);
  }
  try {
    if (usePg) {
      await recordActivityLogPg({
        actorId: null,
        actorEmail: null,
        action: "request_cancelled_by_guest",
        entityType: "blood_request",
        entityId: String(requestId),
        details: `Guest (IP: ${ip}) cancelled request #${requestId}`,
        ipAddress: ip,
      });
    } else {
      dbRecordActivityLog({
        actorId: null,
        actorEmail: null,
        action: "request_cancelled_by_guest",
        entityType: "blood_request",
        entityId: String(requestId),
        details: `Guest (IP: ${ip}) cancelled request #${requestId}`,
        ipAddress: ip,
      });
    }
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return changes;
}

/** Returns the full edit history for a request (admin panel audit trail). */
export async function serverGetRequestEditHistory(requestId: number) {
  if (isSupabaseAvailable()) return getRequestEditHistoryPg(requestId);
  return getRequestEditHistory(requestId);
}

/** Registered requester marks their own active request fulfilled. */

export async function serverMarkOwnRequestFulfilled(
  requestId: number,
  userId: number,
) {
  if (isSupabaseAvailable()) {
    const changes = await markOwnRequestFulfilledPg(requestId, userId);
    if (changes === 0) {
      throw new Error("Request not found, not active, or not yours");
    }
    try {
      await recordActivityLogPg({
        actorId: userId,
        actorEmail: null,
        action: "request_fulfilled_by_user",
        entityType: "blood_request",
        entityId: String(requestId),
        details: `Requester marked request #${requestId} fulfilled`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return changes;
  }
  const changes = markOwnRequestFulfilled(requestId, userId);
  if (changes === 0) {
    throw new Error("Request not found, not active, or not yours");
  }
  try {
    dbRecordActivityLog({
      actorId: userId,
      actorEmail: null,
      action: "request_fulfilled_by_user",
      entityType: "blood_request",
      entityId: String(requestId),
      details: `Requester marked request #${requestId} fulfilled`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return changes;
}

/**
 * Boost an own active request (max once per 24h). Re-runs donor matching
 * and records a fresh notification round so more donors see it.
 */
export async function serverBoostOwnRequest(requestId: number, userId: number) {
  const usePg = isSupabaseAvailable();
  const changes = usePg ? await boostOwnRequestPg(requestId, userId) : boostOwnRequest(requestId, userId);
  if (changes === 0) {
    throw new Error(
      "Boost unavailable — request is not active, not yours, or was boosted within the last 24 hours",
    );
  }

  let matchedCount = 0;
  try {
    const req = (await (usePg ? getBloodRequestByIdPg(requestId) : getBloodRequestById(requestId))) as any;
    if (req) {
      const matches = (await serverFindMatchingDonors(
        req.blood_group,
        req.district,
        req.upazila,
        req.urgency_level || "normal",
        10,
        req.lat ?? null,
        req.lng ?? null,
      )) as any[];
      if (matches && matches.length > 0) {
        await serverRecordDonorMatches(requestId, matches, "boost");
        matchedCount = matches.length;
      }
      if (usePg) {
        await addStatusLogPg(requestId, "active", "requester", "Request boosted by owner");
      } else {
        addStatusLog(requestId, "active", "requester", "Request boosted by owner");
      }
    }
  } catch (e) {
    console.error("Boost re-matching failed (non-blocking):", e);
  }

  try {
    if (usePg) {
      await recordActivityLogPg({
        actorId: userId,
        actorEmail: null,
        action: "request_boosted",
        entityType: "blood_request",
        entityId: String(requestId),
        details: `Requester boosted request #${requestId}; ${matchedCount} donors re-notified`,
      });
    } else {
      dbRecordActivityLog({
        actorId: userId,
        actorEmail: null,
        action: "request_boosted",
        entityType: "blood_request",
        entityId: String(requestId),
        details: `Requester boosted request #${requestId}; ${matchedCount} donors re-notified`,
      });
    }
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return { boosted: true, matchedCount };
}

// ── Saved patient profiles ────────────────────────────────────────────

export async function serverCreateSavedPatient(patient: {
  ownerId: number;
  name: string;
  age?: number | null;
  bloodGroup?: string | null;
  relation?: string | null;
  conditionNote?: string | null;
}) {
  if (!patient.name || patient.name.trim().length < 2) {
    throw new Error("Patient name is required");
  }
  const name = patient.name.trim();
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery(
      `INSERT INTO saved_patients (owner_id, name, age, blood_group, relation, condition_note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        patient.ownerId,
        name,
        patient.age ?? null,
        patient.bloodGroup ?? null,
        patient.relation ?? null,
        patient.conditionNote ?? null,
      ],
    );
    return rows[0].id;
  }
  return createSavedPatient({ ...patient, name });
}

export async function serverGetSavedPatients(ownerId: number) {
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery(
      "SELECT * FROM saved_patients WHERE owner_id = $1 ORDER BY created_at ASC",
      [ownerId],
    );
    return rows;
  }
  return getSavedPatients(ownerId);
}

export async function serverDeleteSavedPatient(id: number, ownerId: number) {
  if (isSupabaseAvailable()) {
    const { rowCount } = await pgQuery(
      "DELETE FROM saved_patients WHERE id = $1 AND owner_id = $2",
      [id, ownerId],
    );
    return rowCount || 0;
  }
  return deleteSavedPatient(id, ownerId);
}

/**
 * The logged-in user's "set" location: profile GPS coordinates if they picked
 * a point on the map during registration, otherwise their upazila/district
 * centroid. Used as the proximity-sort origin when no real-time GPS fix is
 * available. Returns null when logged out or no location is set.
 */
export async function serverGetMyProfileLocation(): Promise<{
  lat: number;
  lng: number;
  label: string;
} | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const profile = (await (isSupabaseAvailable() ? serverGetProfileByEmail(session.email) : getProfileByEmail(session.email))) as any;
    if (!profile) return null;

    if (typeof profile.lat === "number" && typeof profile.lng === "number") {
      const label = [profile.upazila, profile.district].filter(Boolean).join(", ");
      return { lat: profile.lat, lng: profile.lng, label: label || "Saved location" };
    }

    const districtName = (profile.district || "").toLowerCase();
    const upazilaName = (profile.upazila || "").toLowerCase();

    const district = RANGPUR_DISTRICTS.find(
      (d) =>
        d.id === districtName ||
        d.name_en.toLowerCase() === districtName ||
        d.name_bn === profile.district,
    );

    if (upazilaName) {
      const pool = district
        ? RANGPUR_UPAZILAS.filter((u) => u.district_id === district.id)
        : RANGPUR_UPAZILAS;
      const upazila = pool.find(
        (u) =>
          u.id === upazilaName ||
          u.name_en.toLowerCase() === upazilaName ||
          u.name_bn === profile.upazila ||
          // profiles often store just "Sadar" while constants use "Rangpur Sadar"
          u.name_en.toLowerCase().endsWith(upazilaName) ||
          u.name_en.toLowerCase().split(" ")[0] === upazilaName,
      );
      if (upazila) {
        const dName = district ? district.name_en : "";
        return {
          lat: upazila.lat,
          lng: upazila.lng,
          label: dName ? `${upazila.name_en}, ${dName}` : upazila.name_en,
        };
      }
    }

    if (district) {
      return { lat: district.lat, lng: district.lng, label: district.name_en };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Registered requester deletes their own request — instantly hidden from
 * the frontend, kept forever in admin history (reason: deleted_by_user).
 */
export async function serverArchiveOwnRequest(
  requestId: number,
  userId: number,
) {
  if (isSupabaseAvailable()) {
    const changes = await archiveOwnRequestPg(requestId, userId);
    if (changes > 0) {
      try {
        await recordActivityLogPg({
          actorId: userId,
          actorEmail: null,
          action: "request_deleted_by_user",
          entityType: "blood_request",
          entityId: String(requestId),
          details: `Requester deleted request #${requestId}`,
        });
      } catch (e) {
        console.error("Failed to record activity log:", e);
      }
    }
    return changes;
  }
  const changes = dbArchiveOwnRequest(requestId, userId);
  if (changes > 0) {
    try {
      dbRecordActivityLog({
        actorId: userId,
        actorEmail: null,
        action: "request_deleted_by_user",
        entityType: "blood_request",
        entityId: String(requestId),
        details: `Requester deleted request #${requestId}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
  }
  return changes;
}

/**
 * Mark a request fulfilled and record the donation in one step.
 * Optionally records the referrer (registered user or free-text) who
 * helped find the donor, toggles the public "Completed" seal, and sets
 * an admin notice shown on the card.
 */
type MarkRequestFulfilledInput = {
  requestId: number;
  donorId: number;
  donationType?: string;
  units?: number;
  showBadge?: boolean;
  adminNotice?: string | null;
  referrerProfileId?: number | null;
  referrerName?: string | null;
  referrerPhone?: string | null;
  actorId?: number | null;
  actorEmail?: string | null;
};

export async function serverMarkRequestFulfilled(
  input: MarkRequestFulfilledInput,
) {
  const ctx = await requireAdmin();
  const usePg = isSupabaseAvailable();
  if (ctx.isDistrictAdmin) {
    const req = (await (usePg ? getBloodRequestByIdPg(input.requestId) : getBloodRequestById(input.requestId))) as any;
    assertDistrictAllowed(ctx, req?.district);
  }
  return serverMarkRequestFulfilledInner(input);
}

async function serverMarkRequestFulfilledInner(
  input: MarkRequestFulfilledInput,
) {
  const usePg = isSupabaseAvailable();
  const req = usePg ? await getBloodRequestByIdPg(input.requestId) : getBloodRequestById(input.requestId);
  if (!req) throw new Error("Request not found");

  let donationId: number;
  const donationDate = new Date().toISOString().split("T")[0];
  const updateData = {
    status: "fulfilled",
    current_status: "fulfilled",
    donor_id: input.donorId,
    donated_at: new Date().toISOString(),
    fulfilled_at: new Date().toISOString(),
    show_fulfilled_badge: input.showBadge === false ? 0 : 1,
    admin_notice: input.adminNotice ?? null,
    referrer_profile_id: input.referrerProfileId ?? null,
    referrer_name: input.referrerName ?? null,
    referrer_phone: input.referrerPhone ?? null,
  };

  if (usePg) {
    const { rows } = await pgQuery<{ id: number }>(
      `INSERT INTO donations (donor_id, request_id, blood_group, units, hospital_name, donation_date, donation_type, recipient_type, referrer_profile_id, referrer_name, referrer_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        input.donorId,
        input.requestId,
        req.blood_group,
        input.units || 1,
        req.hospital_name ?? null,
        donationDate,
        input.donationType || "whole_blood",
        "Patient",
        input.referrerProfileId ?? null,
        input.referrerName ?? null,
        input.referrerPhone ?? null,
      ],
    );
    donationId = rows[0].id;

    if (input.donorId) {
      await pgQuery(
        `UPDATE profiles
         SET last_donation_date = $1,
             last_donation_type = COALESCE($2, 'whole_blood'),
             show_on_leaderboard = TRUE
         WHERE id = $3
           AND ($1 >= COALESCE(NULLIF(last_donation_date, ''), '0000-01-01'))`,
        [donationDate, input.donationType || "whole_blood", input.donorId],
      );
      await pgQuery(
        `UPDATE profiles SET show_on_leaderboard = TRUE WHERE id = $1 AND show_on_leaderboard = FALSE`,
        [input.donorId],
      );
    }

    await updateBloodRequestPg(input.requestId, updateData);
    await addStatusLogPg(input.requestId, "fulfilled", input.actorEmail || "admin", "Request fulfilled");

    try {
      await recordActivityLogPg({
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: "request_fulfilled",
        entityType: "blood_request",
        entityId: String(input.requestId),
        details: `Request #${input.requestId} fulfilled; donation #${donationId} recorded`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return donationId;
  }

  donationId = dbCreateDonation({
    donorId: input.donorId,
    requestId: input.requestId,
    bloodGroup: req.blood_group,
    units: input.units || 1,
    hospitalName: req.hospital_name,
    donationDate,
    donationType: input.donationType || "whole_blood",
    recipientType: "Patient",
    referrerProfileId: input.referrerProfileId ?? null,
    referrerName: input.referrerName ?? null,
    referrerPhone: input.referrerPhone ?? null,
  });

  dbUpdateBloodRequest(input.requestId, updateData);
  addStatusLog(input.requestId, "fulfilled", input.actorEmail || "admin", "Request fulfilled");

  try {
    dbRecordActivityLog({
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: "request_fulfilled",
      entityType: "blood_request",
      entityId: String(input.requestId),
      details: `Request #${input.requestId} fulfilled; donation #${donationId} recorded`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return donationId;
}

/** Admin posts a blood request from the admin panel. */
export async function serverAdminCreateBloodRequest(
  request: Record<string, any>,
  actor?: { actorId?: number | null; actorEmail?: string | null },
) {
  if (isSupabaseAvailable()) {
    const id = await createBloodRequestPg({
      ...request,
      requesterType: "admin",
      status: "active",
    });
    try {
      await recordActivityLogPg({
        actorId: actor?.actorId ?? null,
        actorEmail: actor?.actorEmail ?? null,
        action: "request_created_by_admin",
        entityType: "blood_request",
        entityId: String(id),
        details: `Admin created request #${id} for ${request.patientName || "patient"}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return id;
  }
  const id = dbCreateBloodRequest({
    ...request,
    requesterType: "admin",
    status: "active",
  });
  try {
    dbRecordActivityLog({
      actorId: actor?.actorId ?? null,
      actorEmail: actor?.actorEmail ?? null,
      action: "request_created_by_admin",
      entityType: "blood_request",
      entityId: String(id),
      details: `Admin created request #${id} for ${request.patientName || "patient"}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return id;
}

/** Top referrers leaderboard (registered users + free-text helpers). */
export async function serverGetTopReferrers(limit: number = 20) {
  if (isSupabaseAvailable()) return getTopReferrersPg(limit);
  return getTopReferrers(limit);
}

/** Public-safe referrer picker search (minimal display fields only). */
export async function serverSearchReferrerCandidates(
  search: string,
  limit: number = 8,
) {
  if (isSupabaseAvailable()) return searchReferrerCandidatesPg(search, limit);
  return searchReferrerCandidates(search, limit);
}

/** Find active blood requests near a location (PG-aware). */
export async function serverFindRequestsNearby(
  lat?: number | null,
  lng?: number | null,
  district?: string,
  bloodGroup?: string,
  limit = 5,
) {
  if (isSupabaseAvailable()) {
    await runRequestLifecycleSweepPg();
    const hasCoords = typeof lat === "number" && typeof lng === "number"
      && Number.isFinite(lat) && Number.isFinite(lng);
    const conditions = ["status = 'active'", "archived_at IS NULL"];
    const params: unknown[] = [];
    if (bloodGroup && bloodGroup !== "ANY") {
      conditions.push(`blood_group = $${params.length + 1}`);
      params.push(bloodGroup);
    }
    const { rows } = await pgQuery(
      `SELECT id, tracking_code, blood_group, units_needed, urgency_level,
              district, upazila, hospital_name, contact_number,
              needed_date, lat, lng, created_at
       FROM blood_requests
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT 200`,
      params,
    );
    const origin = hasCoords
      ? { lat: lat as number, lng: lng as number }
      : district
        ? resolveCoordsLocal(null, null, district)
        : null;
    const districtLower = district?.toLowerCase() ?? null;
    const scored = (rows as any[]).map((r) => {
      let distance: number | null = null;
      if (origin) {
        const reqCoords = resolveCoordsLocal(r.lat, r.lng, r.district, r.upazila);
        const dLat = (origin.lat - reqCoords.lat) * Math.PI / 180;
        const dLng = (origin.lng - reqCoords.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(origin.lat * Math.PI / 180) * Math.cos(reqCoords.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        distance = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
      }
      const sameDistrict = districtLower
        ? (r.district ?? "").toLowerCase() === districtLower
        : false;
      const urgencyBoost = r.urgency_level === "critical" ? 2 : r.urgency_level === "urgent" ? 1 : 0;
      return { r, distance, sameDistrict, urgencyBoost };
    });
    scored.sort((a, b) => {
      if (a.distance !== null || b.distance !== null) {
        const da = a.distance ?? Number.POSITIVE_INFINITY;
        const dbv = b.distance ?? Number.POSITIVE_INFINITY;
        if (da !== dbv) return da - dbv;
      }
      if (a.sameDistrict !== b.sameDistrict) return a.sameDistrict ? -1 : 1;
      if (a.urgencyBoost !== b.urgencyBoost) return b.urgencyBoost - a.urgencyBoost;
      return (b.r.created_at ?? "").localeCompare(a.r.created_at ?? "");
    });
    return scored.slice(0, limit).map(({ r, distance }) => ({
      id: r.id,
      tracking_code: r.tracking_code,
      blood_group: r.blood_group,
      units_needed: r.units_needed,
      urgency_level: r.urgency_level,
      district: r.district,
      upazila: r.upazila ?? null,
      hospital_name: r.hospital_name ?? null,
      contact_number: r.contact_number ?? null,
      needed_date: r.needed_date ?? null,
      distance_km: distance,
      created_at: r.created_at,
    }));
  }
  const { findRequestsNearby } = await import("./db");
  return findRequestsNearby(lat, lng, district, bloodGroup, limit);
}

// ─────────────────────────────────────────────────────────────────────────
// Social community feed — server actions
// ─────────────────────────────────────────────────────────────────────────

const MAX_POST_IMAGES = 4;
const MAX_POST_LENGTH = 2000;

/** Resolve the logged-in profile, or null if anonymous. */
async function getCurrentProfile(): Promise<{
  id: number;
  role: string;
  name: string;
} | null> {
  const session = await getSession();
  if (!session) return null;
  const profile = (await serverGetProfileByUserId(Number(session.sub))) as any;
  if (!profile) return null;
  return {
    id: profile.id,
    role: profile.role,
    name: profile.full_name_en || profile.full_name_bn || "User",
  };
}

/** Public feed — readable by everyone (registered + anonymous). */
export async function serverGetFeed(opts?: {
  limit?: number;
  offset?: number;
  filter?: "all" | "updates" | "requests" | "announcements";
}) {
  const session = await getSession();
  const viewerId = session ? Number(session.sub) : null;
  const feedOpts = {
    viewerId,
    isAdmin: session?.role === "admin" || session?.role === "super_admin",
    limit: opts?.limit ?? 20,
    offset: opts?.offset ?? 0,
    filter: opts?.filter ?? "all",
  };
  if (isSupabaseAvailable()) return getSocialFeedPg(feedOpts);
  return getSocialFeed(feedOpts);
}

export interface CreatePostInput {
  content: string;
  images?: string[];
  postType?: "general" | "donation_update" | "admin_announcement";
  isPublic?: boolean;
  relatedRequestId?: number | null;
}

/** Create a post. Only registered users may post. */
export async function serverCreatePost(input: CreatePostInput) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in to post.");

  const content = (input.content || "").trim();
  if (!content && !(input.images && input.images.length)) {
    throw new Error("Post cannot be empty.");
  }
  if (content.length > MAX_POST_LENGTH) {
    throw new Error(`Post is too long (max ${MAX_POST_LENGTH} characters).`);
  }
  const images = Array.isArray(input.images)
    ? input.images.slice(0, MAX_POST_IMAGES)
    : [];

  // Only admins may create announcements.
  let postType = input.postType || "general";
  if (postType === "admin_announcement" && me.role !== "admin" && me.role !== "super_admin") {
    postType = "general";
  }

  const id = isSupabaseAvailable()
    ? await createSocialPostPg({
        authorId: me.id,
        authorRole: me.role,
        content,
        images,
        postType,
        relatedRequestId: input.relatedRequestId ?? null,
        isPublic: input.isPublic !== false,
      })
    : createSocialPost({
        authorId: me.id,
        authorRole: me.role,
        content,
        images,
        postType,
        relatedRequestId: input.relatedRequestId ?? null,
        isPublic: input.isPublic !== false,
      });

  try {
    if (isSupabaseAvailable()) {
      await recordActivityLogPg({
        actorId: me.id,
        actorEmail: null,
        action: "social_post_created",
        entityType: "social_post",
        entityId: String(id),
        details: `User posted a ${postType} update`,
      });
    } else {
      dbRecordActivityLog({
        actorId: me.id,
        actorEmail: null,
        action: "social_post_created",
        entityType: "social_post",
        entityId: String(id),
        details: `User posted a ${postType} update`,
      });
    }
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }

  // Best-effort PWA push notification for new community posts.
  void sendPushToAll({
    title:
      postType === "admin_announcement"
        ? "📢 New announcement"
        : postType === "donation_update"
          ? "🩸 New donation update"
          : "📝 New community post",
    body: content
      ? content.slice(0, 120)
      : "A new post was shared in the community.",
    url: "/feed",
    tag: "social-post",
  }).catch(() => {});

  return id;
}

/** Update own post (or any post, if admin). */
export async function serverUpdatePost(
  postId: number,
  data: { content?: string; images?: string[]; isPublic?: boolean },
) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in.");

  const post = isSupabaseAvailable() ? await getSocialPostByIdPg(postId) : getSocialPostById(postId);
  if (!post || post.status === "deleted") throw new Error("Post not found.");
  if (post.authorId !== me.id && me.role !== "admin" && me.role !== "super_admin") {
    throw new Error("You can only edit your own posts.");
  }

  const content = data.content !== undefined ? data.content.trim() : undefined;
  if (content !== undefined && content.length > MAX_POST_LENGTH) {
    throw new Error(`Post is too long (max ${MAX_POST_LENGTH} characters).`);
  }

  if (isSupabaseAvailable())
    return updateSocialPostPg(postId, {
      content,
      images: data.images,
      isPublic: data.isPublic,
    });
  return updateSocialPost(postId, {
    content,
    images: data.images,
    isPublic: data.isPublic,
  });
}

/** Delete own post (or any post, if admin). */
export async function serverDeletePost(postId: number) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in.");

  const post = isSupabaseAvailable() ? await getSocialPostByIdPg(postId) : getSocialPostById(postId);
  if (!post || post.status === "deleted") throw new Error("Post not found.");
  if (post.authorId !== me.id && me.role !== "admin" && me.role !== "super_admin") {
    throw new Error("You can only delete your own posts.");
  }

  if (isSupabaseAvailable()) {
    const changes = await deleteSocialPostPg(postId);
    try {
      await recordActivityLogPg({
        actorId: me.id,
        actorEmail: null,
        action: "social_post_deleted",
        entityType: "social_post",
        entityId: String(postId),
        details: `Post #${postId} deleted`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return changes;
  }
  const changes = deleteSocialPost(postId);
  try {
    dbRecordActivityLog({
      actorId: me.id,
      actorEmail: null,
      action: "social_post_deleted",
      entityType: "social_post",
      entityId: String(postId),
      details: `Post #${postId} deleted`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return changes;
}

/** Like / unlike a post. Requires login. */
export async function serverToggleLike(postId: number) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in to like posts.");
  const post = isSupabaseAvailable() ? await getSocialPostByIdPg(postId) : getSocialPostById(postId);
  if (!post || post.status === "deleted") throw new Error("Post not found.");
  const res = isSupabaseAvailable() ? await toggleSocialPostLikePg(postId, me.id) : toggleSocialPostLike(postId, me.id);
  if (res.liked && post.authorId !== me.id) {
    try {
      isSupabaseAvailable()
        ? await createNotificationPg({ userId: post.authorId, actorId: me.id, type: "like", postId })
        : createNotification({ userId: post.authorId, actorId: me.id, type: "like", postId });
    } catch { /* ignore */ }
  }
  return res;
}

/** Comment on a post. Requires login. */
export async function serverAddComment(postId: number, content: string) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in to comment.");
  const text = (content || "").trim();
  if (!text) throw new Error("Comment cannot be empty.");
  if (text.length > 500) throw new Error("Comment is too long.");
  const post = isSupabaseAvailable() ? await getSocialPostByIdPg(postId) : getSocialPostById(postId);
  if (!post || post.status === "deleted") throw new Error("Post not found.");
  const id = isSupabaseAvailable() ? await addSocialPostCommentPg(postId, me.id, me.role, me.name, text) : addSocialPostComment(postId, me.id, me.role, me.name, text);
  if (post.authorId !== me.id) {
    try {
      isSupabaseAvailable()
        ? await createNotificationPg({ userId: post.authorId, actorId: me.id, type: "comment", postId, content: text.slice(0, 200) })
        : createNotification({ userId: post.authorId, actorId: me.id, type: "comment", postId, content: text.slice(0, 200) });
    } catch { /* ignore */ }
  }
  return id;
}

export async function serverGetComments(postId: number) {
  if (isSupabaseAvailable()) return getSocialPostCommentsPg(postId);
  return getSocialPostComments(postId);
}

/** Share a post (increments share counter). Requires login. */
export async function serverSharePost(postId: number) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in to share.");
  const post = isSupabaseAvailable() ? await getSocialPostByIdPg(postId) : getSocialPostById(postId);
  if (!post || post.status === "deleted") throw new Error("Post not found.");
  if (isSupabaseAvailable()) return incrementSocialPostSharePg(postId, me.id);
  return incrementSocialPostShare(postId, me.id);
}

/** Current donor's stats — used to prefill the "share my donation" composer. */
export async function serverGetMyDonationStats() {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in.");
  const donations = (await serverGetDonationsByDonorId(me.id)) as any[];
  const lastDonation = donations[0];
  return {
    count: donations.length,
    lastDonationDate: lastDonation ? lastDonation.donation_date : null,
  };
}

/** Admin: pin / unpin a post to the top of the feed. */
export async function serverPinPost(postId: number, pinned: boolean) {
  await requireAdmin();
  if (isSupabaseAvailable()) {
    const post = await getSocialPostByIdPg(postId);
    if (!post) throw new Error("Post not found.");
    return pinSocialPostPg(postId, pinned);
  }
  const post = getSocialPostById(postId);
  if (!post) throw new Error("Post not found.");
  return pinSocialPost(postId, pinned);
}

/** Admin: paginated list of all posts for moderation. */
export async function serverAdminGetPosts(opts?: {
  filter?: "all" | "pinned" | "deleted";
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  if (isSupabaseAvailable()) return adminGetSocialPostsPg(opts || {});
  return adminGetSocialPosts(opts || {});
}

/** Admin: hard-delete a post from the moderation panel. */
export async function serverAdminDeletePost(postId: number) {
  const ctx = await requireAdmin();
  if (isSupabaseAvailable()) {
    const changes = await deleteSocialPostPg(postId);
    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "social_post_admin_deleted",
        entityType: "social_post",
        entityId: String(postId),
        details: `Admin deleted post #${postId}`,
      });
    } catch (e) {
      console.error("Failed to record activity log:", e);
    }
    return changes;
  }
  const changes = deleteSocialPost(postId);
  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "social_post_admin_deleted",
      entityType: "social_post",
      entityId: String(postId),
      details: `Admin deleted post #${postId}`,
    });
  } catch (e) {
    console.error("Failed to record activity log:", e);
  }
  return changes;
}

// ── Stories (Instagram-style, 24h auto-expire) ───────────────────────

export interface CreateStoryInput {
  imageUrl?: string | null;
  content?: string | null;
}

/** Create a story that auto-expires after 24h. Requires login. */
export async function serverCreateStory(input: CreateStoryInput): Promise<number> {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in to post a story.");
  const content = (input.content || "").trim();
  const imageUrl = input.imageUrl?.trim() || null;
  if (!content && !imageUrl) throw new Error("Story cannot be empty.");

  const id = isSupabaseAvailable()
    ? await createStoryPg({ authorId: me.id, imageUrl, content })
    : createStory({ authorId: me.id, imageUrl, content });

  void sendPushToAll({
    title: "✨ New story",
    body: `${me.name} posted a new story`,
    url: "/feed",
    tag: "social-story",
  }).catch(() => {});

  return id;
}

/** Active (non-expired) stories, grouped for the story rings. */
export async function serverGetStories() {
  return isSupabaseAvailable() ? getStoriesPg() : getStories();
}

/** Current user's avatar + name (for the "You" story ring). */
export async function serverGetMyAvatarInfo(): Promise<{
  avatarUrl: string | null;
  name: string;
} | null> {
  const me = await getCurrentProfile();
  if (!me) return null;
  const profile = (await serverGetProfileByUserId(me.id)) as any;
  if (!profile) return { avatarUrl: null, name: me.name };
  return {
    avatarUrl: profile.avatar_url || null,
    name: me.name,
  };
}

/** Delete your own story. */
export async function serverDeleteStory(storyId: number): Promise<number> {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in.");
  return isSupabaseAvailable()
    ? deleteStoryPg(storyId, me.id)
    : deleteStory(storyId, me.id);
}

// ── Post saves / bookmarks ───────────────────────────────────────────

/** Save / unsave a post. Requires login. */
export async function serverToggleSave(postId: number) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in to save posts.");
  const post = isSupabaseAvailable() ? await getSocialPostByIdPg(postId) : getSocialPostById(postId);
  if (!post || post.status === "deleted") throw new Error("Post not found.");
  return isSupabaseAvailable()
    ? toggleSocialPostSavePg(postId, me.id)
    : toggleSocialPostSave(postId, me.id);
}

/** Single post (full feed-item shape) for the /feed/[id] deep-link page. */
export async function serverGetPostById(postId: number) {
  const session = await getSession();
  const viewerId = session ? Number(session.sub) : null;
  const post = isSupabaseAvailable()
    ? await getSocialPostFullPg(postId, viewerId)
    : getSocialPostFull(postId, viewerId);
  if (!post || post.status === "deleted") return null;
  const isAdmin = session?.role === "admin" || session?.role === "super_admin";
  if (!post.isPublic && viewerId !== post.authorId && !isAdmin) return null;
  return post;
}

/** All active posts by the current user (profile "My Posts" tab). */
export async function serverGetMyPosts() {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in.");
  return isSupabaseAvailable() ? getMyPostsPg(me.id, me.id) : getMyPosts(me.id, me.id);
}

/** Posts saved by the current user (profile "Saved" tab). */
export async function serverGetSavedPosts() {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in.");
  return isSupabaseAvailable() ? getSavedPostsPg(me.id) : getSavedPosts(me.id);
}

// ── In-app notifications (likes / comments) ─────────────────────────

export async function serverGetMyNotifications() {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in.");
  return isSupabaseAvailable() ? getMyNotificationsPg(me.id) : getMyNotifications(me.id);
}

export async function serverMarkNotificationRead(id: number) {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in.");
  return isSupabaseAvailable() ? markNotificationReadPg(id, me.id) : markNotificationRead(id, me.id);
}

export async function serverMarkAllNotificationsRead() {
  const me = await getCurrentProfile();
  if (!me) throw new Error("You must be logged in.");
  return isSupabaseAvailable() ? markAllNotificationsReadPg(me.id) : markAllNotificationsRead(me.id);
}

// ── Web Push subscriptions (PWA notifications) ───────────────────────

export async function serverSavePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const me = await getCurrentProfile();
  return savePushSubscription({
    userId: me?.id ?? null,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
  });
}

export async function serverDeletePushSubscription(endpoint: string) {
  return removePushSubscription(endpoint);
}

// ── Post views + story viewers ───────────────────────────────────────

/** Increment a post's view count (best-effort, no auth required). */
export async function serverIncrementPostView(postId: number) {
  if (isSupabaseAvailable()) return incrementPostViewPg(postId);
  return incrementPostView(postId);
}

/** Record that the current user viewed a story (idempotent). */
export async function serverRecordStoryView(storyId: number) {
  const me = await getCurrentProfile();
  if (!me) return;
  if (isSupabaseAvailable()) return recordStoryViewPg(storyId, me.id);
  return recordStoryView(storyId, me.id);
}

/** List of viewers for a story (name, avatar, viewed_at). */
export async function serverGetStoryViewers(storyId: number) {
  return isSupabaseAvailable() ? getStoryViewersPg(storyId) : getStoryViewers(storyId);
}

// ── Bengali share-text translation ──────────────────────────────────

const BG_TO_BN: Record<string, string> = {
  "A+": "এ+", "A-": "এ-", "B+": "বি+", "B-": "বি-",
  "AB+": "এবি+", "AB-": "এবি-", "O+": "ও+", "O-": "ও-",
};

const WHEN_NEEDED_BN: Record<string, string> = {
  now: "এখনই", today: "আজ", tomorrow: "আগামীকাল", day_after: "পরশু",
  within_3_days: "৩ দিনের মধ্যে", within_week: "এক সপ্তাহের মধ্যে",
  specific_date: "নির্দিষ্ট তারিখ", emergency: "জরুরি",
};

function hasLatin(s: string): boolean {
  return /[A-Za-z]/.test(s);
}

function toBnDigits(s: string): string {
  const map: Record<string, string> = {
    "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
    "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯",
  };
  return s.replace(/[0-9]/g, (d) => map[d] ?? d);
}

/**
 * Builds a Bengali share message for a blood request, using AI to translate
 * any English-language fields (reason, hospital name) into Bengali script.
 * Phone/WhatsApp numbers stay in English digits for tap-to-call convenience.
 */
export async function serverTranslateShareText(input: {
  patient_name: string;
  blood_group: string;
  units_needed: number;
  reason?: string | null;
  hospital_name: string;
  hospital_address?: string | null;
  district: string;
  upazila: string;
  when_needed: string;
  needed_date?: string | null;
  needed_time?: string | null;
  phone?: string | null;
  contact_number?: string | null;
  whatsapp_number?: string | null;
  share_link?: string | null;
  patient_hb_level?: number | null;
}): Promise<{
  text: string;
  translated: boolean;
}> {
  const bgBn = BG_TO_BN[input.blood_group] ?? input.blood_group;
  const unitsBn = `${toBnDigits(String(input.units_needed))} ব্যাগ`;

  const distBn =
    RANGPUR_DISTRICTS.find((d) => d.name_en === input.district)?.name_bn ??
    input.district;
  const upaBn =
    RANGPUR_UPAZILAS.find((u) => u.name_en === input.upazila)?.name_bn ??
    input.upazila;

  let whenBn = WHEN_NEEDED_BN[input.when_needed] ?? input.when_needed;
  if (input.when_needed === "specific_date" && input.needed_date) {
    try {
      whenBn = new Date(input.needed_date).toLocaleDateString("bn-BD", {
        day: "numeric", month: "long", year: "numeric",
      });
    } catch {}
  }
  if (input.needed_time) {
    try {
      const t = new Date(`2000-01-01T${input.needed_time}`).toLocaleTimeString(
        "bn-BD", { hour: "numeric", minute: "2-digit", hour12: true },
      );
      whenBn = `${whenBn}, ${t}`;
    } catch {}
  }

  const contacts = [
    input.phone || input.contact_number,
    input.whatsapp_number,
  ].filter(Boolean) as string[];

  const fieldsToTranslate: { key: string; value: string }[] = [];
  if (input.reason && hasLatin(input.reason)) {
    fieldsToTranslate.push({ key: "reason", value: input.reason });
  }
  const hospitalFull = [input.hospital_name, input.hospital_address]
    .filter(Boolean).join(", ");
  if (hospitalFull && hasLatin(hospitalFull)) {
    fieldsToTranslate.push({ key: "hospital", value: hospitalFull });
  }
  if (input.patient_name && hasLatin(input.patient_name)) {
    fieldsToTranslate.push({ key: "patient_name", value: input.patient_name });
  }

  let translated = false;
  const translatedMap: Record<string, string> = {};

  if (fieldsToTranslate.length > 0) {
    try {
      const inputObj = fieldsToTranslate.reduce((acc, f) => {
        acc[f.key] = f.value;
        return acc;
      }, {} as Record<string, string>);

      const result = await callLLM(
        `Translate to Bengali script. Return JSON with same keys. Keep numbers as-is.\n${JSON.stringify(inputObj)}`,
        {
          jsonMode: true,
          temperature: 0.2,
          maxTokens: 400,
          timeoutMs: 8_000,
          systemPrompt:
            "Translate English to Bengali. Return only JSON.",
        },
      );

      if (result?.text) {
        const fence = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = fence ? fence[1].trim() : result.text.trim();
        const start = jsonStr.indexOf("{");
        const end = jsonStr.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          const parsed = JSON.parse(jsonStr.slice(start, end + 1));
          for (const f of fieldsToTranslate) {
            if (parsed[f.key]) {
              translatedMap[f.key] = parsed[f.key];
              translated = true;
            }
          }
        }
      }
    } catch (e) {
      console.error("Bengali translation failed:", e);
    }
  }

  const reasonBn = translatedMap.reason ?? (input.reason || "");
  const hospitalBn = translatedMap.hospital ?? hospitalFull;
  const patientBn = translatedMap.patient_name ?? input.patient_name;

  const lines: string[] = [
    "আসসালামু আলাইকুম",
    "🚨 জরুরি ভিত্তিতে রক্তের প্রয়োজন",
    "",
    `🧑‍🤒 রোগীর নাম: ${patientBn}`,
  ];
  if (reasonBn) lines.push(`📝 রোগীর সমস্যা: ${reasonBn}`);
  lines.push(
    `🩸 রক্তের গ্রুপ: ${bgBn}`,
    `💉 রক্তের পরিমাণ: ${unitsBn}`,
    `📅 রক্তদানের তারিখ: ${whenBn}`,
    `🏥 রক্তদানের স্থান: ${hospitalBn}`,
    `📍 উপজেলা: ${upaBn}, জেলা: ${distBn}`,
  );
  if (contacts.length > 0) lines.push(`📞 যোগাযোগ: ${contacts.join(", ")}`);
  if (input.share_link) lines.push("", `🔗 ${input.share_link}`);
  if (input.patient_hb_level != null) lines.push(`🩻 Hb: ${input.patient_hb_level} g/dL`);

  return { text: lines.join("\n"), translated };
}

/**
 * Get pre-computed Bengali share text for a request.
 * Returns null if the background translation hasn't completed yet.
 */
export async function serverGetBnShareText(requestId: number): Promise<string | null> {
  if (isSupabaseAvailable()) return getRequestTranslationPg(requestId);
  return getRequestTranslation(requestId);
}

/**
 * Translate and cache Bengali share text for a request on-demand
 * (fallback when the 2-min background job hasn't run yet).
 */
export async function serverTranslateAndCacheBn(requestId: number, input: {
  patient_name: string;
  blood_group: string;
  units_needed: number;
  reason?: string | null;
  hospital_name: string;
  hospital_address?: string | null;
  district: string;
  upazila: string;
  when_needed: string;
  needed_date?: string | null;
  needed_time?: string | null;
  phone?: string | null;
  contact_number?: string | null;
  whatsapp_number?: string | null;
  share_link?: string | null;
  patient_hb_level?: number | null;
}): Promise<string> {
  const cached = isSupabaseAvailable()
    ? await getRequestTranslationPg(requestId)
    : getRequestTranslation(requestId);
  if (cached) return cached;

  const result = await serverTranslateShareText(input);
  try {
    if (isSupabaseAvailable()) {
      await saveRequestTranslationPg(requestId, result.text);
    } else {
      saveRequestTranslation(requestId, result.text);
    }
  } catch (e) {
    console.error("Failed to cache BN translation:", e);
  }
  return result.text;
}

const URGENCY_BN: Record<string, string> = {
  critical: "মারাত্মক", urgent: "জরুরী", normal: "স্বাভাবিক",
};

/**
 * Returns individual Bengali fields for the share image template.
 * Uses the same AI translation as serverTranslateShareText but returns
 * structured data so RequestShareImage can render Bengali content.
 * Numbers stay in English digits for readability.
 */
export async function serverGetBnImageFields(input: {
  request_id?: number;
  patient_name: string;
  blood_group: string;
  units_needed: number;
  reason?: string | null;
  hospital_name: string;
  hospital_address?: string | null;
  district: string;
  upazila: string;
  when_needed: string;
  needed_date?: string | null;
  needed_time?: string | null;
  urgency_level?: string | null;
}): Promise<{
  patientName: string;
  bloodGroup: string;
  unitsNeeded: string;
  hospitalName: string;
  locationText: string;
  whenNeededText: string;
  urgencyLabel: string;
  reason: string;
}> {
  if (input.request_id) {
    const cached = isSupabaseAvailable()
      ? await getRequestTranslationFieldsPg(input.request_id)
      : getRequestTranslationFields(input.request_id);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }

  const bgBn = BG_TO_BN[input.blood_group] ?? input.blood_group;
  const unitsBn = `${input.units_needed} ${input.units_needed > 1 ? "ব্যাগ" : "ব্যাগ"}`;

  const distBn =
    RANGPUR_DISTRICTS.find((d) => d.name_en === input.district)?.name_bn ??
    input.district;
  const upaBn =
    RANGPUR_UPAZILAS.find((u) => u.name_en === input.upazila)?.name_bn ??
    input.upazila;

  let whenBn = WHEN_NEEDED_BN[input.when_needed] ?? input.when_needed;
  if (input.when_needed === "specific_date" && input.needed_date) {
    try {
      whenBn = new Date(input.needed_date).toLocaleDateString("bn-BD", {
        day: "numeric", month: "long", year: "numeric",
      });
    } catch {}
  }
  if (input.needed_time) {
    try {
      const t = new Date(`2000-01-01T${input.needed_time}`).toLocaleTimeString(
        "bn-BD", { hour: "numeric", minute: "2-digit", hour12: true },
      );
      whenBn = `${whenBn}, ${t}`;
    } catch {}
  }

  const urgencyBn = URGENCY_BN[input.urgency_level || "normal"] ?? "স্বাভাবিক";

  const fieldsToTranslate: { key: string; value: string }[] = [];
  if (input.reason && hasLatin(input.reason)) {
    fieldsToTranslate.push({ key: "reason", value: input.reason });
  }
  const hospitalFull = [input.hospital_name, input.hospital_address]
    .filter(Boolean).join(", ");
  if (hospitalFull && hasLatin(hospitalFull)) {
    fieldsToTranslate.push({ key: "hospital", value: hospitalFull });
  }
  if (input.patient_name && hasLatin(input.patient_name)) {
    fieldsToTranslate.push({ key: "patient_name", value: input.patient_name });
  }

  const translatedMap: Record<string, string> = {};
  if (fieldsToTranslate.length > 0) {
    try {
      const inputObj = fieldsToTranslate.reduce((acc, f) => {
        acc[f.key] = f.value;
        return acc;
      }, {} as Record<string, string>);

      const result = await callLLM(
        `Translate to Bengali script. Return JSON with same keys. Keep numbers as-is.\n${JSON.stringify(inputObj)}`,
        {
          jsonMode: true,
          temperature: 0.2,
          maxTokens: 400,
          timeoutMs: 8_000,
          systemPrompt: "Translate English to Bengali. Return only JSON.",
        },
      );

      if (result?.text) {
        const fence = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = fence ? fence[1].trim() : result.text.trim();
        const start = jsonStr.indexOf("{");
        const end = jsonStr.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          const parsed = JSON.parse(jsonStr.slice(start, end + 1));
          for (const f of fieldsToTranslate) {
            if (parsed[f.key]) translatedMap[f.key] = parsed[f.key];
          }
        }
      }
    } catch (e) {
      console.error("Bengali image field translation failed:", e);
    }
  }

  return {
    patientName: translatedMap.patient_name ?? input.patient_name,
    bloodGroup: bgBn,
    unitsNeeded: unitsBn,
    hospitalName: translatedMap.hospital ?? hospitalFull,
    locationText: `${upaBn}, ${distBn}`,
    whenNeededText: whenBn,
    urgencyLabel: urgencyBn,
    reason: translatedMap.reason ?? (input.reason || ""),
  };
}

// ── Donor copy-text translation ──────────────────────────────────────

export async function serverTranslateDonorText(input: {
  fullName: string;
  bloodGroup: string;
  district: string;
  upazila: string;
  phone?: string | null;
}): Promise<string> {
  const districtBn = RANGPUR_DISTRICTS.find((d) => d.name_en === input.district)?.name_bn || input.district;
  const upazilaBn = RANGPUR_UPAZILAS.find((u) => u.name_en === input.upazila)?.name_bn || input.upazila;

  let nameBn = input.fullName;
  if (hasLatin(input.fullName)) {
    try {
      const result = await callLLM(
        `Translate this person's name to Bengali (Bangla) script. Return only the translated name, nothing else.\n\nName: ${input.fullName}`,
        { temperature: 0.2, maxTokens: 100, timeoutMs: 8_000 },
      );
      if (result?.text) {
        nameBn = result.text.trim();
      }
    } catch {
      // Fall back to English name
    }
  }

  const parts = [
    `🩸 ডোনার তথ্য`,
    `রক্তের গ্রুপ: ${input.bloodGroup}`,
    `👤 নাম: ${nameBn}`,
    `📍 ঠিকানা: ${upazilaBn}, ${districtBn}`,
  ];
  if (input.phone) {
    parts.push(`📞 ${input.phone}`);
  }
  return parts.join("\n");
}

// ── Donor identity verification (NID upload + status) ──────────────────────
//
// These actions let a donor submit their NID (front + back images uploaded
// to Cloudinary as `type: "authenticated"` + NID number) for admin review.
// The donor can read their own status and toggle anonymous mode. Admin
// verification actions (serverVerifyDonor, serverSetPhoneVerified) live
// further below and are gated by requireAdmin().

import {
  deleteNidAsset,
  getSignedNidUrl,
  isValidNidPublicId,
} from "./cloudinary-server";
import type {
  VerificationStatus,
  SubmitNidVerificationInput,
} from "@/types/donor-verification";

/** Bangladesh NID: 10 (legacy) or 17 (new smart card) digits. */
function isValidNidNumber(value: string): boolean {
  return /^\d{10}$/.test(value) || /^\d{17}$/.test(value);
}

/**
 * Donor submits their NID for verification. Stores the Cloudinary publicIds
 * (NOT URLs — NID images are `type: "authenticated"` and only viewable via
 * signed URLs). Sets verification_status → "pending". If the donor already
 * had NID images, the old Cloudinary assets are deleted (best-effort) to
 * avoid orphaned PII.
 *
 * Only the donor themselves can call this. verification_status / is_verified
 * are in PROTECTED_PROFILE_FIELDS so this action sets them explicitly (not
 * via serverUpdateProfile, which would strip them).
 */
export async function serverSubmitNidForVerification(
  input: SubmitNidVerificationInput,
): Promise<{ success: boolean; message?: string }> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const userId = Number(session.sub);

  // Validate NID number.
  const nidNumber = (input.nidNumber || "").trim();
  if (!isValidNidNumber(nidNumber)) {
    return {
      success: false,
      message: "NID number must be 10 or 17 digits.",
    };
  }

  // Validate Cloudinary publicIds (must be in trinomul/nid/ folder).
  if (!isValidNidPublicId(input.nidFrontUrl)) {
    return { success: false, message: "Invalid NID front image reference." };
  }
  if (!isValidNidPublicId(input.nidBackUrl)) {
    return { success: false, message: "Invalid NID back image reference." };
  }

  // Fetch current profile to check for old NID assets to clean up.
  const current = (await (isSupabaseAvailable() ? serverGetProfileByUserId(userId) : getProfileByUserId(userId))) as any;
  if (!current) throw new Error("Profile not found");

  // Best-effort cleanup of previous NID assets (don't block on failure).
  const oldAssets = [current.nid_front_url, current.nid_back_url].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  if (oldAssets.length > 0) {
    await Promise.allSettled(oldAssets.map((pid) => deleteNidAsset(pid)));
  }

  // Persist. These fields are NOT in PROTECTED_PROFILE_FIELDS for this path
  // because we write them directly via dbUpdateProfile (not serverUpdateProfile).
  if (isSupabaseAvailable()) {
    await updateProfilePg(userId, {
      nid_number: nidNumber,
      nid_front_url: input.nidFrontUrl,
      nid_back_url: input.nidBackUrl,
      nid_uploaded_at: new Date().toISOString(),
      verification_status: "pending",
      // Reset any previous rejection note — admin will set a new one if rejected again.
      verification_note: null,
    });

    try {
      await recordActivityLogPg({
        actorId: userId,
        actorEmail: session.email,
        action: "nid_submitted",
        entityType: "profile",
        entityId: String(userId),
        details: `Donor submitted NID for verification (number ending ${nidNumber.slice(-4)}).`,
      });
    } catch {
      /* activity log is best-effort */
    }

  return { success: true };
}


  dbUpdateProfile(userId, {
    nid_number: nidNumber,
    nid_front_url: input.nidFrontUrl,
    nid_back_url: input.nidBackUrl,
    nid_uploaded_at: new Date().toISOString(),
    verification_status: "pending",
    // Reset any previous rejection note — admin will set a new one if rejected again.
    verification_note: null,
  });

  try {
    dbRecordActivityLog({
      actorId: userId,
      actorEmail: session.email,
      action: "nid_submitted",
      entityType: "profile",
      entityId: String(userId),
      details: `Donor submitted NID for verification (number ending ${nidNumber.slice(-4)}).`,
    });
  } catch {
    /* activity log is best-effort */
  }

  return { success: true };
}

/** Return shape for serverGetMyVerificationStatus. */
export interface MyVerificationStatus {
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  isAnonymous: boolean;
  nidNumber: string | null;
  nidFrontPublicId: string | null;
  nidBackPublicId: string | null;
  nidUploadedAt: string | null;
  verificationNote: string | null;
  phoneVerified: boolean;
  verifiedAt: string | null;
}

/**
 * Returns the calling donor's own verification status. Used by the donor
 * profile UI to show the current badge + NID upload section state.
 * Only exposes the donor's own data — never another user's.
 */
export async function serverGetMyVerificationStatus(): Promise<MyVerificationStatus | null> {
  const session = await getSession();
  if (!session) return null;
  const userId = Number(session.sub);
  const profile = (await (isSupabaseAvailable() ? serverGetProfileByUserId(userId) : getProfileByUserId(userId))) as any;
  if (!profile) return null;

  const status: VerificationStatus =
    profile.verification_status === "verified" ||
    profile.verification_status === "pending" ||
    profile.verification_status === "rejected"
      ? profile.verification_status
      : "unverified";

  return {
    verificationStatus: status,
    isVerified: Boolean(profile.is_verified),
    isAnonymous: Boolean(profile.is_anonymous),
    nidNumber: profile.nid_number ?? null,
    nidFrontPublicId: profile.nid_front_url ?? null,
    nidBackPublicId: profile.nid_back_url ?? null,
    nidUploadedAt: profile.nid_uploaded_at ?? null,
    verificationNote: profile.verification_note ?? null,
    phoneVerified: Boolean(profile.phone_verified),
    verifiedAt: profile.verified_at ?? null,
  };
}

/**
 * Donor toggles anonymous mode on their own profile. When enabled, the
 * public donor card hides their name and shows only blood group + area +
 * verified badge.
 */
export async function serverSetAnonymousMode(
  value: boolean,
): Promise<{ success: boolean; isAnonymous: boolean }> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const userId = Number(session.sub);

  if (isSupabaseAvailable()) {
    await updateProfilePg(userId, { is_anonymous: value });
  } else {
    dbUpdateProfile(userId, { is_anonymous: value ? 1 : 0 });
  }

  return { success: true, isAnonymous: value };
}

/**
 * Admin-only: generate a short-lived signed URL for viewing an NID image.
 * Used by the admin donor detail page / verification queue. Returns null
 * if Cloudinary is misconfigured or the publicId is invalid.
 */
export async function serverGetSignedNidUrl(
  publicId: string,
  expiresInSec?: number,
): Promise<string | null> {
  await requireAdmin();
  return getSignedNidUrl(publicId, expiresInSec);
}

// ── Admin verification actions ─────────────────────────────────────────────
//
// These are gated by requireAdmin(). District sub-admins can only verify
// donors in their assigned district (assertDistrictAllowed). Both admin
// and super_admin can verify. When both phone + NID are verified, the
// master is_verified flag is set to 1.

/**
 * Returns the queue of donors pending NID verification, sorted FIFO by
 * upload time. District sub-admins only see their own district's donors.
 */
export async function serverGetPendingVerifications() {
  const ctx = await requireAdmin();
  if (isSupabaseAvailable())
    return getPendingVerificationsPg({
      district: ctx.isDistrictAdmin && ctx.assignedDistrict ? ctx.assignedDistrict : undefined,
      limit: 200,
    });
  return dbGetPendingVerifications({
    district: ctx.isDistrictAdmin && ctx.assignedDistrict ? ctx.assignedDistrict : undefined,
    limit: 200,
  });
}

/**
 * Admin toggles a donor's phone-verified status. When phone is verified AND
 * NID is already verified, the master is_verified flag is set to 1.
 */
export async function serverSetPhoneVerified(
  donorId: number,
  value: boolean,
): Promise<{ success: boolean; phoneVerified: boolean; isVerified: boolean }> {
  const ctx = await requireAdmin();
  const target = (await (isSupabaseAvailable() ? serverGetProfileByUserId(donorId) : getProfileByUserId(donorId))) as any;
  if (!target) throw new Error("Donor not found");

  if (ctx.isDistrictAdmin) {
    assertDistrictAllowed(ctx, target.district);
  }

  const phoneVerified = value ? 1 : 0;
  // If phone is now verified AND NID is already verified → master flag on.
  const nidAlreadyVerified = target.verification_status === "verified";
  const isVerified = phoneVerified === 1 && nidAlreadyVerified ? 1 : 0;

  if (isSupabaseAvailable()) {
    await updateProfilePg(donorId, { phone_verified: phoneVerified === 1, is_verified: isVerified === 1 });

    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: value ? "phone_verified_set" : "phone_verified_unset",
        entityType: "profile",
        entityId: String(donorId),
        details: `Admin ${value ? "verified" : "unverified"} phone for donor ${target.full_name_en || `#${donorId}`}.`,
      });
    } catch {
      /* best-effort */
    }

    return { success: true, phoneVerified: value, isVerified: Boolean(isVerified) };
  }
  dbUpdateProfile(donorId, { phone_verified: phoneVerified, is_verified: isVerified });

  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: value ? "phone_verified_set" : "phone_verified_unset",
      entityType: "profile",
      entityId: String(donorId),
      details: `Admin ${value ? "verified" : "unverified"} phone for donor ${target.full_name_en || `#${donorId}`}.`,
    });
  } catch {
    /* best-effort */
  }

  return { success: true, phoneVerified: value, isVerified: Boolean(isVerified) };
}

/**
 * Admin approves or rejects a donor's NID verification.
 *
 * On "verified": sets verification_status → "verified", verified_by_admin_id,
 *   verified_at. If phone is also verified → is_verified = 1.
 * On "rejected": sets verification_status → "rejected", verification_note → note,
 *   is_verified = 0.
 */
export async function serverVerifyDonor(
  donorId: number,
  input: { status: "verified" | "rejected"; note?: string },
): Promise<{ success: boolean; verificationStatus: string; isVerified: boolean }> {
  const ctx = await requireAdmin();
  const target = (await (isSupabaseAvailable() ? serverGetProfileByUserId(donorId) : getProfileByUserId(donorId))) as any;
  if (!target) throw new Error("Donor not found");

  if (ctx.isDistrictAdmin) {
    assertDistrictAllowed(ctx, target.district);
  }

  if (input.status === "verified") {
    const phoneAlreadyVerified = Boolean(target.phone_verified);
    const isVerified = phoneAlreadyVerified ? 1 : 0;
    if (isSupabaseAvailable()) {
      await updateProfilePg(donorId, {
        verification_status: "verified",
        verified_by_admin_id: ctx.id,
        verified_at: new Date().toISOString(),
        verification_note: input.note ?? null,
        is_verified: isVerified === 1,
      });

      try {
        await recordActivityLogPg({
          actorId: ctx.id,
          actorEmail: ctx.email,
          action: "donor_nid_verified",
          entityType: "profile",
          entityId: String(donorId),
          details: `Admin verified NID for donor ${target.full_name_en || `#${donorId}`}.${phoneAlreadyVerified ? " Phone already verified → donor fully verified." : " Phone not yet verified."}`,
        });
      } catch {
        /* best-effort */
      }

      return { success: true, verificationStatus: "verified", isVerified: Boolean(isVerified) };
    }
    dbUpdateProfile(donorId, {
      verification_status: "verified",
      verified_by_admin_id: ctx.id,
      verified_at: new Date().toISOString(),
      verification_note: input.note ?? null,
      is_verified: isVerified,
    });

    try {
      dbRecordActivityLog({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "donor_nid_verified",
        entityType: "profile",
        entityId: String(donorId),
        details: `Admin verified NID for donor ${target.full_name_en || `#${donorId}`}.${phoneAlreadyVerified ? " Phone already verified → donor fully verified." : " Phone not yet verified."}`,
      });
    } catch {
      /* best-effort */
    }

    return { success: true, verificationStatus: "verified", isVerified: Boolean(isVerified) };
  }

  // rejected
  if (isSupabaseAvailable()) {
    await updateProfilePg(donorId, {
      verification_status: "rejected",
      verification_note: input.note ?? null,
      is_verified: false,
    });

    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "donor_nid_rejected",
        entityType: "profile",
        entityId: String(donorId),
        details: `Admin rejected NID for donor ${target.full_name_en || `#${donorId}`}.${input.note ? ` Note: ${input.note}` : ""}`,
      });
    } catch {
      /* best-effort */
    }

    return { success: true, verificationStatus: "rejected", isVerified: false };
  }
  dbUpdateProfile(donorId, {
    verification_status: "rejected",
    verification_note: input.note ?? null,
    is_verified: 0,
  });

  try {
    dbRecordActivityLog({
      actorId: ctx.id,
      actorEmail: ctx.email,
      action: "donor_nid_rejected",
      entityType: "profile",
      entityId: String(donorId),
      details: `Admin rejected NID for donor ${target.full_name_en || `#${donorId}`}.${input.note ? ` Note: ${input.note}` : ""}`,
    });
  } catch {
    /* best-effort */
  }

  return { success: true, verificationStatus: "rejected", isVerified: false };
}

// ── Donor bookmark actions ──────────────────────────────────────────────────

export async function serverToggleBookmark(
  donorId: number,
): Promise<{ success: boolean; bookmarked: boolean }> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const userId = Number(session.sub);
  if (userId === donorId) throw new Error("Cannot bookmark yourself");

  if (isSupabaseAvailable()) {
    const bookmarked = await toggleBookmarkPg(userId, donorId);
    return { success: true, bookmarked };
  }
  const bookmarked = dbToggleBookmark(userId, donorId);
  return { success: true, bookmarked };
}

export async function serverIsBookmarked(
  donorId: number,
): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const userId = Number(session.sub);
  if (isSupabaseAvailable()) return isBookmarkedPg(userId, donorId);
  return dbIsBookmarked(userId, donorId);
}

export async function serverGetBookmarkedDonorIds(): Promise<number[]> {
  const session = await getSession();
  if (!session) return [];
  const userId = Number(session.sub);
  if (isSupabaseAvailable()) return getBookmarkedDonorIdsPg(userId);
  return dbGetBookmarkedDonorIds(userId);
}

export async function serverGetBookmarkedDonors(): Promise<Record<string, unknown>[]> {
  const session = await getSession();
  if (!session) return [];
  const userId = Number(session.sub);
  if (isSupabaseAvailable()) return getBookmarkedDonorsPg(userId);
  return dbGetBookmarkedDonors(userId);
}

// ── Presence tracking ──────────────────────────────────────────────────────

/**
 * Update the caller's `last_active_at` timestamp. Called by the
 * PresenceHeartbeat client component on mount and every 5 minutes.
 * Silently no-ops for anonymous users. Throttled in the DB layer to
 * once per 4 minutes to avoid excessive writes.
 */
export async function serverUpdateLastActive(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const userId = Number(session.sub);
  try {
    if (isSupabaseAvailable()) {
      await updateLastActivePg(userId);
    } else {
      dbUpdateLastActive(userId);
    }
  } catch {
    /* best-effort — presence is non-critical */
  }
}

// ── Donor contact click tracking ───────────────────────────────────────────

/**
 * Record a contact button click (call or WhatsApp). Called from DonorCard
 * when a user clicks the Call or WhatsApp button. Captures the clicker's
 * IP address (always) and user ID/name (if logged in).
 */
export async function serverRecordContactClick(
  donorId: number,
  buttonType: "call" | "whatsapp",
): Promise<void> {
  try {
    const { getVisitorFingerprint } = await import("./auth/visitor");
    const { ip } = await getVisitorFingerprint();
    const session = await getSession();
    const userId = session ? Number(session.sub) : null;
    const userName = session ? session.email ?? null : null;
    if (isSupabaseAvailable()) {
      await recordContactClickPg(donorId, buttonType, ip, userId, userName);
    } else {
      dbRecordContactClick(donorId, buttonType, ip, userId, userName);
    }
  } catch {
    /* best-effort — don't block the call/WhatsApp action */
  }
}


/**
 * Get contact click stats for a donor (admin only).
 */
export async function serverGetDonorContactClickStats(
  donorId: number,
): Promise<{
  totalCall: number;
  totalWhatsapp: number;
  totalClicks: number;
  uniqueClickers: number;
  recentClicks: Array<{
    id: number;
    donor_id: number;
    button_type: string;
    clicker_ip: string | null;
    clicker_user_id: number | null;
    clicker_user_name: string | null;
    created_at: string;
  }>;
}> {
  await requireAdmin();
  if (isSupabaseAvailable()) return getDonorContactClickStatsPg(donorId) as Promise<{
    totalCall: number;
    totalWhatsapp: number;
    totalClicks: number;
    uniqueClickers: number;
    recentClicks: Array<{
      id: number;
      donor_id: number;
      button_type: string;
      clicker_ip: string | null;
      clicker_user_id: number | null;
      clicker_user_name: string | null;
      created_at: string;
    }>;
  }>;
  return dbGetDonorContactClickStats(donorId);
}

// ── Donor Applications (public form → admin approval) ─────────────────

export async function serverSubmitDonorApplication(data: {
  email: string;
  fullNameEn: string;
  fullNameBn: string;
  phone: string;
  whatsappNumber?: string;
  bloodGroup: string;
  district: string;
  upazila?: string;
  address?: string;
  sex: string;
  dateOfBirth: string;
  weightKg: number;
  occupation?: string;
  preferredContact?: string;
  hbLevel?: number;
  lastHbTestDate?: string;
  lastDonationDate?: string;
  hasChronicDisease: boolean;
  diseaseDetails?: string;
  avatarUrl?: string;
}) {
  const existing = (await (isSupabaseAvailable() ? serverGetProfileByEmail(data.email) : getProfileByEmail(data.email))) as any;
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const { randomBytes } = await import("crypto");
  const { hashPassword } = await import("./auth/password");

  const randomPassword = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(randomPassword);

  const usePg = isSupabaseAvailable();
  let id: number;
  if (usePg) {
    id = await createProfilePg({
      email: data.email,
      passwordHash,
      fullNameEn: data.fullNameEn,
      fullNameBn: data.fullNameBn,
      phone: data.phone,
      bloodGroup: data.bloodGroup,
      role: "donor",
      district: data.district,
      upazila: data.upazila || null,
      lat: null,
      lng: null,
    });

    await updateProfilePg(id, {
      address: data.address || null,
      whatsapp_number: data.whatsappNumber || null,
      sex: data.sex,
      date_of_birth: data.dateOfBirth,
      weight_kg: data.weightKg,
      occupation: data.occupation || null,
      preferred_contact: data.preferredContact || "call",
      hb_level: data.hbLevel || null,
      last_hb_test_date: data.lastHbTestDate || null,
      last_donation_date: data.lastDonationDate || null,
      has_chronic_disease: data.hasChronicDisease,
      disease_details: data.diseaseDetails || null,
      avatar_url: data.avatarUrl || null,
      is_approved: false,
      verification_status: "pending",
    });
  } else {
    id = dbCreateProfile({
      email: data.email,
      passwordHash,
      fullNameEn: data.fullNameEn,
      fullNameBn: data.fullNameBn,
      phone: data.phone,
      bloodGroup: data.bloodGroup,
      role: "donor",
      district: data.district,
      upazila: data.upazila || null,
      lat: null,
      lng: null,
    });

    dbUpdateProfile(id, {
      address: data.address || null,
      whatsapp_number: data.whatsappNumber || null,
      sex: data.sex,
      date_of_birth: data.dateOfBirth,
      weight_kg: data.weightKg,
      occupation: data.occupation || null,
      preferred_contact: data.preferredContact || "call",
      hb_level: data.hbLevel || null,
      last_hb_test_date: data.lastHbTestDate || null,
      last_donation_date: data.lastDonationDate || null,
      has_chronic_disease: data.hasChronicDisease ? 1 : 0,
      disease_details: data.diseaseDetails || null,
      avatar_url: data.avatarUrl || null,
      is_approved: 0,
      verification_status: "pending",
    });
  }

  return { id };
}

export async function serverGetDonorApplications(filters?: {
  district?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  await requireAdmin();
  if (isSupabaseAvailable()) {
    const rows = await getDonorApplicationsPg(filters);
    const total = await countDonorApplicationsPg({
      district: filters?.district,
      search: filters?.search,
    });
    return { rows, total };
  }
  const rows = dbGetDonorApplications(filters);
  const total = dbCountDonorApplications({
    district: filters?.district,
    search: filters?.search,
  });
  return { rows, total };
}

export async function serverApproveDonorApplication(id: number) {
  const ctx = await requireAdmin();

  const target = (await (isSupabaseAvailable() ? serverGetProfileByUserId(id) : getProfileByUserId(id))) as any;
  if (!target) throw new Error("Profile not found");
  if (target.is_approved === 1 || target.is_approved === true) throw new Error("Already approved");

  if (isSupabaseAvailable()) {
    await updateProfilePg(id, {
      is_approved: true,
      role: "donor",
      verification_status: "verified",
      verified_by_admin_id: ctx.id,
      verified_at: new Date().toISOString(),
    });

    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "approve_donor_application",
        entityType: "profile",
        entityId: String(id),
        details: `Approved donor application for ${target.full_name_en || target.email} (#${id})`,
      });
    } catch {}
  } else {
    dbUpdateProfile(id, {
      is_approved: 1,
      role: "donor",
      verification_status: "verified",
      verified_by_admin_id: ctx.id,
      verified_at: new Date().toISOString(),
    });

    try {
      dbRecordActivityLog({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "approve_donor_application",
        entityType: "profile",
        entityId: String(id),
        details: `Approved donor application for ${target.full_name_en || target.email} (#${id})`,
      });
    } catch {}
  }

  // Email the applicant the good news (best-effort, never throws).
  try {
    await sendApplicationApprovedEmail({
      to: target.email,
      applicantName:
        target.full_name_en || target.full_name_bn || "Applicant",
    });
  } catch {}

  return { success: true };
}

export async function serverRejectDonorApplication(
  id: number,
  note: string,
) {
  const ctx = await requireAdmin();

  const target = (await (isSupabaseAvailable() ? serverGetProfileByUserId(id) : getProfileByUserId(id))) as any;
  if (!target) throw new Error("Profile not found");

  if (isSupabaseAvailable()) {
    await updateProfilePg(id, {
      is_approved: false,
      verification_status: "rejected",
      verification_note: note,
      verified_by_admin_id: ctx.id,
      verified_at: new Date().toISOString(),
    });

    try {
      await recordActivityLogPg({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "reject_donor_application",
        entityType: "profile",
        entityId: String(id),
        details: `Rejected donor application for ${target.full_name_en || target.email} (#${id}): ${note}`,
      });
    } catch {}
  } else {
    dbUpdateProfile(id, {
      is_approved: 0,
      verification_status: "rejected",
      verification_note: note,
      verified_by_admin_id: ctx.id,
      verified_at: new Date().toISOString(),
    });

    try {
      dbRecordActivityLog({
        actorId: ctx.id,
        actorEmail: ctx.email,
        action: "reject_donor_application",
        entityType: "profile",
        entityId: String(id),
        details: `Rejected donor application for ${target.full_name_en || target.email} (#${id}): ${note}`,
      });
    } catch {}
  }

  // Email the applicant the rejection reason (best-effort, never throws).
  try {
    await sendDonorApplicationRejectedEmail({
      to: target.email,
      applicantName: target.full_name_en || target.full_name_bn || "Applicant",
      note,
    });
  } catch {}

  return { success: true };
}

// ── Contact messages (public form → admin review) ─────────────────────

const ORG_INBOX =
  process.env.ORG_INBOX || "trinomulpaglapir2017@gmail.com";

/** Public: submit the contact form. Persists the message and emails the
 *  org inbox (best-effort). No auth required. */
export async function serverSubmitContactMessage(input: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const name = (input.name || "").trim();
  const email = (input.email || "").trim();
  const message = (input.message || "").trim();
  if (!name || !email || !message) {
    return { success: false, error: "Name, email, and message are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid email address." };
  }
  if (name.length > 200 || email.length > 200 || message.length > 5000) {
    return { success: false, error: "Input too long." };
  }

  const entry = {
    name,
    email,
    phone: (input.phone || "").trim() || null,
    subject: (input.subject || "").trim() || null,
    message,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  };

  try {
    if (isSupabaseAvailable()) {
      await insertContactMessagePg(entry);
    } else {
      dbInsertContactMessage(entry);
    }
  } catch (e) {
    console.error("Failed to save contact message:", e);
    return { success: false, error: "Failed to submit. Please try again." };
  }

  // Best-effort email to the org inbox — never throws.
  try {
    await sendContactMessageEmail(
      { name, email, phone: entry.phone, subject: entry.subject, message },
      ORG_INBOX,
    );
  } catch (e) {
    console.error("Failed to send contact email:", e);
  }

  return { success: true };
}

/** Admin: list contact messages (paginated, optional search). */
export async function serverGetContactMessages(filters?: {
  limit?: number;
  offset?: number;
  search?: string;
  unreadOnly?: boolean;
}) {
  await requireAdmin();
  if (isSupabaseAvailable()) return getContactMessagesPg(filters);
  return dbGetContactMessages(filters);
}

/** Admin: mark a contact message as read. */
export async function serverMarkContactMessageRead(
  id: number,
): Promise<boolean> {
  await requireAdmin();
  if (isSupabaseAvailable()) return markContactMessageReadPg(id);
  return dbMarkContactMessageRead(id);
}

/** Admin: unread count for the sidebar badge / dashboard. */
export async function serverGetUnreadContactMessageCount(): Promise<number> {
  await requireAdmin();
  if (isSupabaseAvailable()) return getUnreadContactMessageCountPg();
  return dbGetUnreadContactMessageCount();
}

