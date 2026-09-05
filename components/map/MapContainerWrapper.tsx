"use client";

import { ReactNode, useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import OfflineMapBanner from "./OfflineMapBanner";
import LayerToggle, { MapLayerType } from "./LayerToggle";
import MapSearchBar from "./MapSearchBar";
import DataFilterToggle, { DataFilter } from "./DataFilterToggle";
import RangpurBoundary from "./RangpurBoundary";
import { ForwardGeocodeResult } from "@/lib/forward-geocode";
import { BloodGroup } from "@/lib/blood-group-parser";

// Rangpur city center — default map focus point.
const RANGPUR_CENTER: [number, number] = [25.7439, 89.2752];

// Rangpur division bounding box — sourced from OSM Overpass API (relation 3921211).
const RANGPUR_BOUNDS: L.LatLngBoundsExpression = [
  [25.03, 88.08], // SW corner
  [26.64, 89.89], // NE corner
];

// Fix Leaflet's default marker icon paths under Next.js/Turbopack.
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl: iconShadowUrl,
});

interface MapContainerWrapperProps {
  center?: [number, number];
  zoom?: number;
  bounds?: L.LatLngBoundsExpression;
  className?: string;
  children?: ReactNode;
  /** When true, constrain the map to the Rangpur division bounds. */
  restrictToRangpur?: boolean;
  /** Disable scroll-wheel zoom (useful for mini-maps embedded in cards). */
  scrollWheelZoom?: boolean;
  /** Disable dragging (useful for static mini-maps). */
  dragging?: boolean;
  /** Show the street/satellite layer toggle (default: true). */
  showLayerToggle?: boolean;
  /** Show the Rangpur division boundary polygon (default: true). */
  showBoundary?: boolean;
  /** Auto-fit the view to show the full boundary on load (default: true when showBoundary is true). */
  fitToBounds?: boolean;
  /** Show the location search bar at the top of the map (default: false). */
  showSearchBar?: boolean;
  /** Show the donors/requests filter toggle (default: false). */
  showDataFilter?: boolean;
  /** Current data filter value for controlled usage. */
  dataFilter?: DataFilter;
  /** Called when the data filter toggle changes. */
  onDataFilterChange?: (filter: DataFilter) => void;
  /** Called when a location is selected from the search bar. */
  onSearchLocation?: (result: ForwardGeocodeResult) => void;
  /** Called when a blood group is detected from the search bar (e.g. "A+ Rangpur"). */
  onBloodGroupDetected?: (bloodGroup: BloodGroup | null) => void;
  /** Active blood group to show as a badge on the data filter toggle. */
  activeBloodGroup?: BloodGroup | null;
}

/**
 * Internal helper that recenters the map when the `center` prop changes.
 */
function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

/**
 * Internal helper that fits the map to the Rangpur division bounds on mount
 * so users see the full boundary outline when the map first loads.
 */
function FitBoundsOnLoad({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9, animate: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [map, bounds]);
  return null;
}

/**
 * Toggles the `leaflet-popup-open` class on the map container while any popup
 * card is open. Overlay buttons (.map-overlay-ui) live outside the popup's
 * stacking context (Leaflet applies a transform to .leaflet-map-pane), so a
 * popup can never z-index above them — instead we fade the buttons out so the
 * open card is always fully visible and clickable.
 */
function PopupOverlayManager() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const onOpen = () => container.classList.add("leaflet-popup-open");
    const onClose = () => container.classList.remove("leaflet-popup-open");
    map.on("popupopen", onOpen);
    map.on("popupclose", onClose);
    return () => {
      map.off("popupopen", onOpen);
      map.off("popupclose", onClose);
      container.classList.remove("leaflet-popup-open");
    };
  }, [map]);
  return null;
}

/**
 * SSR-safe Leaflet map shell. Renders an OpenStreetMap-tiled map centered on
 * Rangpur division. This component must be loaded via `next/dynamic` with
 * `ssr: false` from pages, or rendered inside another client component that
 * is itself dynamically loaded.
 *
 * Supports an optional search bar, data filter toggle, and layer toggle —
 * all rendered as positioned overlays outside the Leaflet control system.
 */
