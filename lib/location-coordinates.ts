import {
  RANGPUR_DISTRICTS,
  RANGPUR_UPAZILAS,
  RANGPUR_UNIONS,
  type District,
  type Upazila,
  type Union,
} from "./constants/rangpur";

export interface Coordinates {
  lat: number;
  lng: number;
}

const BANGLADESH_BOUNDS = {
  minLat: 20.5,
  maxLat: 26.7,
  minLng: 88,
  maxLng: 92.8,
};

/** Default fallback — Rangpur city center. */
export const RANGPUR_CENTER: Coordinates = { lat: 25.7439, lng: 89.2752 };

export function isValidBangladeshCoordinatePair(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= BANGLADESH_BOUNDS.minLat &&
    lat <= BANGLADESH_BOUNDS.maxLat &&
    lng >= BANGLADESH_BOUNDS.minLng &&
    lng <= BANGLADESH_BOUNDS.maxLng
  );
}

export function toValidBangladeshCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): Coordinates | null {
  if (!isValidBangladeshCoordinatePair(lat, lng)) {
    return null;
  }

  return { lat: lat as number, lng: lng as number };
}

// ── Geographic hierarchy matching ─────────────────────────────────────
//
// Several upazila names exist in MORE THAN ONE district of the Rangpur
// division (e.g. "Pirganj" is in both Rangpur and Thakurgaon, "Phulbari"
// in both Dinajpur and Kurigram). Matching by name alone therefore pins
// donors/requests to the wrong district. All lookups below are scoped to
// the known district first; a global match is only used when the district
// itself is unknown.

function matchDistrict(name: string): District | undefined {
  const lower = name.toLowerCase();
  return RANGPUR_DISTRICTS.find(
    (d) =>
      d.id === lower || d.name_en.toLowerCase() === lower || d.name_bn === name,
  );
}

function matchUpazila(name: string, districtId?: string): Upazila | undefined {
  const lower = name.toLowerCase();
  const matches = (u: Upazila) =>
    u.id === lower || u.name_en.toLowerCase() === lower || u.name_bn === name;
  if (districtId) {
    // District is known — only accept an upazila inside it. Falling back to
    // a global match here could place the point in a different district.
    return RANGPUR_UPAZILAS.find(
      (u) => u.district_id === districtId && matches(u),
    );
  }
  return RANGPUR_UPAZILAS.find(matches);
}

function matchUnion(name: string, districtId?: string): Union | undefined {
  const lower = name.toLowerCase();
  const matches = (u: Union) =>
    u.id === lower || u.name_en.toLowerCase() === lower || u.name_bn === name;
  if (districtId) {
    return RANGPUR_UNIONS.find((u) => {
      if (!matches(u)) return false;
      const upazila = RANGPUR_UPAZILAS.find((x) => x.id === u.upazila_id);
      return upazila?.district_id === districtId;
    });
  }
  return RANGPUR_UNIONS.find(matches);
}

/**
 * Resolve an area centroid from the geographic hierarchy, district-scoped
 * to avoid duplicate upazila/union names resolving to the wrong district.
 *
 * Priority: union → upazila → district. Returns null when nothing matches
 * (callers can then decide their own fallback).
 */
export function resolveAreaCentroid(
  districtName?: string | null,
  upazilaName?: string | null,
  unionName?: string | null,
): Coordinates | null {
  const district = districtName ? matchDistrict(districtName) : undefined;

  if (unionName) {
    const union = matchUnion(unionName, district?.id);
    if (union) return { lat: union.lat, lng: union.lng };
  }
  if (upazilaName) {
    const upazila = matchUpazila(upazilaName, district?.id);
    if (upazila) return { lat: upazila.lat, lng: upazila.lng };
  }
  if (district) return { lat: district.lat, lng: district.lng };
  return null;
}

/**
 * Full coordinate resolution used across the app:
 * exact GPS coords (bounds-validated) → union centroid → upazila centroid
 * → district centroid → Rangpur city center.
 *
 * Upazila/union lookups are scoped by district so same-named areas in
 * different districts (Pirganj, Phulbari) resolve to the correct place.
 */
export function resolveLocationCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
  districtName?: string | null,
  upazilaName?: string | null,
  unionName?: string | null,
): Coordinates {
  const exact = toValidBangladeshCoordinates(lat, lng);
  if (exact) return exact;
  const centroid = resolveAreaCentroid(districtName, upazilaName, unionName);
  if (centroid) return centroid;
  return RANGPUR_CENTER;
}
