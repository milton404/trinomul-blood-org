import { getSession } from "./session";
import { getProfileByUserId } from "../db";
import { isSupabaseAvailable, query as pgQuery } from "@/lib/supabase/client";

export interface ApprovedDonorView {
  /** True for verified donors + admins — they may see exact request coords + navigate. */
  canSeeExactCoords: boolean;
  /** The verified donor's profile, or null for guests/admins/unverified. */
  profile: any | null;
}

/**
 * Privacy gate for patient/request location data.
 *
 * Only donors with `verification_status = 'verified'` (and admins) may see a
 * patient's exact hospital coordinates and use in-app navigation. Everyone
 * else — guests, unverified/pending donors — sees only the coarse
 * upazila/district centroid on the map and no "Navigate" button.
 *
 * Donor live GPS is never stored or shared (it lives only on the donor's own
 * device via `useUserLocation`), so "patient can't see donor real-time" is
 * automatic. This gate protects the OTHER direction: the patient's exact
 * location, which is only revealed to an approved donor who is actively
 * responding to that request.
 *
 * Server-side only — reads the session cookie / Bearer header. Must be called
 * from a server component, route handler, or server function.
 */
export async function getApprovedDonorView(): Promise<ApprovedDonorView> {
  const session = await getSession();
  if (!session) return { canSeeExactCoords: false, profile: null };

  // Admins (full + district) always see exact coords.
  if (session.role === "admin" || session.role === "super_admin") {
    return { canSeeExactCoords: true, profile: null };
  }

  let profile: any;
  try {
    if (isSupabaseAvailable()) {
      const { rows } = await pgQuery(
        "SELECT id, role, verification_status, is_active FROM profiles WHERE id = $1",
        [Number(session.sub)],
      );
      profile = rows[0] || null;
    } else {
      profile = await getProfileByUserId(Number(session.sub));
    }
  } catch {
    return { canSeeExactCoords: false, profile: null };
  }

  if (!profile) return { canSeeExactCoords: false, profile: null };
  if (profile.is_active === 0 || profile.is_active === false) {
    return { canSeeExactCoords: false, profile: null };
  }

  const isVerifiedDonor =
    profile.role === "donor" && profile.verification_status === "verified";
  return {
    canSeeExactCoords: isVerifiedDonor,
    profile: isVerifiedDonor ? profile : null,
  };
}