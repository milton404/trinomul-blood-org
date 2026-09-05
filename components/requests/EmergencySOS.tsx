'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  MapPin,
  Clock,
  Phone,
  X,
  CheckCircle,
  Loader2,
  Volume2,
  Navigation,
  Crosshair,
  Search,
  AlertCircle,
  Sparkles,
  ClipboardPaste,
  ArrowDown,
  Lightbulb,
} from 'lucide-react';
import { reverseGeocode, formatCoordinates, ReverseGeocodeResult } from '@/lib/reverse-geocode';
import { serverSearchMedicalPlace } from '@/lib/forward-geocode-server';
import type { PlaceSearchResult } from '@/lib/forward-geocode';

// SSR-safe location picker map — Leaflet needs `window`.
const LocationPickerMap = dynamic(
  () => import('@/components/map/LocationPickerMap'),
  {
    ssr: false,
    loading: () => <div className="h-[200px] rounded-2xl bg-slate-100 animate-pulse" />,
  },
);

interface SOSModeProps {
  onEmergencySubmit: (data: EmergencyData) => void;
  onCancel: () => void;
}

interface EmergencyData {
  bloodGroup: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  contactNumber: string;
  patientName: string;
  urgencyReason: string;
}

/**
 * Return a short label for a search result's type (hospital / clinic / city).
 * Mirrors the request page so the emergency search bar feels identical.
 */
function placeTypeLabel(place: PlaceSearchResult): string | null {
  const t = (place.type || '').toLowerCase();
  const amenity = place.address?.amenity?.toLowerCase() || '';
  const healthcare = place.address?.healthcare?.toLowerCase() || '';

  if (t === 'hospital' || amenity === 'hospital' || healthcare === 'hospital' || /hospital/.test(t)) {
    return 'Hospital';
  }
  if (t === 'clinic' || amenity === 'clinic' || healthcare === 'clinic') {
    return 'Clinic';
  }
  if (amenity === 'doctors' || healthcare === 'doctor') {
    return 'Doctors';
  }
  if (t === 'city' || t === 'town') return 'City';
  if (t === 'village') return 'Village';
  if (t === 'administrative' || t === 'suburb') return 'Area';
  return null;
}

/**
 * Tailwind color classes for each result type — red for hospitals,
 * amber for clinics, blue for cities, etc.
 */
