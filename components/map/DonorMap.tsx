"use client";

import dynamic from "next/dynamic";
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
 * Composed map for the donors page. Groups donors by upazila centroid for
 * privacy-safe display (donors are never pinned to their real home address).
 */
export default function DonorMap({
  donors,
  height = 500,
  showLocate = true,
  onViewDonors,
}: DonorMapProps) {
  return (
    <div style={{ height }} className="w-full">
      <MapContainerWrapper
        className="h-full w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm"
        zoom={10}
      >
        {showLocate && <UserLocationMarker />}
        <DonorClusterGroup donors={donors} onViewDonors={onViewDonors} />
      </MapContainerWrapper>
    </div>
  );
}
