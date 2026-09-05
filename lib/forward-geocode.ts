/**
 * Forward geocoding utility — converts a place name (English, Bangla, or
 * Banglish) into lat/lng coordinates using OpenStreetMap's Nominatim search
 * API. Used by the request form's location search bar so users can search
 * "রংপুর", "Rangpur", or "rongpur" and get the same result.
 *
 * Nominatim usage policy (https://nominatim.org/release-docs/develop/api/Search/):
 *  - Max 1 request per second per IP
 *  - Must send a valid Referer/User-Agent (browser sends Referer automatically)
 *  - For heavy use, run your own Nominatim instance
 */

export interface PlaceSearchResult {
  /** OSM place id (stable identifier for the result) */
  placeId?: number;
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Full display name, e.g. "Rangpur Medical College Hospital, Badarganj, Rangpur" */
  displayName: string;
  /** Short name — first 2-3 components of displayName */
  shortName: string;
  /** OSM type: "way" | "node" | "relation" */
  osmType?: string;
  /** OSM id */
  osmId?: number;
  /** Type/category from OSM (e.g. "hospital", "town", "suburb") */
  type?: string;
  /** Address components if returned by Nominatim */
  address?: {
    hospital?: string;
    amenity?: string;        // e.g. "hospital", "clinic", "doctors"
    healthcare?: string;     // e.g. "hospital"
    road?: string;
    village?: string;
    town?: string;
    city?: string;
    suburb?: string;
    county?: string;       // upazila in BD
    state_district?: string; // district in BD
    state?: string;        // division in BD
    country?: string;
    postcode?: string;
    [key: string]: string | undefined; // allow other Nominatim fields freely
  };
}

/**
 * Search for a place by name. Returns up to `limit` (default 5) results
 * sorted by relevance. Returns an empty array on error or no results —
 * callers can then fall back to AI-assisted query correction.
 *
 * @param query Place name in English, Bangla, or Banglish (e.g. "Rangpur", "রংপুর", "rongpur")
 * @param limit Max results to return (default 5)
 * @param signal Optional AbortSignal to cancel the request
 */
export async function searchPlace(
  query: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Restrict the search to Bangladesh for relevance (Rangpur division is
  // the project's service area). Nominatim accepts countryCodes as ISO-2.
  // We use a "viewbox" around Rangpur division to bias results locally,
  // but allow nationwide matches as a fallback.
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&q=${encodeURIComponent(trimmed)}` +
    `&limit=${limit}` +
    `&accept-language=en` +
    `&countrycodes=bd`;

  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any): PlaceSearchResult => {
      const displayName: string = item.display_name ?? "";
      const parts = displayName.split(",").map((p: string) => p.trim());
      const shortName = parts.slice(0, 2).join(", ");

      return {
        placeId: item.place_id,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName,
        shortName,
        osmType: item.osm_type,
        osmId: item.osm_id,
        type: item.type,
        address: item.address,
      };
    });
  } catch {
    // Network error, aborted, or JSON parse failure — degrade gracefully.
    return [];
  }
}

// ── Backward-compatible aliases ─────────────────────────────────────
// Older code (MapSearchBar, requests/page, MapContainerWrapper) imports
// `forwardGeocode` and `ForwardGeocodeResult`. These are thin aliases so
// both the old and new APIs work from the same module.

export type ForwardGeocodeResult = PlaceSearchResult;

/**
 * Backward-compatible wrapper around `searchPlace`. Older callers pass
 * `(query, signal?)` instead of `(query, limit?, signal?)`.
 */
export async function forwardGeocode(
  query: string,
  signal?: AbortSignal,
): Promise<ForwardGeocodeResult[]> {
  return searchPlace(query, 5, signal);
}
