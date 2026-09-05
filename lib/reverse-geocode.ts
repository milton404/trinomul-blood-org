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
