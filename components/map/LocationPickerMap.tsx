"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation, X, Loader2 } from "lucide-react";

// Rangpur city center
const RANGPUR_CENTER: [number, number] = [25.7439, 89.2752];

// SSR-safe MapContainer load — Leaflet needs `window`.
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);

// Custom marker icon for the picker — a red pin with pulse ring
const pickerIcon = L.divIcon({
  html: `
    <div style="position:relative;width:36px;height:36px;">
      <div style="
        position:absolute;top:0;left:0;width:36px;height:36px;
        border-radius:50%;background:#dc2626;opacity:0.25;
        animation:pulse-ring 1.8s ease-out infinite;
      "></div>
      <div style="
        position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:20px;height:20px;border-radius:50%;background:#dc2626;
        border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      "></div>
    </div>
    <style>
      @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 0.4; }
        100% { transform: scale(2.2); opacity: 0; }
      }
    </style>
  `,
  className: "location-picker-pin",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

/**
 * Internal component that handles click-to-place on the map.
 * Must be a child of MapContainer to use useMapEvents.
 */
function ClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Internal component that recenters the map when the target lat/lng
 * changes from outside (e.g. user picks a search result). Must be a
 * child of MapContainer to use `useMap`.
 */
function FlyToController({
  lat,
  lng,
  trigger,
}: {
  lat: number | null;
  lng: number | null;
  trigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (trigger === 0) return;
    if (lat == null || lng == null) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [trigger, lat, lng, map]);
  return null;
}

/**
 * Internal component that handles marker drag.
 */
function DraggablePin({
  lat,
  lng,
  locationName,
  onDragEnd,
  onRemove,
}: {
  lat: number;
  lng: number;
  locationName?: string | null;
  onDragEnd: (lat: number, lng: number) => void;
  onRemove: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useCallback(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const pos = marker.getLatLng();
          onDragEnd(pos.lat, pos.lng);
        }
      },
    }),
    [onDragEnd],
  );

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      icon={pickerIcon}
      draggable
      eventHandlers={eventHandlers()}
    >
      <Popup>
        <div className="min-w-[140px]">
          {locationName ? (
            <>
              <p className="text-xs font-semibold text-slate-800 mb-1">
                {locationName}
              </p>
              <p className="text-[10px] text-slate-500 mb-2">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-slate-800 mb-1">
                Your Location
              </p>
              <p className="text-[10px] text-slate-500 mb-2">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <X className="w-3 h-3" />
            Remove Pin
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

export interface LocationPickerMapProps {
  /** Called when the user selects a location. */
  onLocationChange?: (lat: number, lng: number) => void;
  /** Initial lat/lng (e.g., if editing an existing profile). */
  initialLat?: number | null;
  /** Initial lng. */
  initialLng?: number | null;
  /**
   * External location updates — when these change the pin moves and the
   * map recenters. Used by the search bar to drop a pin on a picked result.
   * Pass a fresh value to `flyTrigger` to force the flyTo even if lat/lng
   * happen to be identical to the previous value.
   */
  flyTrigger?: number;
  /** Map height in px. */
  height?: number;
  /** Label text above the map. */
  label?: string;
  /** Hint text below the map. */
  hint?: string;
  /** Show the "Use My Location" button (default: true). */
  showLocateButton?: boolean;
  /**
   * Show location info badge (default: true).
   * Shows human-readable locationName if provided, otherwise short coordinates.
   */
  showCoordinates?: boolean;
  /**
   * Optional human-readable location name to display instead of raw coordinates.
   * If provided, this is shown in the top badge and popup. If omitted and
   * lat/lng are set, short coordinates are shown as fallback.
   */
  locationName?: string | null;
  /**
   * External GPS handler — if provided, the "Use My Location" button calls
   * this instead of running its own geolocation. Lets the parent show a
   * loading state, retries, error toasts, etc.
   */
  onUseMyLocation?: () => void;
  /** Show a spinner on the "Use My Location" button (external loading). */
  locating?: boolean;
}

/**
 * A compact map for users to pick their location. Renders a clickable map
 * centered on Rangpur. Click to place a pin, drag to fine-tune, or use the
 * "Use My Location" button.
 *
 * The badge at the top now prefers a human-readable `locationName` (passed in
 * by the parent, typically from reverse-geocoding) over raw lat/long coords.
 * Coordinates are only used as a quiet fallback if the reverse lookups fail
 * or haven't returned yet — the user never sees a bare coords `div` when
 * location names are available.
 *
 * Must be loaded via `dynamic(() => import(...), { ssr: false })` in the
 * parent form since Leaflet requires browser APIs.
 */
export default function LocationPickerMap({
  onLocationChange,
  initialLat,
  initialLng,
  flyTrigger = 0,
  height = 280,
  label,
  hint,
  showLocateButton = true,
  showCoordinates = true,
  locationName = null,
  onUseMyLocation,
  locating = false,
}: LocationPickerMapProps) {
  const [pickedLat, setPickedLat] = useState<number | null>(
    initialLat ?? null,
  );
  const [pickedLng, setPickedLng] = useState<number | null>(
    initialLng ?? null,
  );

  // Sync external lat/lng changes (e.g. from the search bar picker) into
  // the internal pin state. Without this, changing initialLat/initialLng
  // after mount has no effect on the pin position. We skip the very first
  // render so we don't echo the initial position back to the parent and
  // trigger a duplicate reverse-geocode.
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    if (initialLat == null || initialLng == null) return;
    setPickedLat(initialLat);
    setPickedLng(initialLng);
    onLocationChange?.(initialLat, initialLng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLat, initialLng, flyTrigger]);

  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
      setPickedLat(lat);
      setPickedLng(lng);
      onLocationChange?.(lat, lng);
    },
    [onLocationChange],
  );

  const handleRemove = useCallback(() => {
    setPickedLat(null);
    setPickedLng(null);
    onLocationChange?.(0, 0);
  }, [onLocationChange]);

  const handleUseMyLocation = useCallback(() => {
    // If the parent provides an external GPS handler, defer to it so the
    // parent can show loading state, retries, and error toasts.
    if (onUseMyLocation) {
      onUseMyLocation();
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // Silently fail — user can still click the map
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [handleLocationSelect, onUseMyLocation]);

  // Decide what text goes in the top badge. Priority:
  //   1. locationName prop (human-readable name from reverse-geocode)
  //   2. short coords fallback
  const showBadge = showCoordinates && pickedLat != null && pickedLng != null;
  const badgeText = locationName
    ? locationName
    : pickedLat != null && pickedLng != null
      ? `${pickedLat.toFixed(5)}, ${pickedLng.toFixed(5)}`
      : "";

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <MapContainer
          center={RANGPUR_CENTER}
          zoom={10}
          scrollWheelZoom={false}
          style={{ height, width: "100%" }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
          />
          <ClickHandler onLocationSelect={handleLocationSelect} />
          <FlyToController
            lat={pickedLat}
            lng={pickedLng}
            trigger={flyTrigger}
          />
          {pickedLat != null && pickedLng != null && (
            <DraggablePin
              lat={pickedLat}
              lng={pickedLng}
              locationName={locationName}
              onDragEnd={handleLocationSelect}
              onRemove={handleRemove}
            />
          )}
        </MapContainer>

        {/* "Use My Location" footer bar — kept inside the map per request */}
        {showLocateButton && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000]">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 text-xs font-medium text-slate-700 shadow-md hover:bg-white transition-all disabled:opacity-70 disabled:cursor-wait"
            >
              {locating ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
              )}
              Use My Location
            </button>
          </div>
        )}

        {/* Picked location display — shows human-readable name when available */}
        {showBadge && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] max-w-[92%]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm border border-red-200 shadow-md">
              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
              <span
                className={`text-[10px] ${
                  locationName
                    ? "font-medium text-slate-700"
                    : "font-mono text-red-700"
                } truncate`}
                title={badgeText}
              >
                {badgeText}
              </span>
            </div>
          </div>
        )}
      </div>

      {hint && (
        <p className="text-[10px] sm:text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}
