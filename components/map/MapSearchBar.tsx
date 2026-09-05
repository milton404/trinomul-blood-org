"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { forwardGeocode, ForwardGeocodeResult } from "@/lib/forward-geocode";
import { parseBloodGroupQuery, BloodGroup } from "@/lib/blood-group-parser";

/** Blood group display colors */
const BLOOD_GROUP_COLORS: Record<BloodGroup, string> = {
  "A+": "bg-red-50 text-red-700 border-red-300",
  "A-": "bg-red-50 text-red-700 border-red-300",
  "B+": "bg-amber-50 text-amber-700 border-amber-300",
  "B-": "bg-amber-50 text-amber-700 border-amber-300",
  "AB+": "bg-purple-50 text-purple-700 border-purple-300",
  "AB-": "bg-purple-50 text-purple-700 border-purple-300",
  "O+": "bg-blue-50 text-blue-700 border-blue-300",
  "O-": "bg-blue-50 text-blue-700 border-blue-300",
};

interface MapSearchBarProps {
  /** Called when a location is selected from the dropdown */
  onLocationSelect?: (result: ForwardGeocodeResult) => void;
  /** Called when a blood group is detected in the search — the parent should filter map donors */
  onBloodGroupDetected?: (bloodGroup: BloodGroup | null) => void;
}

/**
 * Floating search bar positioned at the top of the map.
 * Supports:
 *  - Real-time forward geocoding via Nominatim (type → see suggestions)
 *  - Blood group detection (e.g. "A+ near Rangpur Medical") → filters donors
 *  - AI-powered correction for misspelled queries
 *  - Clicking a result → map pans to that location + temporary marker
 */
