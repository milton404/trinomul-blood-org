import {
  toValidBangladeshCoordinates,
  resolveAreaCentroid,
} from "@/lib/location-coordinates";

/**
 * Coarsen a blood request's coordinates for privacy.
 *
 * When `canSeeExactCoords` is true (verified donor / admin), the request's
 * exact lat/lng are preserved and `canNavigate` is set so the UI can render
 * the "Get Directions" button + route line.
 *
 * Otherwise the exact coords are replaced with the upazila/district centroid
 * (or nulled when no centroid is resolvable) and `canNavigate` is false.
 * This is the SERVER-SIDE enforcement — the client only hides UI based on
 * `canNavigate`. Client-side hiding alone is not security; this function is
 * the authoritative gate applied before data reaches the client.
 */
export function coarsenRequestCoords<T extends Record<string, any>>(
  req: T,
  canSeeExactCoords: boolean,
): T & { canNavigate: boolean } {
  if (canSeeExactCoords) {
    const exact = toValidBangladeshCoordinates(req.lat, req.lng);
    if (exact) return { ...req, canNavigate: true };
    // Approved viewer but the stored coords are invalid/missing — fall
    // through to the centroid so the map still shows something useful.
  }

  const centroid = resolveAreaCentroid(
    req.district,
    req.upazila,
    req.union_name ?? req.union,
  );
  return {
    ...req,
    lat: centroid ? centroid.lat : null,
    lng: centroid ? centroid.lng : null,
    canNavigate: false,
  };
}

/** Apply the gate to a single request row (null-safe). */
export function coarsenRequestCoordsOrNull(
  req: Record<string, any> | null,
  canSeeExactCoords: boolean,
): (Record<string, any> & { canNavigate: boolean }) | null {
  if (!req) return null;
  return coarsenRequestCoords(req, canSeeExactCoords);
}