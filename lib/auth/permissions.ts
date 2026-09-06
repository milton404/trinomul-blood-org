import { getSession } from "./session";
import { getProfileByUserId } from "../db";
import { isSupabaseAvailable, query as pgQuery } from "@/lib/supabase/client";
import { RANGPUR_DISTRICTS } from "@/lib/constants/rangpur";

/**
 * Admin permission model
 * ──────────────────────
 * - super_admin            → full access to everything (main admin)
 * - admin, no district     → full admin (legacy / trusted admin)
 * - admin, assigned_district set → DISTRICT (sub) admin:
 *     · sees & manages ONLY their district's donors/patients/hospitals
 *       and blood requests
 *     · CANNOT delete any profile (no donor deletion)
 *     · CANNOT manage admins, change site settings, or view the global
 *       activity log
 *     · every mutating action is recorded in the activity log, which the
 *       main admin reviews
 */

export interface AdminContext {
  id: number;
  email: string;
  role: string;
  isFullAdmin: boolean;
  isDistrictAdmin: boolean;
  assignedDistrict: string | null;
  assignedUpazila: string | null;
  policyAccepted: boolean;
}

/** All lowercase values a district assignment should match against
 *  (profiles store the id, requests store the English name, some legacy
 *  rows may store Bengali). */
export function districtMatchValues(assigned: string | null | undefined): string[] {
  if (!assigned) return [];
  const values = new Set<string>([assigned.toLowerCase()]);
  const entry = RANGPUR_DISTRICTS.find(
    (d) =>
      d.id === assigned.toLowerCase() ||
      d.name_en.toLowerCase() === assigned.toLowerCase(),
  );
  if (entry) {
    values.add(entry.id.toLowerCase());
    values.add(entry.name_en.toLowerCase());
    values.add(entry.name_bn.toLowerCase());
  }
  return [...values];
}

/** Resolve the current session into an admin context, or null if the
 *  caller is not an admin at all. */
export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== "admin" && session.role !== "super_admin") return null;

  let profile: any;
  if (isSupabaseAvailable()) {
    const { rows } = await pgQuery("SELECT * FROM profiles WHERE id = $1", [Number(session.sub)]);
    profile = rows[0] || null;
  } else {
    profile = await getProfileByUserId(Number(session.sub));
  }
  if (!profile || profile.is_active === 0 || profile.is_active === false) return null;

  const assignedDistrict: string | null =
    session.role === "admin" ? profile.assigned_district || null : null;
  const isDistrictAdmin = session.role === "admin" && !!assignedDistrict;

  return {
    id: profile.id,
    email: profile.email,
    role: session.role,
    isFullAdmin: session.role === "super_admin" || !isDistrictAdmin,
    isDistrictAdmin,
    assignedDistrict,
    assignedUpazila: profile.assigned_upazila || null,
    policyAccepted: !!profile.admin_policy_accepted_at,
  };
}

/** Require any admin (full or district-scoped). Throws otherwise. */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) throw new Error("Unauthorized: admin access required");
  return ctx;
}

/** Require a full admin (super_admin or unscoped admin). District
 *  sub-admins are rejected. */
export async function requireFullAdmin(): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (!ctx.isFullAdmin) {
    throw new Error(
      "Forbidden: this action requires a main admin. District admins cannot perform it.",
    );
  }
  return ctx;
}

/**
 * For district admins: verify a target row's district falls inside their
 * assignment. No-op for full admins. `targetDistrict` may be a district
 * id or display name.
 */
export function assertDistrictAllowed(
  ctx: AdminContext,
  targetDistrict: string | null | undefined,
): void {
  if (!ctx.isDistrictAdmin) return;
  const allowed = districtMatchValues(ctx.assignedDistrict);
  if (!allowed.includes((targetDistrict || "").toLowerCase())) {
    throw new Error(
      "Forbidden: this record is outside your assigned district.",
    );
  }
}