export default function MapSearchBar({ onLocationSelect, onBloodGroupDetected }: MapSearchBarProps) {
  const map = useMap();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ForwardGeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiCorrecting, setAiCorrecting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [detectedBloodGroup, setDetectedBloodGroup] = useState<BloodGroup | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Search as user types (debounced 350ms)
  const doSearch = useCallback(
    async (rawQuery: string) => {
      // Parse blood group from the query — geocode the location part only
      const parsed = parseBloodGroupQuery(rawQuery);
      setDetectedBloodGroup(parsed.bloodGroup);

      const searchText = parsed.locationQuery.trim();
      if (searchText.length < 2) {
        setResults([]);
        setShowDropdown(false);
        setError(null);
        return;
      }

      // Cancel previous pending request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setAiCorrecting(false);
      setError(null);

      try {
        const found = await forwardGeocode(searchText, controller.signal);

        if (controller.signal.aborted) return;

        if (found.length === 0) {
          setAiCorrecting(true);
          const retryController = new AbortController();
          abortRef.current = retryController;

          setResults([]);
          setShowDropdown(true);
          setError("No locations found — try a different spelling");
          setAiCorrecting(false);
        } else {
          setResults(found);
          setShowDropdown(true);
          setSelectedIdx(-1);
          setError(null);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Search unavailable — please try again");
        }
      } finally {
        if (!controller.signal?.aborted) {
          setLoading(false);
          setAiCorrecting(false);
        }
      }
    },
    [],
  );

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 350);
  };

  const handleSelect = (result: ForwardGeocodeResult) => {
    setQuery(result.displayName);
    setShowDropdown(false);
    setResults([]);
    setError(null);
    // Keep blood group badge visible
    // setDetectedBloodGroup is kept

    // Pan map to location
    map.flyTo([result.lat, result.lng], 14, { duration: 1 });

    // Remove previous temp marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Build a popup label that includes the blood group if detected
    const popupTitle = detectedBloodGroup
      ? `<span style="display:inline-block;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;margin-right:4px;vertical-align:middle;background:#fee2e2;color:#dc2626">${detectedBloodGroup}</span> ${result.displayName}`
      : result.displayName;

    // Add a temporary pulsating marker
    const icon = L.divIcon({
      className: "",
      html: `<div style="
        width:20px;height:20px;background:#2563eb;border:3px solid white;
        border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,0.3),0 0 0 8px rgba(37,99,235,0.15),0 2px 6px rgba(0,0,0,0.3);
        animation:search-pulse 1.5s ease-out infinite;
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    markerRef.current = L.marker([result.lat, result.lng], { icon })
      .addTo(map)
      .bindPopup(
        `<div style="font-size:13px;font-weight:600">${popupTitle}</div>` +
          `<div style="font-size:11px;color:#64748b;margin-top:2px">${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}</div>`,
      )
      .openPopup();

    onLocationSelect?.(result);

    // Notify parent about blood group so the map can filter donors
    if (detectedBloodGroup) {
      onBloodGroupDetected?.(detectedBloodGroup);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setError(null);
    setDetectedBloodGroup(null);
    onBloodGroupDetected?.(null);
    inputRef.current?.focus();
  };

  const bgColorClass = detectedBloodGroup ? BLOOD_GROUP_COLORS[detectedBloodGroup] : "";

  return (
    <div
      ref={containerRef}
      className="map-overlay-ui absolute top-14 sm:top-2 left-1/2 -translate-x-1/2 z-[200] w-[340px] max-w-[calc(100%-24px)] sm:max-w-[calc(100%-100px)]"
    >
      {/* Search input */}
      <div className="relative group">
        {/* Animated gradient glow ring on focus */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 opacity-0 group-focus-within:opacity-60 blur-sm transition-opacity duration-300" />

        <div className={`relative flex items-center bg-white/95 backdrop-blur-md border-[2.5px] rounded-xl xs:rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ${
          detectedBloodGroup
            ? "border-red-400 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/20"
            : loading || aiCorrecting
              ? "border-violet-400 ring-4 ring-violet-500/20"
              : "border-blue-300/70 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20"
        }`}>
          {/* Search icon */}
          <div className={`pl-2 xs:pl-3.5 pr-1 transition-colors duration-300 ${
            loading || aiCorrecting
              ? "text-violet-500"
              : detectedBloodGroup
                ? "text-red-500"
                : "text-slate-400 group-focus-within:text-blue-500"
          }`}>
            {loading || aiCorrecting ? (
              <svg
                className="animate-spin w-4 h-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 group-focus-within:scale-110 transition-transform duration-300"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            )}
          </div>

          {/* Blood group badge */}
          {detectedBloodGroup && (
            <span
              className={`ml-1 px-1.5 py-0.5 rounded-full border text-[11px] font-bold leading-none ${bgColorClass}`}
            >
              {detectedBloodGroup}
            </span>
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0 || error) setShowDropdown(true);
            }}
            placeholder={detectedBloodGroup
              ? `Search ${detectedBloodGroup} donors...`
              : "Search location or blood group..."}
            className="flex-1 bg-transparent px-1.5 xs:px-2 py-1.5 xs:py-2.5 text-xs xs:text-sm text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
            autoComplete="off"
            spellCheck={false}
          />

          {/* AI sparkle icon — visible when AI is active */}
          {aiCorrecting && (
            <span className="ml-0.5 mr-1 flex-shrink-0" title="AI is correcting your search">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-purple-500 animate-pulse">
                <path d="M12 2l1.5 5.5L19 6l-3.5 4.5L19 15l-5.5-1.5L12 19l-1.5-5.5L5 15l3.5-4.5L5 6l5.5 1.5L12 2z" fill="currentColor" opacity="0.9"/>
                <path d="M12 2l1.5 5.5L19 6l-3.5 4.5L19 15l-5.5-1.5L12 19l-1.5-5.5L5 15l3.5-4.5L5 6l5.5 1.5L12 2z" stroke="currentColor" strokeWidth="0.5"/>
              </svg>
            </span>
          )}
          {aiCorrecting && (
            <span className="mr-2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 text-[10px] font-semibold animate-pulse border border-purple-300/50">
              AI
            </span>
          )}

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="pr-3 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (results.length > 0 || error || aiCorrecting) && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white/98 backdrop-blur-md border-2 border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-[dropdown-slide_0.2s_ease-out]">
            {error ? (
              <div className="px-4 py-4 text-sm text-slate-500 text-center flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                {error}
              </div>
            ) : (
              results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all duration-150 ${
                    i === selectedIdx
                      ? "bg-gradient-to-r from-blue-50 to-violet-50 border-l-4 border-l-blue-500"
                      : "hover:bg-slate-50 border-l-4 border-l-transparent"
                  } ${i > 0 ? "border-t border-slate-100" : ""}`}
                >
                  {/* Pin icon */}
                  <span className={`mt-0.5 flex-shrink-0 transition-colors ${i === selectedIdx ? "text-blue-500" : "text-slate-400"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm truncate font-medium transition-colors ${i === selectedIdx ? "text-blue-900" : "text-slate-800"}`}>
                      {r.displayName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                        {(r.type ?? "place").replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono">{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</span>
                    </div>
                  </div>
                  {i === selectedIdx && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 mt-1 flex-shrink-0">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Pulse animation injected into the document head once */}
      <PulseStyle />
    </div>
  );
}

/** Inject @keyframes for the search marker pulse and dropdown slide animations */
function PulseStyle() {
  useEffect(() => {
    if (document.getElementById("search-pulse-style")) return;
    const style = document.createElement("style");
    style.id = "search-pulse-style";
    style.textContent = `
      @keyframes search-pulse {
        0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
        70% { box-shadow: 0 0 0 16px rgba(37,99,235,0); }
        100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
      }
      @keyframes dropdown-slide {
        0% { opacity: 0; transform: translateY(-8px); }
        100% { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}
