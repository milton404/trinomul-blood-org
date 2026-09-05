"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";

// Load the map shell client-side only — Leaflet touches `window` at import.
const MapContainerWrapper = dynamic(
  () => import("./MapContainerWrapper"),
  { ssr: false },
) as typeof import("./MapContainerWrapper").default;

interface MiniMapProps {
  lat: number;
  lng: number;
  label?: string;
  /** Optional urgency level for color-coding the pin (matches request urgency). */
  urgencyLevel?: string;
  /** Optional blood group shown on the pin. */
  bloodGroup?: string;
  className?: string;
  /** Height of the map. Defaults to a compact 160px for card embedding. */
  height?: number;
}

// All mini-map pins use red to match the blood-request marker style on the
// Rangpur map.
const PIN_BG = "#dc2626"; // red-600

/**
 * A small, low-interaction map showing a single location. Used inside
 * RequestCard and EmergencySOS to give instant geographic context.
 *
 * Scroll-wheel zoom is disabled so the map doesn't hijack page scrolling.
 * Dragging is enabled so users can peek at adjacent streets. The map is
 * centered on the provided coordinates at zoom 14.
 */
export default function MiniMap({
  lat,
  lng,
  label,
  urgencyLevel,
  bloodGroup,
  className = "",
  height = 160,
}: MiniMapProps) {
  const t = useTranslations("map");

  const icon = useMemo(() => {
    const text = bloodGroup ?? "📍";
    const html = `
      <div style="
        display:flex;align-items:center;justify-content:center;
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${PIN_BG};color:#fff;font-weight:800;font-size:10px;
        box-shadow:0 4px 10px rgba(220,38,38,0.45);border:2px solid #fff;
      ">
        <span style="transform:rotate(45deg);">${text}</span>
      </div>`;
    return L.divIcon({
      html,
      className: "blood-request-pin",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -30],
    });
  }, [bloodGroup]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div
      className={`rounded-2xl overflow-hidden border border-slate-200 ${className}`}
      style={{ height }}
    >
      <MapContainerWrapper
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        dragging
        className="h-full w-full border-0 rounded-none"
        restrictToRangpur={false}
        showLayerToggle={false}
        showBoundary={false}
      >
        <Marker position={[lat, lng]} icon={icon}>
          {label && (
            <Popup className="custom-popup">
              <div className="text-xs">
                <p className="font-bold text-slate-900">{label}</p>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-blue-600 font-bold hover:underline"
                >
                  {t("get_directions")} →
                </a>
              </div>
            </Popup>
          )}
        </Marker>
      </MapContainerWrapper>
    </div>
  );
}
