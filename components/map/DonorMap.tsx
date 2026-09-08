"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import UserLocationMarker from "./UserLocationMarker";
import DonorClusterGroup, {
  DonorClusterData,
} from "./DonorClusterGroup";

// SSR-safe load — Leaflet touches `window` at import.
const MapContainerWrapper = dynamic(
  () => import("./MapContainerWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-3xl bg-slate-100 animate-pulse" />
    ),
  },
) as typeof import("./MapContainerWrapper").default;

interface DonorMapProps {
  donors: DonorClusterData[];
  /** Map height in px. */
  height?: number;
  /** Show the "Locate Me" button + pulsing dot. */
  showLocate?: boolean;
  /**
   * Called when the user clicks "View these donors" inside a cluster popup.
   * Host page typically sets the upazila filter and switches to list view.
   */
  onViewDonors?: (upazila: string) => void;
}

/**
 * Fits the map view to show all donor markers when they are present,
 * so users can actually see where donors are instead of a zoomed-out
 * division-wide view where all markers look like they're at the center.
 */
function FitToDonors({ donors }: { donors: DonorClusterData[] }) {
  const map = useMap();
  useEffect(() => {
    if (donors.length === 0) return;
    const valid = donors.filter(
      (d) =>
        typeof d.lat === "number" &&
        typeof d.lng === "number" &&
        Number.isFinite(d.lat) &&
        Number.isFinite(d.lng),
    );
    if (valid.length === 0) return;
    const lats = valid.map((d) => d.lat as number);
    const lngs = valid.map((d) => d.lng as number);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    // Add padding so markers aren't at the very edge.
    const padLat = Math.max((maxLat - minLat) * 0.3, 0.02);
    const padLng = Math.max((maxLng - minLng) * 0.3, 0.02);
    const timer = setTimeout(() => {
      map.fitBounds(
        [
          [minLat - padLat, minLng - padLng],
          [maxLat + padLat, maxLng + padLng],
        ],
        { padding: [60, 60], maxZoom: 13, animate: true },
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [donors, map]);
  return null;
}

/**
 * Composed map for the donors page. Groups donors by upazila centroid for
 * privacy-safe display (donors are never pinned to their real home address).
 */
export default function DonorMap({
  donors,
  height = 500,
  showLocate = true,
  onViewDonors,
}: DonorMapProps) {
  const hasDonors = donors.length > 0;

  return (
    <div style={{ height }} className="w-full">
      <MapContainerWrapper
        className="h-full w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm"
        zoom={10}
        // When donors are present, let FitToDonors handle the view;
        // otherwise fit to the Rangpur division boundary.
        fitToBounds={!hasDonors}
      >
        {showLocate && <UserLocationMarker />}
        <DonorClusterGroup donors={donors} onViewDonors={onViewDonors} />
        {hasDonors && <FitToDonors donors={donors} />}
      </MapContainerWrapper>
    </div>
  );
}
