"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { serverGetMyProfileLocation } from "@/lib/db-actions";

export interface UserLocation {
  lat: number;
  lng: number;
}

export type LocationSource = "gps" | "cache" | "profile";

const CACHE_KEY = "tbb_user_location_v1";

/** Haversine distance in kilometres between two coordinate pairs. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface CachedLocation extends UserLocation {
  placeName?: string;
  ts?: number;
}

/**
 * Shared user-location hook.
 *
 * Resolution priority:
 *   1. Real-time GPS (via `requestLocation()`)
 *   2. localStorage cache from a previous GPS fix
 *   3. The logged-in user's profile location (district/upazila they set)
 *
 * A successful GPS fix is reverse-geocoded (Nominatim) into a human-readable
 * place name so the UI can show "Nearest first · Rangpur Sadar, Rangpur".
 */
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [source, setSource] = useState<LocationSource | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const persist = useCallback((loc: UserLocation, name?: string | null) => {
    try {
      const payload: CachedLocation = { ...loc, placeName: name ?? undefined, ts: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // storage unavailable — ignore
    }
  }, []);

  // Load cached GPS fix on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CachedLocation;
      if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
        setLocation({ lat: parsed.lat, lng: parsed.lng });
        setSource("cache");
        if (parsed.placeName) setPlaceName(parsed.placeName);
      }
    } catch {
      // corrupted cache — ignore
    }
  }, []);

  // Profile fallback: no cached fix → use the location the user set in their profile.
  useEffect(() => {
    if (location) return;
    let cancelled = false;
    (async () => {
      try {
        const p = (await serverGetMyProfileLocation()) as any;
        if (!cancelled && p && typeof p.lat === "number" && typeof p.lng === "number") {
          setLocation({ lat: p.lat, lng: p.lng });
          setSource("profile");
          if (p.label) setPlaceName(p.label);
        }
      } catch {
        // not logged in / no profile location — fine
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location]);

  const placeNameRef = useRef(placeName);
  placeNameRef.current = placeName;

  const handleGpsSuccess = useCallback(
    async (pos: GeolocationPosition) => {
      if (!mountedRef.current) return;
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setIsLocating(false);
      setLocation(loc);
      setSource("gps");
      setError(null);
      persist(loc, placeNameRef.current);
      // Reverse-geocode in the background to name the place.
      try {
        const geo = await reverseGeocode(loc.lat, loc.lng);
        if (mountedRef.current && geo?.shortName) {
          setPlaceName(geo.shortName);
          persist(loc, geo.shortName);
        }
      } catch {
        // naming is best-effort
      }
    },
    [persist],
  );

  const handleGpsFailure = useCallback((msg: string) => {
    if (!mountedRef.current) return;
    setIsLocating(false);
    setError(msg);
  }, []);

  /** Ask the browser for the user's real-time location (with low-accuracy retry). */
  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    setError(null);

    // Safety timeout: if the geolocation request hangs (common in sandboxed/preview browsers),
    // stop the spinner after 20 seconds and show an error.
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current) {
        setIsLocating(false);
        setError("Location request timed out. Please try again or use a full browser.");
      }
    }, 20000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(safetyTimeout);
        handleGpsSuccess(pos);
      },
      (err) => {
        clearTimeout(safetyTimeout);
        // High accuracy failed → retry with low accuracy (works indoors).
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            (pos) => handleGpsSuccess(pos),
            () => handleGpsFailure("Unable to retrieve your location. Please check permissions."),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
          );
        } else {
          handleGpsFailure("Unable to retrieve your location. Please check permissions.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [handleGpsSuccess, handleGpsFailure]);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setSource(null);
    setPlaceName(null);
    setError(null);
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    location,
    source,
    placeName,
    isLocating,
    error,
    requestLocation,
    clearLocation,
  };
}
