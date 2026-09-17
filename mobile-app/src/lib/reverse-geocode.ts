import { DISTRICTS, UPAZILAS, getUpazilasByDistrict } from '@/constants/data';
import { getUnionsByUpazila } from '@/constants/unions';

export interface ReverseGeocodeResult {
  displayName: string;
  shortName: string;
  village: string | null;
  town: string | null;
  upazila: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
}

export interface ResolvedLocation {
  districtId: string | null;
  upazilaId: string | null;
  unionId: string | null;
  label: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en&zoom=14`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TrinomulBloodBank/1.0 (mobile-app)' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const upazila = addr.county || addr.subdistrict || null;
    const district = addr.state_district || addr.district || addr.county_district || null;
    const state = addr.state || addr.region || null;
    const town = addr.town || addr.village || addr.city || addr.city_district || addr.suburb || null;
    const village = addr.village || addr.hamlet || null;
    const country = addr.country || null;
    const parts = [upazila, district].filter(Boolean);
    const shortName = parts.length >= 2 ? parts.join(', ') : (data.display_name?.split(',').slice(0, 2).join(', ') || '');
    return {
      displayName: data.display_name || shortName,
      shortName,
      village,
      town,
      upazila,
      district,
      state,
      country,
    };
  } catch {
    return null;
  }
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\s+(district|upazila|sadar)$/g, '').trim();
}

export function resolveLocationFromGeocode(result: ReverseGeocodeResult): ResolvedLocation {
  let districtId: string | null = null;
  let upazilaId: string | null = null;
  let unionId: string | null = null;

  if (result.district) {
    const norm = normalizeName(result.district);
    const match = DISTRICTS.find((d) => normalizeName(d.name) === norm || d.id === norm);
    if (match) districtId = match.id;
  }

  if (districtId && result.upazila) {
    const norm = normalizeName(result.upazila);
    const upazilas = getUpazilasByDistrict(districtId);
    const match = upazilas.find((u) => normalizeName(u.name) === norm || u.id === norm);
    if (match) upazilaId = match.id;
  }

  if (upazilaId && result.village) {
    const norm = normalizeName(result.village);
    const unions = getUnionsByUpazila(upazilaId);
    const match = unions.find((u) => normalizeName(u.name_en) === norm || u.id === norm);
    if (match) unionId = match.id;
  }

  const labelParts = [result.town || result.village, result.upazila, result.district].filter(Boolean);
  const label = labelParts.join(', ') || result.shortName || result.displayName;

  return { districtId, upazilaId, unionId, label };
}

export async function reverseGeocodeAndResolve(lat: number, lng: number): Promise<ResolvedLocation | null> {
  const result = await reverseGeocode(lat, lng);
  if (!result) return null;
  return resolveLocationFromGeocode(result);
}