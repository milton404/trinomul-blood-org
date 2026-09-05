"use client";

import { useEffect, useMemo, useState } from "react";
import { Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";
import { Loader2, LocateFixed } from "lucide-react";

interface UserLocationMarkerProps {
  /**
   * When provided, the map recenters on this location and a pulsing dot is
   * shown. When undefined, a "Locate Me" button is rendered instead.
   */
  position?: { lat: number; lng: number; accuracy?: number } | null;
  /**
   * Called when the user clicks the Locate button and GPS resolves.
   * Lets the host page (e.g. donors list) sort/filter by proximity.
   */
  onLocate?: (pos: { lat: number; lng: number; accuracy?: number }) => void;
}

/**
 * A floating "Locate Me" control + pulsing blue dot marker for the user's
 * GPS location. When `position` is controlled by the parent, only the dot
 * is rendered (the parent triggers geolocation itself). When `position` is
 * omitted, an internal button triggers geolocation on click.
 *
 * Geolocation strategy:
 *  1. Try high-accuracy GPS with a 15s timeout.
 *  2. If that fails or times out, retry with low accuracy (network/cell-based)
 *     which is faster and works on devices without a GPS chip.
 *  3. Distinguish error types (permission denied vs timeout vs unavailable) so
 *     the user gets an actionable message instead of a generic failure.
 *
 * Must be rendered as a child of <MapContainerWrapper>.
 */
export default function UserLocationMarker({
  position,
  onLocate,
}: UserLocationMarkerProps) {
  const t = useTranslations("map");
  const map = useMap();
  const [internalPos, setInternalPos] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);

  const activePos = position ?? internalPos;

  const dotIcon = useMemo(
    () =>
      L.divIcon({
        html: `
          <div style="position:relative;width:24px;height:24px;">
            <span style="
              position:absolute;inset:0;border-radius:50%;
              background:rgba(37,99,235,0.35);
              animation:userloc-ping 1.6s ease-out infinite;
            "></span>
            <span style="
              position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
              width:14px;height:14px;border-radius:50%;
              background:#2563eb;border:3px solid #fff;
              box-shadow:0 0 8px rgba(37,99,235,0.8);
            "></span>
          </div>`,
        className: "user-location-pin",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    [],
  );

  // Recenter on the active position when it changes. Use a higher zoom level
  // so the user can actually see their surroundings.
  useEffect(() => {
    if (activePos) {
      map.setView([activePos.lat, activePos.lng], Math.max(map.getZoom(), 14), {
        animate: true,
      });
    }
  }, [activePos, map]);

  /**
   * Translates a GeolocationPositionError code into a user-friendly message.
   * Returns the localized string when available, otherwise a sensible default.
   */
  const getErrorMessage = (err: GeolocationPositionError): string => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return (
          t("location_permission_denied") ||
          "Location permission denied. Please enable location access in your browser settings."
        );
      case err.POSITION_UNAVAILABLE:
        return (
          t("location_unavailable") ||
          "Location is unavailable. Check your GPS or network connection."
        );
      case err.TIMEOUT:
        return (
          t("location_timeout") ||
          "Location detection timed out. Please try again."
        );
      default:
        return (
          t("location_detection_failed") ||
          "Could not detect your location."
        );
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      alert(t("location_detection_failed"));
      return;
    }
    setLocating(true);

    // Step 1: attempt high-accuracy GPS with a generous 15s timeout.
    // enableHighAccuracy can be slow on devices with weak GPS, so we allow
    // plenty of time. maximumAge: 0 forces a fresh fix.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setInternalPos(next);
        onLocate?.(next);
        setLocating(false);
      },
      (err) => {
        // Step 2: if high accuracy failed or timed out, retry with low
        // accuracy (cell-tower / Wi-Fi positioning). This is faster and
        // works indoors or on devices without a GPS chip.
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const next = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              };
              setInternalPos(next);
              onLocate?.(next);
              setLocating(false);
            },
            (err2) => {
              setLocating(false);
              alert(getErrorMessage(err2));
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            },
          );
        } else {
          // Permission denied — no point retrying.
          setLocating(false);
          alert(getErrorMessage(err));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  return (
    <>
      {activePos && (
        <>
          <Marker
            position={[activePos.lat, activePos.lng]}
            icon={dotIcon}
            zIndexOffset={1000}
          />
          {activePos.accuracy && (
            <Circle
              center={[activePos.lat, activePos.lng]}
              radius={activePos.accuracy}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#2563eb",
                fillOpacity: 0.08,
                weight: 1,
              }}
            />
          )}
        </>
      )}

      {/* Floating "Locate Me" button — top-right corner */}
      {!position && (
        <div className="map-overlay-ui absolute top-2 right-2 z-[1001]">
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            title={t("locate_me")}
            className="flex items-center gap-1.5 px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg xs:rounded-xl bg-white/95 backdrop-blur-md border-2 border-slate-300 text-slate-700 hover:bg-white hover:text-blue-600 transition-colors text-[10px] xs:text-xs font-bold shadow-lg disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="w-3.5 h-3.5 xs:w-4 xs:h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
            )}
            <span className="hidden sm:inline">{t("locate_me")}</span>
          </button>
        </div>
      )}
    </>
  );
}
