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