function placeTypeColor(place: PlaceSearchResult): string {
  const t = (place.type || '').toLowerCase();
  const amenity = place.address?.amenity?.toLowerCase() || '';

  if (t === 'hospital' || amenity === 'hospital' || /hospital/.test(t)) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (t === 'clinic' || amenity === 'clinic') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (amenity === 'doctors') {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  if (t === 'city' || t === 'town') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (t === 'village') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

export default function EmergencySOSMode({ onEmergencySubmit, onCancel }: SOSModeProps) {
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [formData, setFormData] = useState<EmergencyData>({
    bloodGroup: '',
    location: '',
    lat: null,
    lng: null,
    contactNumber: '',
    patientName: '',
    urgencyReason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [geoDetail, setGeoDetail] = useState<ReverseGeocodeResult | null>(null);

  // Human-readable location name shown on the map badge instead of raw coords.
  const [pickedLocationName, setPickedLocationName] = useState<string | null>(null);
  // Lock the POI name so the async reverse-geocode reply doesn't clobber
  // a precise hospital name (e.g. "RMCH") with a generic city name.
  const lockedPoiNameRef = useRef<string | null>(null);
  // True after a search-result pick fills the location field — prevents
  // the async reverse-geocode from overwriting it.
  const searchFilledRef = useRef(false);
  // Forces the map to flyTo a new position even when lat/lng are the same
  // (used after a search-result pick).
  const [flyTrigger, setFlyTrigger] = useState(0);

  // ── Location search state ──────────────────────────────────────────
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const placeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeAbortRef = useRef<AbortController | null>(null);
  const placeContainerRef = useRef<HTMLDivElement>(null);

  // Track whether the user manually typed in the location field so we
  // don't auto-overwrite their text.
  const locationTouchedRef = useRef(false);

  /**
   * Reverse-geocode the captured coordinates and update the form's location
   * field with a detailed human-readable place name. Also stores the full
   * geocode result for displaying district/upazila/village details.
   */
  const resolveLocationName = useCallback(async (lat: number, lng: number) => {
    // Show coordinates immediately so the user sees feedback, then replace
    // with a real place name once reverse geocoding resolves.
    setFormData((prev) => ({ ...prev, lat, lng, location: formatCoordinates(lat, lng) }));
    setLocationDetected(true);

    try {
      const result = await reverseGeocode(lat, lng);
      if (result) {
        setGeoDetail(result);

        // Build a detailed location string: village/town → upazila → district
        const detailParts: string[] = [];
        if (result.town || result.village) {
          detailParts.push(result.town || result.village || '');
        }
        if (result.upazila) {
          detailParts.push(result.upazila);
        }
        if (result.district) {
          detailParts.push(result.district);
        }
        if (result.state && result.state !== result.district) {
          detailParts.push(result.state);
        }

        const detailedName = detailParts.length > 0
          ? detailParts.join(', ')
          : result.shortName;

        // Compute a concise name for the map badge — prefer the first
        // chunk of displayName (often the POI / hospital name).
        let mapName = detailedName;
        if (result.displayName) {
          const firstChunk = result.displayName.split(',')[0]?.trim();
          if (firstChunk && firstChunk.length < 60) {
            mapName = firstChunk;
          }
        }

        // Respect the POI-name lock from a search pick.
        if (lockedPoiNameRef.current) {
          setPickedLocationName(lockedPoiNameRef.current);
        } else {
          setPickedLocationName(mapName || null);
        }

        // Only overwrite the location field if it wasn't already filled
        // from a search result pick (which has the correct hospital name).
        if (!searchFilledRef.current && !locationTouchedRef.current) {
          setFormData((prev) => ({ ...prev, location: detailedName }));
        }
      }
    } catch {
      // Keep the coordinates already set above.
    }
  }, []);

  /**
   * Handle manual pin placement on the map. Reverse-geocodes the new position
   * and updates the location field — UNLESS this callback was triggered by
   * a search-result pick (in which case handlePickPlace already filled
   * everything correctly).
   */
  const handleMapPin = useCallback(async (lat: number, lng: number) => {
    if (lat === 0 && lng === 0) {
      // Pin removed — clear location
      setFormData((prev) => ({ ...prev, lat: null, lng: null, location: '' }));
      setLocationDetected(false);
      setGeoDetail(null);
      setPickedLocationName(null);
      lockedPoiNameRef.current = null;
      searchFilledRef.current = false;
      locationTouchedRef.current = false;
      return;
    }
    // Skip reverse-geocoding if triggered by a search-result pick.
    if (searchFilledRef.current) {
      setFormData((prev) =>
        prev.lat != null
          ? { ...prev, lat, lng }
          : { ...prev, lat, lng, location: prev.location || formatCoordinates(lat, lng) },
      );
      return;
    }
    lockedPoiNameRef.current = null;
    await resolveLocationName(lat, lng);
  }, [resolveLocationName]);

  /**
   * Dedicated "Use My Location" handler — always resets the search/touched
   * guards so GPS can overwrite whatever was there before, then acquires
   * GPS, drops a pin, reverse-geocodes, and fills the address field.
   * Passed to LocationPickerMap via `onUseMyLocation` so the map button
   * always fills the hospital address — even after a search pick.
   */
  const [gpsLoading, setGpsLoading] = useState(false);
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);

    // Reset guards so GPS overwrites any previous search/manual entry.
    searchFilledRef.current = false;
    locationTouchedRef.current = false;
    lockedPoiNameRef.current = null;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Update pin position + flyTrigger so the map recenters.
        setFormData((prev) => ({ ...prev, lat: latitude, lng: longitude }));
        setLocationDetected(true);
        setFlyTrigger((n) => n + 1);
        // Reverse-geocode and fill the address field.
        resolveLocationName(latitude, longitude).finally(() => {
          setGpsLoading(false);
        });
      },
      () => {
        setGpsLoading(false);
        // Silently fail — user can still click the map
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [resolveLocationName]);

  useEffect(() => {
    if (!isCountingDown || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsCountingDown(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-detect location — try high accuracy first, fall back to low
    // accuracy (cell/Wi-Fi) if GPS is unavailable or slow.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolveLocationName(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          // Retry with low accuracy if high accuracy timed out or failed.
          if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolveLocationName(position.coords.latitude, position.coords.longitude);
              },
              () => {
                console.log('Location detection failed or denied');
              },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
          } else {
            console.log('Location detection failed or denied');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }

    return () => clearInterval(timer);
  }, [countdown, isCountingDown, resolveLocationName]);

  // Close the place-search dropdown when the user clicks outside it.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        placeContainerRef.current &&
        !placeContainerRef.current.contains(e.target as Node)
      ) {
        setShowPlaceResults(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cancel any pending debounced search + abort in-flight request on unmount.
  useEffect(() => {
    return () => {
      if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
      if (placeAbortRef.current) placeAbortRef.current.abort();
    };
  }, []);

  /**
   * Run a medical place search via the server action.
   * Uses `serverSearchMedicalPlace` — AI-aware medical search:
   *   1. Detects medical intent (EN/BN/Banglish)
   *   2. AI extraction (GLM → DeepSeek) normalizes the institution name
   *   3. Nominatim with Rangpur division viewbox bias + medical relevance scoring
   *   4. Local fallback if Nominatim is unreachable
   */
  const handlePlaceSearch = async (rawQuery?: string) => {
    const q = (rawQuery ?? placeQuery).trim();
    if (!q) {
      setPlaceResults([]);
      setPlaceError(null);
      setShowPlaceResults(false);
      return;
    }

    if (placeAbortRef.current) placeAbortRef.current.abort();
    const controller = new AbortController();
    placeAbortRef.current = controller;

    setPlaceSearching(true);
    setPlaceError(null);
    setShowPlaceResults(true);
    setPlaceResults([]);
    setSelectedIdx(-1);

    try {
      const results = await serverSearchMedicalPlace(q);
      if (controller.signal.aborted) return;

      setPlaceResults(results);

      if (results.length === 0) {
        setPlaceError('No hospital or place found. Try a different name.');
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setPlaceError(err?.message || 'Search failed. Please try again.');
    } finally {
      if (!controller.signal.aborted) setPlaceSearching(false);
    }
  };

  /**
   * Live debounced search — waits 350ms after the user stops typing.
   */
  const handlePlaceInput = (value: string) => {
    setPlaceQuery(value);
    setSelectedIdx(-1);
    locationTouchedRef.current = true;

    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setPlaceResults([]);
      setPlaceError(null);
      setShowPlaceResults(false);
      if (placeAbortRef.current) placeAbortRef.current.abort();
      return;
    }

    placeDebounceRef.current = setTimeout(() => {
      handlePlaceSearch(value);
    }, 350);
  };

  /**
   * Keyboard navigation for the search results dropdown (↑/↓/Enter/Esc).
   */
  const handlePlaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPlaceResults || placeResults.length === 0) {
      if (e.key === 'Enter' && placeQuery.trim().length >= 2) {
        e.preventDefault();
        if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
        handlePlaceSearch();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev < placeResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev > 0 ? prev - 1 : placeResults.length - 1));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      handlePickPlace(placeResults[selectedIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowPlaceResults(false);
      setSelectedIdx(-1);
    }
  };

  /**
   * User picked a search result → fly the map there, drop the pin, and
   * fill the location field with the hospital/medical institution name.
   *
   * Only fills the location field with something that actually looks like
   * a medical institution — never puts a generic city name (e.g. "Rangpur
   * Metropolitan City") into the location field.
   */
  const handlePickPlace = (place: PlaceSearchResult) => {
    setFormData((prev) => ({
      ...prev,
      lat: place.lat,
      lng: place.lng,
    }));
    setLocationDetected(true);

    // Show the selected POI name on the map badge.
    setPickedLocationName(place.shortName || null);
    // Lock the POI name so the immediately-following reverse-geocode
    // call doesn't clobber it with a generic town name.
    lockedPoiNameRef.current = place.shortName || null;
    window.setTimeout(() => {
      if (lockedPoiNameRef.current === (place.shortName || null)) {
        lockedPoiNameRef.current = null;
      }
    }, 5000);

    setShowPlaceResults(false);
    setPlaceQuery(place.shortName || '');

    // Force the map to fly to the picked location.
    setFlyTrigger((n) => n + 1);

    // Only fill the location field if the result actually looks like a
    // medical institution — never put a generic city name there.
    const addr = place.address;
    const medicalKeywordRe =
      /(hospital|clinic|medical|health|diagnostic|college|center|centre|sadar|complex|nursing|dental|eye|shishu|cardiac|kidney|cancer|pharmacy|হাসপাতাল|ক্লিনিক|মেডিকেল|স্বাস্থ্য|কলেজ|সদর|কমপ্লেক্স)/i;
    const isMedicalType =
      place.type === 'hospital' ||
      place.type === 'clinic' ||
      addr?.amenity === 'hospital' ||
      addr?.amenity === 'clinic' ||
      !!addr?.hospital;

    let candidate = '';
    if (isMedicalType && place.shortName) {
      candidate = place.shortName;
    }
    if (!candidate && place.shortName && medicalKeywordRe.test(place.shortName)) {
      candidate = place.shortName;
    }
    if (!candidate && place.displayName) {
      const firstChunk = place.displayName.split(',')[0]?.trim();
      if (firstChunk && medicalKeywordRe.test(firstChunk)) {
        candidate = firstChunk;
      }
    }

    if (candidate) {
      setFormData((prev) => ({ ...prev, location: candidate }));
      searchFilledRef.current = true;
    } else if (place.displayName) {
      // Fall back to the full display name if no medical keyword was found.
      setFormData((prev) => ({ ...prev, location: place.displayName }));
      searchFilledRef.current = true;
    }

    // Still run reverse-geocode for the GPS label + any additional detail.
    resolveLocationName(place.lat, place.lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bloodGroup || !formData.contactNumber || !formData.patientName) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onEmergencySubmit(formData);
    } catch (error) {
      console.error('SOS submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCountingDown) {
    return (
      <div className="fixed inset-0 bg-red-600 z-50 flex items-center justify-center">
        <div className="text-center text-white animate-pulse">
          <AlertTriangle className="w-24 h-24 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">EMERGENCY MODE</h1>
          <p className="text-xl mb-8">Activating in {countdown}...</p>
          <button
            onClick={() => { setIsCountingDown(false); onCancel(); }}
            className="px-6 py-2 bg-white/20 rounded-full hover:bg-white/30 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border-l-4 border-red-500">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white rounded-t-3xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
              <h2 className="text-2xl font-bold">🚨 EMERGENCY BLOOD REQUEST</h2>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close emergency mode"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-red-100">This will send an urgent alert to all compatible donors nearby</p>

          {/* National Emergency 999 quick-dial */}
          <a
            href="tel:999"
            className="mt-4 flex items-center justify-center gap-2 w-full bg-white text-red-700 font-bold py-3 rounded-xl hover:bg-red-50 transition-all shadow-md"
            aria-label="Call Bangladesh National Emergency Service 999"
          >
            <Phone className="w-5 h-5" />
            <span>Call National Emergency — 999</span>
          </a>
          <p className="text-red-100 text-xs mt-2 text-center">
            For immediate police / ambulance / fire service assistance
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Blood Group - Critical */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Blood Group Required *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, bloodGroup: bg }))}
                  className={`py-3 px-2 rounded-xl font-bold text-lg transition-all ${
                    formData.bloodGroup === bg
                      ? 'bg-red-600 text-white scale-105 shadow-lg'
                      : 'bg-slate-100 text-slate-700 hover:bg-red-50'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Patient Name */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2">Patient Name *</label>
            <input
              type="text"
              value={formData.patientName}
              onChange={(e) => setFormData((prev) => ({ ...prev, patientName: e.target.value }))}
              placeholder="Enter patient's name"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 outline-none transition-colors"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              Current Location / Hospital
            </label>

            {/* ── Medical Location Search Bar ────────────────────────── */}
            {/* Same live debounced search + keyboard nav as the request page,
                so users can quickly find a hospital by name (EN/BN/Banglish)
                during an emergency instead of typing the full address. */}
            <div className="relative" ref={placeContainerRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={placeQuery}
                    onChange={(e) => handlePlaceInput(e.target.value)}
                    onKeyDown={handlePlaceKeyDown}
                    onFocus={() => {
                      if (placeResults.length > 0 || placeError) {
                        setShowPlaceResults(true);
                      }
                    }}
                    placeholder="Search hospital / clinic / institute: RMCH, rangpur medical, রংপুর মেডিকেল..."
                    className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm transition-all"
                  />
                  {/* Clear button */}
                  {placeQuery && !placeSearching && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlaceQuery('');
                        setPlaceResults([]);
                        setPlaceError(null);
                        setShowPlaceResults(false);
                        setSelectedIdx(-1);
                        if (placeAbortRef.current) placeAbortRef.current.abort();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                      aria-label="Clear"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {/* Live-search spinner */}
                  {placeSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-red-500" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
                    handlePlaceSearch();
                  }}
                  disabled={placeSearching || !placeQuery.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {placeSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>

              {/* Helper hint line */}
              {placeQuery.trim().length > 0 && placeQuery.trim().length < 2 && (
                <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Type one more character to search...
                </p>
              )}

              {/* Search results dropdown */}
              {showPlaceResults &&
                (placeResults.length > 0 || placeError || placeSearching) && (
                  <div
                    style={{
                      animation: 'emergency-search-dropdown-in 0.15s ease-out',
                    }}
                    className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-72 overflow-y-auto"
                  >
                    {placeSearching && placeResults.length === 0 && (
                      <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        <span>AI searching hospital...</span>
                      </div>
                    )}
                    {placeError && !placeSearching && (
                      <div className="p-3 text-sm text-red-600 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{placeError}</span>
                      </div>
                    )}
                    {placeResults.map((place, idx) => {
                      const isSelected = idx === selectedIdx;
                      const typeLabel = placeTypeLabel(place);
                      const typeColor = placeTypeColor(place);
                      return (
                        <button
                          key={place.placeId ?? `${place.lat}-${place.lng}-${idx}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handlePickPlace(place);
                          }}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          className={`w-full text-left px-3 py-2.5 border-b border-slate-100 last:border-b-0 transition-colors ${
                            isSelected ? 'bg-red-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <MapPin
                              className={`w-4 h-4 mt-0.5 shrink-0 ${
                                isSelected ? 'text-red-600' : 'text-red-500'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-slate-800 truncate flex-1">
                                  {place.shortName}
                                </p>
                                {typeLabel && (
                                  <span
                                    className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeColor}`}
                                  >
                                    {typeLabel}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {place.displayName}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>

            {/* Inline style for the dropdown slide-in animation. */}
            <style>{`
              @keyframes emergency-search-dropdown-in {
                0% { opacity: 0; transform: translateY(-6px); }
                100% { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              Search above, or use GPS — click the map to fine-tune
            </p>

            {/* Map picker — shows the pinned location with a human-readable
                name badge. Uses flyTrigger to animate to search results.
                The "Use My Location" button stays visible so the user can
                always re-acquire GPS — it fills the address field below. */}
            {locationDetected && formData.lat != null && formData.lng != null ? (
              <div className="mt-3">
                <LocationPickerMap
                  label="Pin Your Exact Location"
                  hint="Click 'Use My Location' for GPS, or click the map to reposition the pin."
                  height={200}
                  showLocateButton={true}
                  showCoordinates={false}
                  initialLat={formData.lat}
                  initialLng={formData.lng}
                  flyTrigger={flyTrigger}
                  onLocationChange={handleMapPin}
                  onUseMyLocation={handleUseMyLocation}
                  locating={gpsLoading}
                  locationName={pickedLocationName}
                />
                {/* Helper actions row — Google Maps link + Paste to Address */}
                <div className="space-y-2 mt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${formData.lat},${formData.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Open in Google Maps
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (pickedLocationName || formData.location) {
                          const label = pickedLocationName || formData.location;
                          setFormData((prev) => ({ ...prev, location: label }));
                          locationTouchedRef.current = true;
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      Paste to Address
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 flex items-start gap-1.5 leading-snug">
                    <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                    <span>
                      Tap "Use My Location" on the map to auto-fill the address below with your GPS location, or go to Google Maps, copy a location, and paste it into the address field.
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <LocationPickerMap
                  label="Pin Your Location on Map"
                  hint="Click 'Use My Location' for GPS, or click anywhere on the map to mark your location."
                  height={200}
                  showLocateButton={true}
                  flyTrigger={flyTrigger}
                  onLocationChange={handleMapPin}
                  onUseMyLocation={handleUseMyLocation}
                  locating={gpsLoading}
                  locationName={pickedLocationName}
                />
              </div>
            )}

            {/* Location input field — kept UNDER the map so the search bar
                and the address input are clearly separated. Auto-filled from
                search or GPS, but the user can also type manually. */}
            <div className="relative mt-3">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Hospital / Clinic / Institute Location Address
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => {
                  locationTouchedRef.current = true;
                  setFormData((prev) => ({ ...prev, location: e.target.value }));
                }}
                placeholder={locationDetected ? 'Location auto-detected ✅' : 'Enter hospital / clinic / institute address'}
                className="w-full px-4 py-3 pr-10 rounded-lg border-2 border-slate-200 focus:border-red-500 outline-none transition-colors"
              />
              {locationDetected && !locationTouchedRef.current && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>

            {/* Detailed location breakdown from reverse geocoding */}
            {geoDetail && (
              <div className="mt-2 p-2.5 bg-green-50 rounded-xl border border-green-200">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {geoDetail.town && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Area:</span>
                      <span className="font-medium text-slate-700">{geoDetail.town}</span>
                    </div>
                  )}
                  {geoDetail.village && !geoDetail.town && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Village:</span>
                      <span className="font-medium text-slate-700">{geoDetail.village}</span>
                    </div>
                  )}
                  {geoDetail.upazila && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Upazila:</span>
                      <span className="font-medium text-slate-700">{geoDetail.upazila}</span>
                    </div>
                  )}
                  {geoDetail.district && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">District:</span>
                      <span className="font-medium text-slate-700">{geoDetail.district}</span>
                    </div>
                  )}
                  {geoDetail.state && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Division:</span>
                      <span className="font-medium text-slate-700">{geoDetail.state}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contact */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-red-500" />
              Emergency Contact Number *
            </label>
            <input
              type="tel"
              value={formData.contactNumber}
              onChange={(e) => setFormData((prev) => ({ ...prev, contactNumber: e.target.value }))}
              placeholder="01XXXXXXXXX"
              pattern="01[0-9]{9}"
              required
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 outline-none transition-colors"
            />
          </div>

          {/* Urgency Reason */}
          <div>
            <label className="block font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              Reason for Urgency
            </label>
            <textarea
              value={formData.urgencyReason}
              onChange={(e) => setFormData((prev) => ({ ...prev, urgencyReason: e.target.value }))}
              placeholder="Briefly describe why this is an emergency (e.g., surgery, accident, critical condition)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 outline-none transition-colors resize-none"
            />
          </div>

          {/* Warning Banner */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <strong>Important:</strong> This emergency request will be sent to ALL compatible donors within your area.
              Only use this for genuine life-threatening emergencies.
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending Emergency Alert...
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                🚨 SEND EMERGENCY ALERT NOW
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full text-slate-500 py-2 hover:text-slate-700 transition-colors"
          >
            Cancel &amp; Use Normal Request Instead
          </button>
        </form>
      </div>
    </div>
  );
}
