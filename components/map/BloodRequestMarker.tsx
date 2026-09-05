"use client";

import { useMemo, useRef } from "react";
import { Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useTranslations, useLocale } from "next-intl";
import { formatWhenNeededDynamic } from "@/lib/utils/when-needed";

export interface BloodRequestMarkerData {
  id?: number;
  lat: number;
  lng: number;
  patient_name: string;
  blood_group: string;
  hospital_name: string;
  district?: string;
  upazila?: string;
  urgency_level: string; // "critical" | "urgent" | "normal"
  units_needed: number;
  when_needed?: string;
  needed_date?: string | null;
  needed_time?: string | null;
  created_at?: string;
  contact_number?: string;
  phone?: string;
}

// Blood-request pins use red/orange to convey urgency — easy to spot on the map.
// Donor markers are green, so users can tell donors vs requesters at a glance.
const PIN_BG = "#dc2626"; // red-600

// Urgency → badge background (used only inside the popup, not the pin).
const URGENCY_BADGE_BG: Record<string, string> = {
  critical: "#dc2626", // red-600
  urgent: "#f59e0b", // amber-500
  normal: "#3b82f6", // blue-500
};

// ── Direct lookup for when_needed labels (avoids t() key issues) ──
const WHEN_NEEDED_LABELS: Record<string, { en: string; bn: string }> = {
  now: { en: "Now", bn: "এখনই" },
  today: { en: "Today", bn: "আজ" },
  tomorrow: { en: "Tomorrow", bn: "আগামীকাল" },
  day_after: { en: "Day After", bn: "পরশু" },
  specific_date: { en: "Specific Date", bn: "নির্দিষ্ট তারিখ" },
  within_week: { en: "Within Week", bn: "এক সপ্তাহের মধ্যে" },
};

function getWhenNeededLabel(raw: string, locale: string): string {
  const key = raw.replace(/^map\./, "").replace(/^form\./, "").replace(/^common\./, "");
  const entry = WHEN_NEEDED_LABELS[key];
  if (entry) return locale === "bn" ? entry.bn : entry.en;
  return key;
}

/**
 * A single blood-request pin. The pin is a red rounded pill showing the blood
 * group. The popup shows patient/hospital details, an urgency badge, and
 * Call + Get Directions actions.
 *
 * Must be rendered as a child of <MapContainerWrapper>.
 */
export default function BloodRequestMarker({
  request,
}: {
  request: BloodRequestMarkerData;
}) {
  const t = useTranslations("map");
  const locale = useLocale();
  const markerRef = useRef<L.Marker | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const icon = useMemo(() => {
    const html = `
      <div style="
        display:flex;align-items:center;justify-content:center;
        width:36px;height:36px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${PIN_BG};color:#fff;font-weight:800;font-size:11px;
        box-shadow:0 4px 10px rgba(220,38,38,0.45);border:2px solid #fff;
      ">
        <span style="transform:rotate(45deg);">${request.blood_group}</span>
      </div>`;
    return L.divIcon({
      html,
      className: "blood-request-pin",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [-4, -4],
    });
  }, [request.blood_group]);

  const phone = request.contact_number || request.phone;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${request.lat},${request.lng}`;
  const locationLabel = [request.upazila, request.district]
    .filter(Boolean)
    .join(", ");

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    markerRef.current?.openPopup();
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      markerRef.current?.closePopup();
    }, 2000);
  };

  const handlePopupMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handlePopupMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      markerRef.current?.closePopup();
    }, 2000);
  };

  return (
    <Marker
      position={[request.lat, request.lng]}
      icon={icon}
      ref={markerRef}
      eventHandlers={{
        mouseover: handleMouseEnter,
        mouseout: handleMouseLeave,
      }}
    >
      <Tooltip
        direction="top"
        offset={[0, -30]}
        opacity={1}
        permanent
        className="direction-tooltip"
      >
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-bold rounded-full text-white hover:opacity-90 transition-colors whitespace-nowrap"
          title="Navigate with Google Maps"
          style={{ pointerEvents: "auto", background: "#4285F4" }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
        </a>
      </Tooltip>
      <Popup className="custom-popup" autoPan={false}>
        <div
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
          className="text-[11px] sm:text-xs"
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-lg sm:text-xl font-black text-red-600">
              {request.blood_group}
            </span>
            <span
              className="px-1.5 py-px rounded-full text-[9px] font-bold uppercase tracking-wider text-white"
              style={{
                background:
                  URGENCY_BADGE_BG[request.urgency_level] ??
                  URGENCY_BADGE_BG.normal,
              }}
            >
              {request.urgency_level}
            </span>
          </div>
          <p className="font-bold text-slate-900 text-[11px] sm:text-xs leading-tight">
            {request.patient_name}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5">
            {request.hospital_name}
          </p>
          {locationLabel && (
            <p className="text-[10px] sm:text-[11px] text-slate-500">{locationLabel}</p>
          )}
          {phone && (
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 font-medium">
              📞 {phone}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-[11px] text-slate-700">
            <span className="font-semibold">
              {t("units_needed", { count: request.units_needed })}
            </span>
            {request.when_needed && (
              <span className="text-slate-400">• {formatWhenNeededDynamic(request.when_needed, request.created_at || "", request.needed_date, request.needed_time, locale)}</span>
            )}
          </div>
          <div className="flex gap-1.5 mt-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex-1 text-center text-[10px] sm:text-[11px] font-bold py-1.5 rounded-md bg-red-100 text-red-800 hover:bg-red-200 border border-red-200 transition-all"
              >
                📞 {t("call_now")}
              </a>
            )}
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-[10px] sm:text-[11px] font-bold py-1.5 rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200 transition-all"
            >
              🗺️ {t("get_directions")}
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
