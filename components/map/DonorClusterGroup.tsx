"use client";

import { useMemo, useRef, useCallback } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";

export interface DonorClusterData {
  /** Donor display name (English or Bengali). */
  full_name_en?: string;
  full_name_bn?: string;
  blood_group?: string;
  upazila?: string;
  district?: string;
  lat?: number;
  lng?: number;
  is_eligible?: boolean;
}

interface DonorClusterGroupProps {
  donors: DonorClusterData[];
  /**
   * Called when the user clicks "View these donors" inside a cluster popup.
   * The host page typically sets the upazila filter and switches to list view.
   */
  onViewDonors?: (upazila: string) => void;
}

interface Cluster {
  key: string; // upazila name (English) or "unknown"
  upazilaLabel: string; // display label (localized)
  districtLabel: string; // display label for district
  lat: number;
  lng: number;
  count: number;
  eligibleCount: number;
  bloodGroups: Record<string, number>;
}

/**
 * Privacy-safe donor clusters. Donors are grouped by upazila (since all donors
 * in the same upazila share the centroid from `rangpur.ts`). One cluster pin
 * is rendered per upazila, showing the donor count. The popup lists the
 * blood-group breakdown and a "View these donors" link.
 *
 * Must be rendered as a child of <MapContainerWrapper>.
 */
export default function DonorClusterGroup({
  donors,
  onViewDonors,
}: DonorClusterGroupProps) {
  const t = useTranslations("map");
  const locale = useLocale();

  // ── Hover logic — same pattern as BloodRequestMarker ─────────────
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const hoverTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const handleMouseEnter = useCallback((clusterKey: string) => {
    const closeTimer = hoverTimers.current.get(clusterKey);
    if (closeTimer) {
      clearTimeout(closeTimer);
      hoverTimers.current.delete(clusterKey);
    }
    const marker = markerRefs.current.get(clusterKey);
    marker?.openPopup();
  }, []);

  const handleMouseLeave = useCallback((clusterKey: string) => {
    const timer = setTimeout(() => {
      const marker = markerRefs.current.get(clusterKey);
      marker?.closePopup();
      hoverTimers.current.delete(clusterKey);
    }, 800);
    hoverTimers.current.set(clusterKey, timer);
  }, []);

  const clusters = useMemo<Cluster[]>(() => {
    const map = new Map<string, Cluster>();
    for (const d of donors) {
      const key = (d.upazila || "unknown").toLowerCase();
      let cluster = map.get(key);
      if (!cluster) {
        cluster = {
          key,
          upazilaLabel: d.upazila || (locale === "bn" ? "অজানা" : "Unknown"),
          districtLabel: d.district || "",
          lat: d.lat ?? 25.7439,
          lng: d.lng ?? 89.2752,
          count: 0,
          eligibleCount: 0,
          bloodGroups: {},
        };
        map.set(key, cluster);
      }
      cluster.count += 1;
      if (d.is_eligible) cluster.eligibleCount += 1;
      if (d.blood_group) {
        cluster.bloodGroups[d.blood_group] =
          (cluster.bloodGroups[d.blood_group] ?? 0) + 1;
      }
    }
    return Array.from(map.values());
  }, [donors, locale]);

  return (
    <>
      {clusters.map((cluster) => {
        const icon = L.divIcon({
          html: `
            <div style="
              display:flex;flex-direction:column;align-items:center;justify-content:center;
              width:44px;height:44px;border-radius:50%;
              background:#16a34a;color:#fff;font-weight:800;font-size:13px;
              box-shadow:0 4px 14px rgba(22,163,74,0.45);border:3px solid #fff;
              position:relative;
            ">
              <svg style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);" width="18" height="14" viewBox="0 0 24 20" fill="none">
                <path d="M12 19.5C12 19.5 2 13 2 7C2 3.5 5 0.5 8.5 0.5C10.5 0.5 12.3 1.5 13.5 3C14.7 1.5 16.5 0.5 18.5 0.5C22 0.5 25 3.5 25 7C25 13 15 19.5 12 19.5Z" fill="#ef4444" stroke="#fff" strokeWidth="2"/>
              </svg>
              ${cluster.count}
            </div>`,
          className: "donor-cluster-pin",
          iconSize: [44, 44],
          iconAnchor: [20, 20],
          popupAnchor: [-6, -4],
        });

        const sortedGroups = Object.entries(cluster.bloodGroups).sort(
          (a, b) => b[1] - a[1],
        );

        return (
          <Marker
            key={cluster.key}
            position={[cluster.lat, cluster.lng]}
            icon={icon}
            ref={(m) => {
              if (m) markerRefs.current.set(cluster.key, m);
              else markerRefs.current.delete(cluster.key);
            }}
            eventHandlers={{
              mouseover: () => handleMouseEnter(cluster.key),
              mouseout: () => handleMouseLeave(cluster.key),
            }}
          >
            <Popup
              className="custom-popup"
              autoPan={false}
              eventHandlers={{
                mouseover: () => handleMouseEnter(cluster.key),
                mouseout: () => handleMouseLeave(cluster.key),
              }}
            >
              <div className="text-[11px] sm:text-xs">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-base sm:text-lg">📍</span>
                  <span className="font-bold text-slate-900 text-[11px] sm:text-xs">
                    {cluster.upazilaLabel}
                  </span>
                </div>

                {cluster.districtLabel && (
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                    <span>🏛️</span>
                    <span>{cluster.districtLabel}</span>
                  </p>
                )}

                <p className="text-[10px] sm:text-[11px] text-slate-700 mb-1.5">
                  {t("donors_in_area", { count: cluster.count })}
                  {cluster.eligibleCount > 0 && (
                    <span className="ml-1 text-green-600 font-semibold">
                      ({locale === "bn" ? "যোগ্য:" : "eligible:"}{" "}
                      {cluster.eligibleCount})
                    </span>
                  )}
                </p>

                {sortedGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {sortedGroups.map(([group, count]) => (
                      <span
                        key={group}
                        className="px-1.5 py-px rounded-full bg-green-50 text-green-700 text-[9px] font-bold"
                      >
                        {group}: {count}
                      </span>
                    ))}
                  </div>
                )}

                {onViewDonors ? (
                  <button
                    onClick={() => onViewDonors(cluster.upazilaLabel)}
                    className="w-full text-center text-[10px] sm:text-[11px] font-bold py-1.5 rounded-md bg-green-100 text-green-800 hover:bg-green-200 border border-green-200 transition-all"
                  >
                    👥 {t("view_donors")}
                  </button>
                ) : (
                  <Link
                    href={`/${locale}/donors?upazila=${encodeURIComponent(
                      cluster.key,
                    )}`}
                    className="block text-center text-[10px] sm:text-[11px] font-bold py-1.5 rounded-md bg-green-100 text-green-800 hover:bg-green-200 border border-green-200 transition-all"
                  >
                    👥 {t("view_donors")}
                  </Link>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
