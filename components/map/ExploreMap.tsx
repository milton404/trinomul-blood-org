"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import UserLocationMarker from "./UserLocationMarker";
import DonorClusterGroup, { DonorClusterData } from "./DonorClusterGroup";
import BloodRequestMarker, { BloodRequestMarkerData } from "./BloodRequestMarker";
import { DataFilter } from "./DataFilterToggle";
import { BloodGroup } from "@/lib/blood-group-parser";
import { isValidBangladeshCoordinatePair } from "@/lib/location-coordinates";

// SSR-safe load
const MapContainerWrapper = dynamic(
  () => import("./MapContainerWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-3xl bg-slate-100 animate-pulse" />
    ),
  },
) as typeof import("./MapContainerWrapper").default;

interface ExploreMapProps {
  donors: DonorClusterData[];
  requests: BloodRequestMarkerData[];
  height?: number;
  showLocate?: boolean;
  /** Current filter state (controlled by parent) — toggles between All | Donors | Requests */
  filter: DataFilter;
  /** Called when the user taps the filter toggle */
  onFilterChange?: (filter: DataFilter) => void;
  /** When set, filters donors to only show this blood group. Does NOT lock the toggle. */
  bloodGroupFilter?: BloodGroup | null;
  /** Called when a blood group is detected from the map search bar */
  onBloodGroupDetected?: (bloodGroup: BloodGroup | null) => void;
  /** Called when a donor upazila cluster is clicked */
  onViewDonors?: (upazila: string) => void;
}

/**
 * Unified explore map for the home page — shows both donors (clustered by
 * upazila) and blood requests (exact pins) on the same map, with a search bar
 * and a data filter toggle to switch between them.
 *
 * When a blood group is detected from the search bar (e.g. "A+ Rangpur"):
 *   - The parent auto-sets the toggle to "Donors" as a helpful default
 *   - Only donors matching that blood group are shown
 *   - The user can still freely toggle to "All" or "Requests" — the blood
 *     group filter only restricts donors, it does not lock the toggle
 */
export default function ExploreMap({
  donors,
  requests,
  height = 450,
  showLocate = true,
  filter,
  onFilterChange,
  bloodGroupFilter,
  onBloodGroupDetected,
  onViewDonors,
}: ExploreMapProps) {
  // Filter donors by blood group when one is active.
  // If no blood group filter, show all donors.
  const filteredDonors = useMemo(() => {
    if (!bloodGroupFilter) return donors;
    return donors.filter(
      (d) => d.blood_group?.toUpperCase() === bloodGroupFilter,
    );
  }, [donors, bloodGroupFilter]);

  // The toggle controls visibility freely — bloodGroupFilter only restricts
  // which donors appear, it does NOT override the toggle value.
  const showDonors = filter === "all" || filter === "donors";
  const showRequests = filter === "all" || filter === "requests";

  return (
    <div style={{ height }} className="w-full">
      <MapContainerWrapper
        className="h-full w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm"
        zoom={10}
        showSearchBar
        showDataFilter
        showLayerToggle
        dataFilter={filter}
        onDataFilterChange={onFilterChange}
        onBloodGroupDetected={onBloodGroupDetected}
        activeBloodGroup={bloodGroupFilter}
      >
        {showLocate && <UserLocationMarker />}

        {showDonors && (
          <DonorClusterGroup donors={filteredDonors} onViewDonors={onViewDonors} />
        )}

        {showRequests &&
          requests
            .filter((r) => isValidBangladeshCoordinatePair(r.lat, r.lng))
            .map((r, i) => (
              <BloodRequestMarker key={r.id ?? i} request={r} />
            ))}
      </MapContainerWrapper>
    </div>
  );
}
