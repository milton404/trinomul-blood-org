"use client";

import MapContainerWrapper from "./MapContainerWrapper";
import BloodRequestMarker, {
  BloodRequestMarkerData,
} from "./BloodRequestMarker";
import UserLocationMarker from "./UserLocationMarker";
import { useTranslations } from "next-intl";
import { isValidBangladeshCoordinatePair } from "@/lib/location-coordinates";

interface ActiveRequestsMapProps {
  requests: BloodRequestMarkerData[];
  height?: number;
  showLocate?: boolean;
}

/**
 * Composed map showing active blood requests as color-coded pins. Designed to
 * be loaded via `next/dynamic({ ssr: false })` from server/client pages so the
 * Leaflet import stays out of the SSR bundle.
 */
export default function ActiveRequestsMap({
  requests,
  height = 450,
  showLocate = true,
}: ActiveRequestsMapProps) {
  const t = useTranslations("map");

  return (
    <div style={{ height }} className="w-full">
      <MapContainerWrapper
        className="h-full w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm"
        zoom={10}
      >
        {showLocate && <UserLocationMarker />}
        {requests
          .filter((r) => isValidBangladeshCoordinatePair(r.lat, r.lng))
          .map((request, i) => (
            <BloodRequestMarker key={request.id ?? i} request={request} />
          ))}
      </MapContainerWrapper>
      {requests.length === 0 && (
        <p className="text-center text-sm text-slate-500 mt-4">
          {t("no_active_requests")}
        </p>
      )}
    </div>
  );
}
