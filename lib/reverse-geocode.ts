/**
 * Reverse geocoding utility — converts lat/lng coordinates into a human-
 * readable place name using OpenStreetMap's free Nominatim API.
 *
 * Usage:
 *   const name = await reverseGeocode(25.7439, 89.2752);
 *   // → "Rangpur Sadar, Rangpur, Bangladesh"
 *
 * Nominatim usage policy (https://nominatim.org/release-docs/develop/api/Reverse/):
 *  - Max 1 request per second per IP
 *  - Must send a valid Referer/User-Agent (browser sends Referer automatically)
 *  - For heavy use, run your own Nominatim instance
 *
 * The function gracefully degrades to coordinates if the API fails, so the
 * UI never breaks — the user always sees something useful.
 */

import {
  RANGPUR_DISTRICTS,
  getUpazilasByDistrict,
  getUnionsByUpazila,
} from "@/lib/constants/rangpur";

export interface ReverseGeocodeResult {
  /** Full display name, e.g. "Rangpur Sadar, Rangpur, Rangpur Division, Bangladesh" */
  displayName: string;
  /** Short place name, e.g. "Rangpur Sadar, Rangpur" */
  shortName: string;
  /** Village-level name */
  village?: string;
  /** Town/area-level name (combined: village | town | city | suburb) */
  town?: string;
  /** Upazila-level name (from Nominatim county/subdistrict) */
  upazila?: string;
  /** District-level name */
  district?: string;
  /** Division-level name */
  state?: string;
  /** Country name */
  country?: string;
}

/**
 * Reverse-geocode a single coordinate pair. Returns null if the API call
 * fails or returns no result — callers should fall back to coordinates.
 *
 * @param lat Latitude
 * @param lng Longitude
 * @param signal Optional AbortSignal to cancel the request
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}` +
    `&accept-language=en` +
    `&zoom=14`; // ~city/town level — gives a useful short name

  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.error) return null;

    const address = data.address ?? {};
    const displayName: string = data.display_name ?? "";

    // Nominatim field mapping for Bangladesh:
    //   address.city          → city/paurashava (e.g. "Rangpur Metropolitan City")
    //   address.village       → village (e.g. "Kakina")
    //   address.town          → town (rarely used in BD)
    //   address.county        → upazila (e.g. "Bhurungamari Upazila")
    //   address.state_district → district (e.g. "Kurigram District")
    //   address.state         → division (e.g. "Rangpur Division")
    //
    // We build a short, readable name from the most specific place + district.
    const town =
      address.town ||
      address.village ||
      address.city ||
      address.city_district ||
      address.suburb;
    const upazila = address.county || address.subdistrict;
    const district = address.state_district || address.district || address.county_district;
    const state = address.state || address.region;
    const country = address.country;

    // Build the short name: prefer "upazila, district" (e.g. "Bhurungamari
    // Upazila, Kurigram District") because upazila is the administrative level
    // people in Bangladesh identify with. Fall back to "city/village, district"
    // if no upazila is returned. Final fallback: first 2 parts of display_name.
    const parts: string[] = [];
    const placeLabel = upazila || town;
    if (placeLabel) parts.push(placeLabel);
    if (district && district !== placeLabel) {
      parts.push(district);
    }

    const shortName =
      parts.length > 0
        ? parts.join(", ")
        : displayName.split(",").slice(0, 2).join(",").trim();

    return {
      displayName,
      shortName,
      village: address.village,
      town,
      upazila,
      district,
      state,
      country,
    };
  } catch (err) {
    // Network error, aborted, or JSON parse failure — degrade gracefully.
    return null;
  }
}

/**
 * Format coordinates as a fallback string when reverse geocoding fails.
 * Example: "25.7439, 89.2752"
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
// ── Reverse geocode → app area IDs ───────────────────────────────────

export interface ResolvedLocation {
  districtId: string | null;
  upazilaId: string | null;
  unionId: string | null;
  label: string;
}

/** Normalize Nominatim admin names to match our constant IDs by stripping
 *  the "Upazila"/"District"/"Division" suffixes and collapsing spaces, while
 *  keeping meaningful parts like "Sadar" and "City". */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b(upazila|district|division|subdistrict|thana)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Turn a Nominatim reverse-geocode result into the app's district/upazila/
 * union IDs by matching the admin names against the constants. Any field the
 * geocoder can't cleanly map is left null (never guessed).
 */
export function resolveLocationFromGeocode(
  result: ReverseGeocodeResult,
): ResolvedLocation {
  let districtId: string | null = null;
  let upazilaId: string | null = null;
  let unionId: string | null = null;

  if (result.district) {
    const n = normalizeName(result.district);
    const d = RANGPUR_DISTRICTS.find(
      (x) => x.id === n || normalizeName(x.name_en) === n || normalizeName(x.name_bn) === n,
    );
    if (d) districtId = d.id;
  }

  if (districtId && result.upazila) {
    const n = normalizeName(result.upazila);
    const ups = getUpazilasByDistrict(districtId);
    const u = ups.find(
      (x) =>
        x.id === n ||
        normalizeName(x.name_en) === n ||
        normalizeName(x.name_en).includes(n) ||
        n.includes(normalizeName(x.name_en)),
    );
    if (u) upazilaId = u.id;
  }

  if (upazilaId) {
    const unionName = result.village || result.town;
    if (unionName) {
      const n = normalizeName(unionName);
      const unions = getUnionsByUpazila(upazilaId);
      const un = unions.find(
        (x) =>
          x.id === n ||
          normalizeName(x.name_en) === n ||
          normalizeName(x.name_bn) === n ||
          normalizeName(x.name_en).includes(n) ||
          n.includes(normalizeName(x.name_en)),
      );
      if (un) unionId = un.id;
    }
  }

  const label = [result.town || result.village, result.upazila, result.district]
    .filter(Boolean)
    .join(", ");

  return {
    districtId,
    upazilaId,
    unionId,
    label: label || result.shortName || result.displayName,
  };
}

/**
 * Reverse-geocode a coordinate and resolve it into the app's area IDs.
 * Returns null when the geocoder fails or returns nothing.
 */
export async function reverseGeocodeAndResolve(
  lat: number,
  lng: number,
): Promise<ResolvedLocation | null> {
  const result = await reverseGeocode(lat, lng);
  if (!result) return null;
  return resolveLocationFromGeocode(result);
}