export default function MapContainerWrapper({
  center = RANGPUR_CENTER,
  zoom = 10,
  bounds = RANGPUR_BOUNDS,
  className = "h-[400px] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm",
  children,
  restrictToRangpur = true,
  scrollWheelZoom = true,
  dragging = true,
  showLayerToggle = true,
  showBoundary = true,
  fitToBounds,
  showSearchBar = false,
  showDataFilter = false,
  dataFilter: controlledFilter,
  onDataFilterChange,
  onSearchLocation,
  onBloodGroupDetected,
  activeBloodGroup,
}: MapContainerWrapperProps) {
  const [layer, setLayer] = useState<MapLayerType>("street");
  const [localFilter, setLocalFilter] = useState<DataFilter>("all");
  const shouldFitBounds = fitToBounds ?? showBoundary;

  const dataFilter = controlledFilter ?? localFilter;
  const handleFilterChange = useCallback(
    (f: DataFilter) => {
      setLocalFilter(f);
      onDataFilterChange?.(f);
    },
    [onDataFilterChange],
  );

  const mapOptions: Record<string, unknown> = useMemo(() => {
    const opts: Record<string, unknown> = {
      center,
      zoom,
      scrollWheelZoom,
      dragging,
      className,
      zoomControl: false, // we render <ZoomControl> explicitly below
    };
    if (restrictToRangpur) {
      opts.maxBounds = bounds;
      opts.maxBoundsViscosity = 1.0;
      opts.minZoom = 8;
    }
    return opts;
  }, [center, zoom, scrollWheelZoom, dragging, className, restrictToRangpur, bounds]);

  return (
    <div className="relative h-full w-full">
      {/* Ensure Leaflet popups render ABOVE external overlay buttons.
          map-pane must NOT create a stacking context (z-index: auto) so the
          popup pane can escape it and float above the overlay buttons. */}
      <style>{`
        .leaflet-container { z-index: 0 !important; }
        /* map-pane must NOT create a stacking context — popup needs to escape it */
        .leaflet-map-pane { z-index: auto !important; }
        /* Push content panes below overlay buttons (search=200, filter=300, layer=400) */
        .leaflet-tile-pane,
        .leaflet-overlay-pane,
        .leaflet-shadow-pane,
        .leaflet-marker-pane { z-index: 0 !important; }
        /* Popup pane floats above all overlay buttons */
        .leaflet-popup-pane { z-index: 1000 !important; }
        .leaflet-bottom.leaflet-left { bottom: 16px !important; left: 16px !important; z-index: 400 !important; }
        .leaflet-control-zoom { border: 2px solid #cbd5e1 !important; border-radius: 12px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important; overflow: visible !important; }
        .leaflet-control-zoom a { background: rgba(255,255,255,0.95) !important; color: #334155 !important; font-size: 18px !important; font-weight: 700 !important; width: 36px !important; height: 36px !important; line-height: 36px !important; border-bottom: 1px solid #e2e8f0 !important; }
        .leaflet-control-zoom a:last-child { border-bottom: none !important; }
        .leaflet-control-zoom a:hover { background: #f8fafc !important; color: #0f172a !important; }
        .leaflet-control-attribution { display: none !important; }

        /* Overlay buttons live OUTSIDE the popup's stacking context (map-pane has
           a transform), so popups can never z-index above them. Instead, fade the
           buttons out while a popup/card is open so the card is fully visible. */
        .map-overlay-ui { transition: opacity 0.2s ease; }
        .leaflet-popup-open .map-overlay-ui { opacity: 0 !important; pointer-events: none !important; }

        /* Popup card sizing lives in globals.css (.custom-popup) — phone: fluid
           min(232px, 100vw-72px), PC: 276px. Kept here: zoom control position. */
        @media (max-width: 639px) {
          .leaflet-bottom.leaflet-left { bottom: 16px !important; left: 16px !important; }
        }
      `}</style>
      <MapContainer {...mapOptions}>
        {layer === "street" ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
        ) : (
          <>
            {/* Esri World Imagery — free satellite tiles */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri, Maxar, Earthstar Geographics & the GIS User Community"
              maxZoom={19}
            />
            {/* Reference labels overlay */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution=""
              maxZoom={19}
              opacity={0.9}
            />
          </>
        )}
        {shouldFitBounds ? (
          <FitBoundsOnLoad bounds={bounds} />
        ) : (
          <Recenter center={center} />
        )}
        {showBoundary && <RangpurBoundary />}

        {/* Hides overlay buttons while a popup card is open */}
        <PopupOverlayManager />

        {/* Explicit zoom controls — positioned bottom-left */}
        <ZoomControl position="bottomleft" />

        {/* Search bar — inside map so it can use useMap() hook */}
        {showSearchBar && (
          <MapSearchBar
            onLocationSelect={onSearchLocation}
            onBloodGroupDetected={onBloodGroupDetected}
          />
        )}

        {children}

        {/* Layer toggle — inside map so popup z-index properly beats it */}
        {showLayerToggle && <LayerToggle value={layer} onChange={setLayer} />}

        {/* Data filter toggle — inside map so popup z-index properly beats it */}
        {showDataFilter && (
          <DataFilterToggle
            value={dataFilter}
            onChange={handleFilterChange}
            activeBloodGroup={activeBloodGroup}
          />
        )}
      </MapContainer>

      <OfflineMapBanner />
    </div>
  );
}
