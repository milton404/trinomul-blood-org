"use client";

import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { notification } from "@/lib/utils/notifications";
import {
  serverCreateBloodRequest,
  serverFindMatchingDonors,
  serverRecordDonorMatches,
  serverAnalyzeRequestContext,
  serverGetProfileByUserId,
  serverGetSavedPatients,
  serverGetBloodRequestById,
} from "@/lib/db-actions";
import { serverGetCurrentUser } from "@/lib/auth/actions";
import { reverseGeocode, formatCoordinates } from "@/lib/reverse-geocode";
import type { ReverseGeocodeResult } from "@/lib/reverse-geocode";
import { type PlaceSearchResult } from "@/lib/forward-geocode";
import { serverSearchMedicalPlace } from "@/lib/forward-geocode-server";
import {
  Loader2,
  HeartPulse,
  Phone,
  Hospital,
  MapPin,
  AlertTriangle,
  MessageCircle,
  Crosshair,
  Navigation,
  CheckCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  Lightbulb,
  Search,
  ClipboardPaste,
  ArrowDown,
  Copy,
  Check,
  X,
} from "lucide-react";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import {
  RANGPUR_DISTRICTS,
  RANGPUR_UPAZILAS,
  getUpazilasByDistrict,
  getDistrictById,
  getUpazilaById,
  getUnionsByUpazila,
  getUnionById,
} from "@/lib/constants/rangpur";

// SSR-safe location picker map — Leaflet needs `window`.
const LocationPickerMap = dynamic(
  () => import("@/components/map/LocationPickerMap"),
  {
    ssr: false,
    loading: () => <div className="h-[200px] rounded-2xl bg-slate-100 animate-pulse" />,
  },
);

const requestSchema = z.object({
  patientName: z.string().min(2, "Patient name is required"),
  patientAge: z.number().min(0).max(120),
  bloodGroup: z.string().min(1, "Blood group is required"),
  unitsNeeded: z.number().min(1, "At least 1 unit is required"),
  patientHbLevel: z.number().min(0).max(20).optional(),
  urgencyLevel: z.enum(["normal", "urgent", "critical"]),
  whenNeeded: z.enum([
    "now",
    "today",
    "tomorrow",
    "day_after",
    "specific_date",
  ]),
  neededDate: z.string().optional(),
  neededTime: z.string().optional(),
  district: z.string().min(1, "District is required"),
  upazila: z.string().min(1, "Upazila is required"),
  union: z.string().optional(),
  hospitalName: z.string().min(2, "Hospital name is required"),
  hospitalAddress: z.string().min(5, "Hospital address is required"),
  contactNumber: z.string().min(10, "Valid contact number is required"),
  alternativeNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
  reason: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

const EmergencySOS = lazy(() =>
  import("@/components/requests/EmergencySOS").then((m) => ({
    default: m.default,
  })),
);

/**
 * Return a short localized label for a search result's type
 * (hospital / clinic / city / etc.) so we can show a colored chip
 * next to each result — same visual pattern as MapSearchBar.
 */
function placeTypeLabel(
  place: PlaceSearchResult,
  isBn: boolean,
): string | null {
  const t = (place.type || "").toLowerCase();
  const amenity = place.address?.amenity?.toLowerCase() || "";
  const healthcare = place.address?.healthcare?.toLowerCase() || "";

  if (
    t === "hospital" ||
    amenity === "hospital" ||
    healthcare === "hospital" ||
    /hospital/.test(t)
  ) {
    return isBn ? "হাসপাতাল" : "Hospital";
  }
  if (
    t === "clinic" ||
    amenity === "clinic" ||
    healthcare === "clinic"
  ) {
    return isBn ? "ক্লিনিক" : "Clinic";
  }
  if (amenity === "doctors" || healthcare === "doctor") {
    return isBn ? "ডাক্তার" : "Doctors";
  }
  if (t === "city" || t === "town") {
    return isBn ? "শহর" : "City";
  }
  if (t === "village") {
    return isBn ? "গ্রাম" : "Village";
  }
  if (t === "administrative" || t === "suburb") {
    return isBn ? "এলাকা" : "Area";
  }
  return null;
}

/**
 * Tailwind color classes for each result type — red for hospitals,
 * amber for clinics, blue for cities, etc. Matches the MapSearchBar
 * chip aesthetic so the request page feels consistent.
 */
function placeTypeColor(place: PlaceSearchResult): string {
  const t = (place.type || "").toLowerCase();
  const amenity = place.address?.amenity?.toLowerCase() || "";

  if (
    t === "hospital" ||
    amenity === "hospital" ||
    /hospital/.test(t)
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (t === "clinic" || amenity === "clinic") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (amenity === "doctors") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  if (t === "city" || t === "town") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (t === "village") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function RequestBloodPage() {
  const t = useTranslations("request");
  const tAi = useTranslations("ai_assistant");
  const locale = useLocale();
  const isBn = locale === "bn";
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  // Holds the freshly created request so the success dialog can show its
  // tracking code (e.g. REQ-AB12CD) with copy + track actions.
  const [submitted, setSubmitted] = useState<{
    id: number;
    trackingCode: string;
    registerUrl: string | null;
  } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [userGps, setUserGps] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geoDetail, setGeoDetail] = useState<ReverseGeocodeResult | null>(null);
  // Human-readable location name to display on the map instead of raw
  // coordinates. Populated from search-result POI shortName or from
  // reverse-geocoded displayName (first chunk). Falls back to userGps.label.
  const [pickedLocationName, setPickedLocationName] = useState<string | null>(null);
  // When a user picks a medical place from the search list, we want to
  // preserve the POI name (e.g. "RMCH") even though the async
  // reverse-geocode call returns a more generic address shortly after.
  const lockedPoiNameRef = useRef<string | null>(null);
  // When the user picks a search result, handlePickPlace fills
  // hospitalName + hospitalAddress from the search result (which has
  // the correct medical name). The async reverse-geocode that follows
  // must NOT overwrite those fields with a generic city name. This ref
  // stays true until the user manually moves the pin or uses GPS.
  const searchFilledRef = useRef(false);

  // ── Location search state ──────────────────────────────────────────
  // Live debounced search (350ms) — same UX as the homepage & map page
  // search bars. As the user types, we hit `serverSearchMedicalPlace`
  // which runs AI extraction (GLM → DeepSeek) + Nominatim + local
  // fallback. Keyboard navigation (↑/↓/Enter/Esc) lets users pick a
  // result without lifting their hands from the keyboard.
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const placeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeAbortRef = useRef<AbortController | null>(null);
  const placeContainerRef = useRef<HTMLDivElement>(null);
  // Map picker is collapsed by default to keep the form compact. The
  // user taps "Open Map" to expand it — Leaflet only mounts then, so
  // we avoid loading map tiles until they're actually needed.
  const [mapExpanded, setMapExpanded] = useState(false);

  // Track which fields the user has manually typed in so we don't
  // auto-overwrite their text when the map pin moves.
  const [hospitalNameTouched, setHospitalNameTouched] = useState(false);
  const [hospitalAddressTouched, setHospitalAddressTouched] = useState(false);

  // ── AI Smart Helper state ──────────────────────────────────────────
  // Collapsible card that calls `serverAnalyzeRequestContext` to give
  // advisory feedback on the user's current form input. Advisory only —
  // never auto-changes form fields.
  type RequestAnalysis = Awaited<ReturnType<typeof serverAnalyzeRequestContext>>;
  const [aiHelperExpanded, setAiHelperExpanded] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<RequestAnalysis | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      urgencyLevel: "normal",
      whenNeeded: "today",
      unitsNeeded: 1,
    },
  });

  const whenNeeded = watch("whenNeeded");
  const selectedDistrict = watch("district");
  const selectedUpazila = watch("upazila");
  // Watched fields used as input to the AI Smart Helper analysis.
  const selectedBloodGroup = watch("bloodGroup");
  const selectedUrgency = watch("urgencyLevel");
  const selectedUnits = watch("unitsNeeded");

  const availableUpazilas = selectedDistrict
    ? getUpazilasByDistrict(selectedDistrict)
    : [];

  const availableUnions = selectedUpazila
    ? getUnionsByUpazila(selectedUpazila)
    : [];

  const handleDistrictChange = (districtId: string) => {
    setValue("district", districtId);
    setValue("upazila", "");
    setValue("union", "");
  };

  // ── Quick Request pre-fill ─────────────────────────────────────────
  // 1. "Request Again" template (sessionStorage) from My Requests wins.
  // 2. Then the logged-in user's profile fills any still-empty fields.
  // 3. Saved patient profiles load for the one-click picker chips.
  const prefilledRef = useRef(false);
  const [savedPatients, setSavedPatients] = useState<any[]>([]);
  useEffect(() => {
    if (prefilledRef.current) return;
    prefilledRef.current = true;
    (async () => {
      // 1. Template from "Request Again"
      try {
        const raw = sessionStorage.getItem("request_template");
        if (raw) {
          sessionStorage.removeItem("request_template");
          const tpl = JSON.parse(raw);
          if (tpl.patientName) setValue("patientName", tpl.patientName);
          if (tpl.patientAge != null) setValue("patientAge", tpl.patientAge);
          if (tpl.bloodGroup) setValue("bloodGroup", tpl.bloodGroup);
          if (tpl.unitsNeeded) setValue("unitsNeeded", tpl.unitsNeeded);
          if (tpl.hospitalName) setValue("hospitalName", tpl.hospitalName);
          if (tpl.hospitalAddress)
            setValue("hospitalAddress", tpl.hospitalAddress);
          if (tpl.reason) setValue("reason", tpl.reason);
        }
      } catch {}

      // 2. Profile pre-fill (only into empty fields)
      try {
        const currentUser = await serverGetCurrentUser().catch(() => null);
        if (!currentUser?.id) return;
        const profile = (await serverGetProfileByUserId(
          Number(currentUser.id),
        )) as any;
        if (!profile) return;

        // 3. Saved patients for the picker
        serverGetSavedPatients(Number(currentUser.id))
          .then((rows) => setSavedPatients((rows as any[]) || []))
          .catch(() => {});

        if (
          !getValues("patientName") &&
          (profile.full_name_en || profile.full_name_bn)
        ) {
          setValue("patientName", profile.full_name_en || profile.full_name_bn);
        }
        if (!getValues("contactNumber") && profile.phone)
          setValue("contactNumber", profile.phone);
        if (!getValues("alternativeNumber") && profile.alternative_phone)
          setValue("alternativeNumber", profile.alternative_phone);
        if (!getValues("whatsappNumber") && profile.whatsapp_number)
          setValue("whatsappNumber", profile.whatsapp_number);
        if (!getValues("bloodGroup") && profile.blood_group)
          setValue("bloodGroup", profile.blood_group);

        // district/upazila may be stored as an id or as a display name
        const district = RANGPUR_DISTRICTS.find(
          (d) =>
            d.id === (profile.district || "").toLowerCase() ||
            d.name_en.toLowerCase() === (profile.district || "").toLowerCase(),
        );
        if (district) {
          handleDistrictChange(district.id);
          const upazila = getUpazilasByDistrict(district.id).find(
            (u) =>
              u.id === (profile.upazila || "").toLowerCase() ||
              u.name_en.toLowerCase() ===
                (profile.upazila || "").toLowerCase(),
          );
          if (upazila) {
            setTimeout(() => setValue("upazila", upazila.id), 50);
            // Pre-fill union when the profile has one and the upazila supports it.
            if (profile.union_name) {
              const union = getUnionsByUpazila(upazila.id).find(
                (un) =>
                  un.id === (profile.union_name || "").toLowerCase() ||
                  un.name_en.toLowerCase() ===
                    (profile.union_name || "").toLowerCase(),
              );
              if (union) {
                setTimeout(() => setValue("union", union.id), 60);
              }
            }
          }
        }

        if (!getValues("patientAge") && profile.date_of_birth) {
          const age = Math.floor(
            (Date.now() - new Date(profile.date_of_birth).getTime()) /
              (365.25 * 24 * 3600 * 1000),
          );
          if (age >= 0 && age <= 120) setValue("patientAge", age);
        }
      } catch {
        // pre-fill is best-effort only
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── AI Smart Helper: debounced analysis ────────────────────────────
  // When the helper card is expanded, re-run the analysis whenever any
  // of the relevant form fields change. A 1.5s debounce avoids calling
  // the server action on every keystroke. Advisory only — never writes
  // back to the form.
  useEffect(() => {
    if (!aiHelperExpanded) {
      return;
    }

    if (aiDebounceRef.current) {
      clearTimeout(aiDebounceRef.current);
    }

    // Resolve the human-readable district name (the analysis prompt uses
    // it for display, so a name is more useful than the raw id).
    const districtName = selectedDistrict
      ? getDistrictById(selectedDistrict)?.name_en
      : undefined;

    aiDebounceRef.current = setTimeout(async () => {
      setAiAnalyzing(true);
      setAiError(null);
      try {
        const result = await serverAnalyzeRequestContext({
          bloodGroup: selectedBloodGroup || undefined,
          district: districtName,
          urgencyLevel: selectedUrgency || undefined,
          unitsNeeded:
            typeof selectedUnits === "number" && !Number.isNaN(selectedUnits)
              ? selectedUnits
              : undefined,
        });
        setAiAnalysis(result);
      } catch (err: any) {
        setAiError(err?.message || "Unable to fetch AI suggestions.");
      } finally {
        setAiAnalyzing(false);
      }
    }, 1500);

    return () => {
      if (aiDebounceRef.current) {
        clearTimeout(aiDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aiHelperExpanded,
    selectedBloodGroup,
    selectedDistrict,
    selectedUrgency,
    selectedUnits,
  ]);

  const resolveLocationFromGps = async (lat: number, lng: number) => {
    setUserGps({ lat, lng, label: formatCoordinates(lat, lng) });
    setGpsLoading(false);
    toast.success(t("gps_captured") || "GPS location captured");

    try {
      const result = await reverseGeocode(lat, lng);
      if (result) {
        setGeoDetail(result);

        // Build a detailed label: area → upazila → district
        const detailParts: string[] = [];
        if (result.town || result.village) {
          detailParts.push(result.town || result.village || "");
        }
        if (result.upazila) {
          detailParts.push(result.upazila);
        }
        if (result.district) {
          detailParts.push(result.district);
        }

        const label = detailParts.length > 0
          ? detailParts.join(", ")
          : result.shortName;

        setUserGps({ lat, lng, label });

        // Compute a concise, human-readable name to show on the map badge.
        // Prefer a real POI/hospital name from the first chunk of
        // displayName; fall back to the aggregate label built above.
        let mapName = label;
        if (result.displayName) {
          const firstChunk = result.displayName.split(",")[0]?.trim();
          if (firstChunk && firstChunk.length < 60) {
            mapName = firstChunk;
          }
        }
        // Respect the POI-name lock: if the user just clicked a medical
        // search result we want to keep that precise name (e.g. "RMCH")
        // rather than downgrade to a generic "Rangpur" from the async
        // reverse-geocode reply.
        if (lockedPoiNameRef.current) {
          setPickedLocationName(lockedPoiNameRef.current);
        } else {
          setPickedLocationName(mapName || null);
        }

        // Auto-select district/upazila dropdowns if the location is in
        // Rangpur division. The user can still manually override these
        // afterwards — the dropdowns remain enabled.
        if (result.district) {
          const cleanDistrict = result.district.replace(/\s*District$/i, "").trim();
          const matchedDistrict = RANGPUR_DISTRICTS.find(
            (d) => d.name_en.toLowerCase() === cleanDistrict.toLowerCase(),
          );
          if (matchedDistrict) {
            setValue("district", matchedDistrict.id);
            // Set the district via the handler so upazila list refreshes
            handleDistrictChange(matchedDistrict.id);

            // Try to auto-select upazila as well
            if (result.upazila) {
              const cleanUpazila = result.upazila.replace(/\s*Upazila$/i, "").trim();
              const upazilas = getUpazilasByDistrict(matchedDistrict.id);
              const matchedUpazila = upazilas.find(
                (u) => u.name_en.toLowerCase() === cleanUpazila.toLowerCase(),
              );
              if (matchedUpazila) {
                // Small delay so react-hook-form registers the district first
                setTimeout(() => setValue("upazila", matchedUpazila.id), 50);
              }
            }
          }
        }

        // Auto-paste the reverse-geocoded location into hospitalName and
        // hospitalAddress — BUT only if the user hasn't typed anything
        // there yet AND the values weren't already filled from a search
        // result pick (which has the correct medical institution name).
        // Without the searchFilledRef guard, the async reverse-geocode
        // reply would clobber "Rangpur Medical College Hospital" with a
        // generic "Rangpur Metropolitan City".
        if (!hospitalAddressTouched && !searchFilledRef.current) {
          // Use full displayName for hospital address so the user sees
          // a complete, readable address instead of just the district bits.
          const addressLabel = result.displayName || label;
          setValue("hospitalAddress", addressLabel, { shouldValidate: false });
        }
        // For hospital name: only auto-fill if the reverse-geocoded POI
        // name actually looks like a medical institution. We never want
        // to put a generic town/village/city name (e.g. "Rangpur
        // Metropolitan City") into the Hospital Name field.
        if (!hospitalNameTouched && !searchFilledRef.current) {
          let poiName: string | undefined;
          if (result.displayName) {
            const firstChunk = result.displayName.split(",")[0]?.trim();
            if (
              firstChunk &&
              /(hospital|clinic|medical|health|diagnostic|college|center|centre|sadar|complex|hospotal|nursing|dental|eye|shishu|cardiac|কমপ্লেক্স|হাসপাতাল|মেডিকেল|ক্লিনিক|স্বাস্থ্য|কলেজ|সদর)/i.test(
                firstChunk,
              )
            ) {
              poiName = firstChunk;
            }
          }
          if (poiName) {
            setValue("hospitalName", poiName, { shouldValidate: false });
          }
        }
      }
    } catch {
      // Keep the coordinates already set above.
    }
  };

  // Close the place-search dropdown when the user clicks outside it.
  // Mirrors the MapSearchBar pattern so the request page feels identical
  // to the homepage & map page search bars.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        placeContainerRef.current &&
        !placeContainerRef.current.contains(e.target as Node)
      ) {
        setShowPlaceResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Cancel any pending debounced search + abort in-flight request when
  // the component unmounts (avoids setState-on-unmounted warnings).
  useEffect(() => {
    return () => {
      if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
      if (placeAbortRef.current) placeAbortRef.current.abort();
    };
  }, []);

  /**
   * Run a place search via the server action.
   *
   * Uses `serverSearchMedicalPlace` — the AI-aware medical search function:
   *   1. Detects if the query is medical/clinic/hospital related (EN/BN/Banglish)
   *   2. If medical: runs GLM AI (free) first, then DeepSeek (paid) to extract
   *      and normalize the institution name (expands RMCH → Rangpur Medical
   *      College Hospital, translates বাংলা, fixes typoes, etc.)
   *   3. Searches Nominatim with Rangpur division viewbox bias and ranks
   *      results by medical relevance (hospitals first, etc.)
   *   4. Full local fallback if Nominatim is unreachable.
   * Always returns something — graceful degradation.
   */
  const handlePlaceSearch = async (rawQuery?: string) => {
    const q = (rawQuery ?? placeQuery).trim();
    if (!q) {
      setPlaceResults([]);
      setPlaceError(null);
      setShowPlaceResults(false);
      return;
    }

    // Cancel any prior in-flight request so only the latest query wins.
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

      // Ignore stale responses from a superseded query.
      if (controller.signal.aborted) return;

      setPlaceResults(results);

      if (results.length === 0) {
        setPlaceError(
          isBn
            ? "কোনো হাসপাতাল বা স্থান পাওয়া যায়নি। অন্য নাম দিয়ে চেষ্টা করুন।"
            : "No hospital or place found. Try a different name.",
        );
      } else {
        // If the result came from the AI/local fallback (synthetic
        // placeId < 0), surface a friendly toast so the user knows
        // their Bangla/Banglish query was understood.
        const usedFallback = results.some(
          (r) => typeof r.placeId === "number" && r.placeId < 0,
        );
        if (usedFallback) {
          toast.success(
            isBn
              ? `AI আপনার লেখা বুঝেছে: "${results[0].shortName}"`
              : `AI understood your text: "${results[0].shortName}"`,
          );
        }
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setPlaceError(err?.message || "Search failed. Please try again.");
    } finally {
      if (!controller.signal.aborted) setPlaceSearching(false);
    }
  };

  /**
   * Live debounced search — same UX as MapSearchBar.tsx.
   * Waits 350ms after the user stops typing, then fires a search.
   * Short queries (<2 chars) just clear the results.
   */
  const handlePlaceInput = (value: string) => {
    setPlaceQuery(value);
    setSelectedIdx(-1);

    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      // Too short — clear results + hide dropdown.
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
   * Keyboard navigation for the search results dropdown — mirrors
   * MapSearchBar.tsx so users get the same ↑/↓/Enter/Esc behaviour.
   */
  const handlePlaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPlaceResults || placeResults.length === 0) {
      // If the user hits Enter with the dropdown closed and there's a
      // query, fire a manual search (preserves old "press Enter to
      // search" behaviour).
      if (e.key === "Enter" && placeQuery.trim().length >= 2) {
        e.preventDefault();
        if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
        handlePlaceSearch();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) =>
        prev < placeResults.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) =>
        prev > 0 ? prev - 1 : placeResults.length - 1,
      );
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      handlePickPlace(placeResults[selectedIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowPlaceResults(false);
      setSelectedIdx(-1);
    }
  };

  /**
   * User picked a search result → fly the map there, drop the pin, and
   * run the same reverse-geocode → auto-fill pipeline as GPS.
   *
   * If the search result came from the local fallback (synthetic
   * placeId < 0), its `address` field already contains the matched
   * district/upazila names — we auto-fill those directly since the
   * reverse-geocode call (also Nominatim-based) may fail when the
   * network is blocked.
   */
  const handlePickPlace = (place: PlaceSearchResult) => {
    setUserGps({ lat: place.lat, lng: place.lng, label: place.shortName });
    // Show the selected POI name on the map badge (e.g. "RMCH" instead of
    // raw coords) — user already confirmed this is the location they want.
    setPickedLocationName(place.shortName || null);
    // Lock the POI name so the immediately-following reverse-geocode call
    // (which can return a generic town name instead) doesn't clobber it.
    // Release the lock after 5 seconds so future pin-moves by the user
    // get fresh names from reverse-geocoding.
    lockedPoiNameRef.current = place.shortName || null;
    window.setTimeout(() => {
      if (lockedPoiNameRef.current === (place.shortName || null)) {
        lockedPoiNameRef.current = null;
      }
    }, 5000);
    setShowPlaceResults(false);
    setPlaceQuery(place.shortName);

    // Auto-expand the map so the user can see the pin fly to the
    // picked location. If the map was collapsed, the flyTo wouldn't
    // be visible.
    setMapExpanded(true);

    // Force the map to update its pin and fly to the location.
    setFlyTrigger((n) => n + 1);

    // If the result has address data (from Nominatim OR the local
    // fallback), auto-fill district/upazila directly from it. This is
    // more reliable than reverse-geocoding the coordinates (which also
    // depends on Nominatim and may fail).
    const addr = place.address;
    if (addr?.state_district || addr?.county) {
      if (addr.state_district) {
        const cleanDistrict = addr.state_district.replace(/\s*District$/i, "").trim();
        const matchedDistrict = RANGPUR_DISTRICTS.find(
          (d) => d.name_en.toLowerCase() === cleanDistrict.toLowerCase(),
        );
        if (matchedDistrict) {
          handleDistrictChange(matchedDistrict.id);
          if (addr.county) {
            const cleanUpazila = addr.county.replace(/\s*Upazila$/i, "").trim();
            const upazilas = getUpazilasByDistrict(matchedDistrict.id);
            const matchedUpazila = upazilas.find(
              (u) => u.name_en.toLowerCase() === cleanUpazila.toLowerCase(),
            );
            if (matchedUpazila) {
              setTimeout(() => setValue("upazila", matchedUpazila.id), 50);
            }
          }
        }
      }
    }

    // Auto-fill hospitalName and hospitalAddress directly from the
    // selected search result — the POI shortName is often the hospital
    // name (e.g. "Rangpur Medical College Hospital") and displayName is
    // the full address. We only do this if the user hasn't manually
    // typed in those fields.
    let filledFromSearch = false;
    if (!hospitalAddressTouched) {
      setValue("hospitalAddress", place.displayName, { shouldValidate: false });
      filledFromSearch = true;
    }
    if (!hospitalNameTouched) {
      // Only auto-fill the hospital name if we can extract something
      // that actually looks like a medical institution. We NEVER want
      // to put a generic city/area name (e.g. "Rangpur Metropolitan
      // City") into the Hospital Name field — that's misleading.
      const medicalKeywordRe =
        /(hospital|clinic|medical|health|diagnostic|college|center|centre|sadar|complex|nursing|dental|eye|shishu|cardiac|kidney|cancer|pharmacy|হাসপাতাল|ক্লিনিক|মেডিকেল|স্বাস্থ্য|কলেজ|সদর|কমপ্লেক্স)/i;
      const isMedicalType =
        place.type === "hospital" ||
        place.type === "clinic" ||
        addr?.amenity === "hospital" ||
        addr?.amenity === "clinic" ||
        !!addr?.hospital;

      let candidate = "";
      // 1) If the result is typed as a hospital/clinic, use its shortName.
      if (isMedicalType && place.shortName) {
        candidate = place.shortName;
      }
      // 2) Otherwise, check if shortName itself contains a medical keyword.
      if (!candidate && place.shortName && medicalKeywordRe.test(place.shortName)) {
        candidate = place.shortName;
      }
      // 3) Otherwise, check the first chunk of displayName.
      if (!candidate && place.displayName) {
        const firstChunk = place.displayName.split(",")[0]?.trim();
        if (firstChunk && medicalKeywordRe.test(firstChunk)) {
          candidate = firstChunk;
        }
      }
      // If nothing medical-looking was found, leave the hospital name
      // EMPTY — the user can type it manually. This is better than
      // filling it with "Rangpur Metropolitan City".
      if (candidate) {
        setValue("hospitalName", candidate, { shouldValidate: false });
        filledFromSearch = true;
      }
    }
    // Mark that the hospital fields were filled from the search result
    // so the async reverse-geocode call below doesn't overwrite them
    // with a generic city name (e.g. "Rangpur Metropolitan City").
    if (filledFromSearch) {
      searchFilledRef.current = true;
    }

    // Still run the reverse-geocode pipeline for the GPS label + any
    // additional detail Nominatim might return. If Nominatim is
    // unreachable, this silently fails — we already filled what we could.
    resolveLocationFromGps(place.lat, place.lng);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t("location_detection_failed") || "Geolocation not supported");
      return;
    }
    setGpsLoading(true);
    // Make sure the map is visible so the user sees the pin drop.
    setMapExpanded(true);
    // Clear POI lock + search-fill guard — user's own position is a
    // fresh name and should be allowed to fill hospital fields.
    lockedPoiNameRef.current = null;
    searchFilledRef.current = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolveLocationFromGps(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        // Retry with low accuracy if high accuracy timed out or failed.
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolveLocationFromGps(position.coords.latitude, position.coords.longitude);
            },
            () => {
              setGpsLoading(false);
              toast.error(t("location_detection_failed") || "Could not detect your location");
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
          );
        } else {
          setGpsLoading(false);
          toast.error(t("location_detection_failed") || "Could not detect your location");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  /**
   * Handle manual pin placement on the map. Reverse-geocodes the new position
   * and updates the location display.
   */
  const handleMapPin = useCallback(async (lat: number, lng: number) => {
    if (lat === 0 && lng === 0) {
      // Pin removed — clear location
      setUserGps(null);
      setGeoDetail(null);
      setPickedLocationName(null);
      lockedPoiNameRef.current = null;
      searchFilledRef.current = false;
      return;
    }
    // If this callback was triggered by a search-result pick (handlePickPlace
    // sets searchFilledRef = true and then calls setFlyTrigger which makes
    // the map fly + fire onLocationChange), DON'T reset the guard or run
    // reverse-geocoding again — handlePickPlace already filled the hospital
    // fields with the correct medical name and called resolveLocationFromGps.
    // Resetting here would let the async reverse-geocode clobber the name.
    if (searchFilledRef.current) {
      // Just update the GPS coordinates without overwriting hospital fields.
      setUserGps((prev) => prev ? { ...prev, lat, lng } : { lat, lng, label: "" });
      return;
    }
    // User manually moved the pin (not via search result click) — allow
    // reverse-geocoding to set a fresh location name and fill hospital
    // fields if the user hasn't typed in them yet.
    lockedPoiNameRef.current = null;
    await resolveLocationFromGps(lat, lng);
  }, []);

  const onSubmit = async (values: RequestFormValues) => {
    setIsLoading(true);

    try {
      // Validate required fields
      if (!values.patientName || !values.bloodGroup || !values.unitsNeeded) {
        throw new Error("Please fill all required fields");
      }

      const district = getDistrictById(values.district);
      const upazila = getUpazilaById(values.upazila);
      const union = values.union ? getUnionById(values.union) : undefined;

      if (!district) {
        throw new Error("Invalid district selected");
      }

      if (!upazila) {
        throw new Error("Invalid upazila selected");
      }

      // Validate contact number format
      const phoneRegex = /^01[3-9]\d{8}$/;
      if (!phoneRegex.test(values.contactNumber)) {
        throw new Error("Please enter a valid Bangladesh phone number");
      }

      if (values.alternativeNumber && !phoneRegex.test(values.alternativeNumber)) {
        throw new Error("Please enter a valid alternative phone number");
      }

      if (values.whatsappNumber && !phoneRegex.test(values.whatsappNumber)) {
        throw new Error("Please enter a valid WhatsApp number");
      }

      const ipAddress = await fetch('https://api.ipify.org?format=json').then(res => res.json()).then(data => data.ip).catch(() => 'unknown');
      const userAgent = navigator.userAgent;

      // Resolve the authenticated user (if any) so the request is linked to
      // their account. Anonymous submissions are still allowed — the
      // requester_id column is nullable in the schema.
      const currentUser = await serverGetCurrentUser().catch(() => null);

      const requestId = await serverCreateBloodRequest({
        requesterId: currentUser?.id ?? null,
        requesterType: currentUser ? "user" : "guest",
        patientName: values.patientName,
        patientAge: values.patientAge,
        bloodGroup: values.bloodGroup,
        unitsNeeded: values.unitsNeeded,
        urgencyLevel: values.urgencyLevel,
        whenNeeded: values.whenNeeded,
        neededDate: values.neededDate || null,
        neededTime: values.neededTime || null,
        district: district.name_en || values.district,
        upazila: upazila.name_en || values.upazila,
        unionName: union ? union.name_en : null,
        // Pass real GPS if captured; createBloodRequest falls back to
        // district/upazila centroid when this is null.
        lat: userGps?.lat ?? null,
        lng: userGps?.lng ?? null,
        hospitalName: values.hospitalName,
        hospitalAddress: values.hospitalAddress,
        contactNumber: values.contactNumber,
        alternativeNumber: values.alternativeNumber || null,
        whatsappNumber: values.whatsappNumber || null,
        reason: values.reason || null,
        patientHbLevel: values.patientHbLevel ?? null,
        status: "active",
        ipAddress,
        userAgent,
      });

      // Auto-trigger donor matching for urgent/critical requests.
      // Critical requests notify top 10 matches; urgent requests notify top 5.
      if (
        requestId &&
        (values.urgencyLevel === "urgent" || values.urgencyLevel === "critical")
      ) {
        try {
          const matchLimit =
            values.urgencyLevel === "critical" ? 10 : 5;
          const matches = (await serverFindMatchingDonors(
            values.bloodGroup,
            district.name_en,
            upazila.name_en,
            values.urgencyLevel,
            matchLimit,
            userGps?.lat ?? null,
            userGps?.lng ?? null,
          )) as any[];

          if (matches && matches.length > 0) {
            await serverRecordDonorMatches(
              requestId,
              matches,
              "sms",
            );
            toast.info(
              `🚨 Auto-matched ${matches.length} donor${matches.length === 1 ? "" : "s"} — notifications sent.`,
            );
          }
        } catch (matchErr) {
          console.error("Auto-matching failed (non-blocking):", matchErr);
        }
      }

      // Fetch the generated tracking code (e.g. REQ-AB12CD) so the submitter
      // can follow the request status on the public tracking page.
      let trackingCode: string | null = null;
      if (requestId) {
        const created = (await serverGetBloodRequestById(requestId).catch(() => null)) as any;
        trackingCode = created?.tracking_code || null;
      }

      notification.bloodRequestCreated("req-" + Date.now());

      if (trackingCode) {
        setSubmitted({
          id: requestId,
          trackingCode,
          registerUrl: currentUser
            ? null
            : `/register?requestData=${encodeURIComponent(
                JSON.stringify({
                  fullName: values.patientName,
                  phone: values.contactNumber,
                  bloodGroup: values.bloodGroup,
                }),
              )}`,
        });
      } else {
        toast.success(
          t("success") || "Blood request submitted successfully!",
          {
            action: {
              label: "Create Account",
              onClick: () => {
                const requestData = encodeURIComponent(JSON.stringify({
                  fullName: values.patientName,
                  phone: values.contactNumber,
                  bloodGroup: values.bloodGroup,
                }));
                router.push(`/register?requestData=${requestData}`);
              },
            },
          }
        );
        router.push("/requests");
      }
    } catch (error: any) {
      console.error("Blood request submission error:", error);
      toast.error(error.message || "Failed to submit request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencySOS = async (data: any) => {
    try {
      // Resolve the authenticated user (if any). Anonymous emergency
      // submissions remain allowed — requester_id is nullable.
      const currentUser = await serverGetCurrentUser().catch(() => null);

      const requestId = await serverCreateBloodRequest({
        requesterId: currentUser?.id ?? null,
        requesterType: currentUser ? "user" : "guest",
        patientName: data.patientName || "Emergency Patient",
        patientAge: data.patientAge || 0,
        bloodGroup: data.bloodGroup || "O+",
        unitsNeeded: 1,
        urgencyLevel: "critical",
        whenNeeded: "now",
        neededDate: null,
        neededTime: null,
        district: data.location || "Unknown",
        upazila: "Emergency",
        // Persist real GPS coordinates captured by EmergencySOS so the
        // request can be mapped. Falls back to Rangpur center if absent.
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        hospitalName: "Emergency - See Location",
        hospitalAddress: data.location || "Location shared via GPS",
        contactNumber: data.contactNumber,
        alternativeNumber: null,
        reason: `🚨 EMERGENCY SOS: ${data.urgencyReason || "Urgent blood needed"}`,
        status: "active",
        // Flags the email dispatch to use SOS targeting: all eligible
        // same-blood-group donors in this zila + upazila (cap 40) get an
        // emergency-level email, recorded as notification_method='email_sos'.
        isEmergencySos: true,
      });

      // Auto-trigger donor matching for emergency SOS requests.
      // Top 10 eligible donors are matched and notified immediately.
      if (requestId) {
        try {
          const matches = (await serverFindMatchingDonors(
            data.bloodGroup || "O+",
            data.location,
            undefined,
            "critical",
            10,
            data.lat ?? null,
            data.lng ?? null,
          )) as any[];

          if (matches && matches.length > 0) {
            await serverRecordDonorMatches(requestId, matches, "sms");
            toast.success(
              `🚨 ${matches.length} donor${matches.length === 1 ? "" : "s"} matched and notified!`,
            );
          } else {
            toast.warning(
              "No eligible donors found nearby. Admin has been alerted.",
            );
          }
        } catch (matchErr) {
          console.error("Emergency auto-matching failed:", matchErr);
          toast.error("Auto-matching failed — admin will handle manually.");
        }
      }

      notification.emergencyAlert(
        data.bloodGroup,
        data.location || "Unknown location",
      );
      setShowSOS(false);
      router.push("/requests");
    } catch (error: any) {
      console.error("SOS error:", error);
      notification.error("Failed to send emergency alert. Please try again.");
    }
  };

  const copyTrackingCode = async () => {
    if (!submitted) return;
    try {
      await navigator.clipboard.writeText(submitted.trackingCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Emergency SOS Modal - Lazy Loaded */}
      {showSOS && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-3xl p-8 shadow-xl">
                <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto" />
              </div>
            </div>
          }
        >
          <EmergencySOS
            onEmergencySubmit={handleEmergencySOS}
            onCancel={() => setShowSOS(false)}
          />
        </Suspense>
      )}

      {/* Submission success dialog — shows the tracking code + copy + track */}
      {submitted && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center">
            <button
              onClick={() => {
                setSubmitted(null);
                router.push("/requests");
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-9 h-9 text-emerald-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              {isBn ? "রক্তের অনুরোধ সফলভাবে জমা হয়েছে!" : "Blood request submitted successfully!"}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {isBn
                ? "আপনার অনুরোধ এখন সক্রিয়। ট্র্যাকিং কোডটি সংরক্ষণ করুন এবং নিচের মাধ্যমে এটি অনুসরণ করুন।"
                : "Your request is now live. Save this tracking code and follow its status anytime."}
            </p>

            {/* Tracking code + copy */}
            <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-6">
              <span className="font-mono text-lg font-bold text-slate-800 tracking-wide">
                #{submitted.trackingCode}
              </span>
              <button
                onClick={copyTrackingCode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  codeCopied
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600"
                }`}
              >
                {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {codeCopied ? (isBn ? "কপি হয়েছে" : "Copied") : (isBn ? "কপি করুন" : "Copy")}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <Link
                href={`/${locale}/track/${submitted.trackingCode}`}
                onClick={() => setSubmitted(null)}
                className="inline-flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
              >
                <ClipboardPaste className="w-4 h-4" />
                {isBn ? "অনুরোধ ট্র্যাক করুন" : "Track This Request"}
              </Link>
              <button
                onClick={() => {
                  setSubmitted(null);
                  router.push("/requests");
                }}
                className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                {isBn ? "সম্পন্ন" : "Done"}
              </button>
              {submitted.registerUrl && (
                <Link
                  href={submitted.registerUrl}
                  onClick={() => setSubmitted(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors py-1"
                >
                  {isBn ? "এই অনুরোধ পরিচালনা করতে একটি অ্যাকাউন্ট তৈরি করুন" : "Create an account to manage this request"}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <main
        id="main-content"
        role="main"
        className="flex-grow max-w-3xl mx-auto w-full px-4 py-8 sm:py-12"
      >
        <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-xl border border-slate-100">
          {/* Emergency Button */}
          <div className="mb-6 flex flex-col items-end gap-1.5">
            <button
              onClick={() => setShowSOS(true)}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-all animate-pulse shadow-lg shadow-red-200"
            >
              <AlertTriangle className="w-5 h-5" />
              🚨 EMERGENCY SOS
            </button>
            <p className="text-[11px] text-slate-400 text-right max-w-[260px] leading-snug">
              Only for life-threatening emergencies requiring blood immediately. If not urgent, use the form below — it&apos;s okay.
            </p>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
              <HeartPulse className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {t("title")}
              </h1>
              <p className="text-slate-500">{t("subtitle")}</p>
            </div>
          </div>

          {/* AI Smart Helper — collapsible advisory card (advisory only) */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setAiHelperExpanded((v) => !v)}
              aria-expanded={aiHelperExpanded}
              className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 text-left hover:bg-slate-50/60 transition-colors"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white shrink-0">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm sm:text-base font-semibold text-slate-900 truncate">
                    {tAi("ai_helper_title")}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">
                    {tAi(
                      aiHelperExpanded
                        ? "ai_helper_collapse"
                        : "ai_helper_expand",
                    )}
                  </span>
                </span>
              </span>
              {aiHelperExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
              )}
            </button>

            {aiHelperExpanded && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 border-t border-slate-100">
                {/* Provider badge + status */}
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  {aiAnalyzing ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {isBn ? "বিশ্লেষণ করা হচ্ছে…" : "Analyzing…"}
                    </span>
                  ) : aiAnalysis ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        aiAnalysis.provider === "rules"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      {aiAnalysis.provider === "rules"
                        ? tAi("badge_rules")
                        : tAi("badge_ai")}
                    </span>
                  ) : null}
                </div>

                {/* Error state */}
                {aiError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                {/* Analysis results */}
                {aiAnalysis && !aiError && (
                  <>
                    {/* Match success rate + estimated wait */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                          aiAnalysis.matchSuccessRate === "high"
                            ? "bg-green-100 text-green-700"
                            : aiAnalysis.matchSuccessRate === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {tAi(
                          aiAnalysis.matchSuccessRate === "high"
                            ? "match_rate_high"
                            : aiAnalysis.matchSuccessRate === "medium"
                              ? "match_rate_medium"
                              : "match_rate_low",
                        )}
                      </span>
                      {aiAnalysis.estimatedWaitTime && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                          <Clock className="w-4 h-4" />
                          <span className="text-slate-500">
                            {tAi("estimated_wait")}:
                          </span>
                          <span>{aiAnalysis.estimatedWaitTime}</span>
                        </span>
                      )}
                    </div>

                    {/* Reason text */}
                    {aiAnalysis.matchSuccessReason && (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {aiAnalysis.matchSuccessReason}
                      </p>
                    )}

                    {/* Urgency suggestion (only if different from selection) */}
                    {aiAnalysis.suggestedUrgency &&
                      aiAnalysis.suggestedUrgency !== selectedUrgency && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-semibold">
                              {tAi("urgency_suggestion")}:{" "}
                              {t(aiAnalysis.suggestedUrgency)}
                            </p>
                            {aiAnalysis.urgencyReason && (
                              <p className="text-xs text-amber-700 mt-0.5">
                                {aiAnalysis.urgencyReason}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Tips list */}
                    {aiAnalysis.tips && aiAnalysis.tips.length > 0 && (
                      <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 mb-2">
                          <Lightbulb className="w-4 h-4" />
                          {isBn ? "টিপস" : "Tips"}
                        </p>
                        <ul className="space-y-1.5">
                          {aiAnalysis.tips.map((tip, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm text-slate-700"
                            >
                              <span className="text-indigo-400 mt-0.5 shrink-0">
                                •
                              </span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {/* Empty state while not analyzing and no result yet */}
                {!aiAnalyzing && !aiAnalysis && !aiError && (
                  <p className="text-xs text-slate-500 pt-2">
                    {isBn
                      ? "আপনার ফর্মের তথ্য অনুযায়ী পরামর্শ এখানে দেখা যাবে।"
                      : "Suggestions based on your form input will appear here."}
                  </p>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Saved patient one-click picker */}
            {savedPatients.length > 0 && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold text-blue-800 mb-2">
                  {isBn
                    ? "সংরক্ষিত রোগী নির্বাচন করুন:"
                    : "Pick a saved patient:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {savedPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setValue("patientName", p.name);
                        if (p.age != null) setValue("patientAge", p.age);
                        if (p.blood_group) setValue("bloodGroup", p.blood_group);
                        if (p.condition_note) setValue("reason", p.condition_note);
                        toast.success(
                          isBn ? `${p.name} নির্বাচিত` : `${p.name} selected`,
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-blue-300 text-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors active:scale-95"
                    >
                      {p.blood_group && (
                        <span className="text-red-600 font-black">
                          {p.blood_group}
                        </span>
                      )}
                      {p.name}
                      {p.relation && (
                        <span className="text-blue-400 font-medium capitalize">
                          · {p.relation}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("patient_name")}
                </label>
                <input
                  {...register("patientName")}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder={t("patient_name")}
                />
                {errors.patientName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.patientName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("patient_age")}
                </label>
                <input
                  {...register("patientAge", { valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder={t("patient_age")}
                />
                {errors.patientAge && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.patientAge.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("blood_group")}
                </label>
                <select
                  {...register("bloodGroup")}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                >
                  <option value="">{t("select_group")}</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ),
                  )}
                </select>
                {errors.bloodGroup && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.bloodGroup.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("units_needed")}
                </label>
                <input
                  {...register("unitsNeeded", { valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="1"
                />
                {errors.unitsNeeded && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.unitsNeeded.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("patient_hb_level")}
                </label>
                <input
                  {...register("patientHbLevel", { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="e.g. 12.5"
                />
                <p className="text-slate-400 text-[11px] mt-1">{t("patient_hb_hint")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("urgency_level")}
                </label>
                <select
                  {...register("urgencyLevel")}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                >
                  <option value="normal">{t("normal")}</option>
                  <option value="urgent">{t("urgent")}</option>
                  <option value="critical">{t("critical")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("when_needed")}
                </label>
                <select
                  {...register("whenNeeded")}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                >
                  <option value="now">{t("now")}</option>
                  <option value="today">{t("today")}</option>
                  <option value="tomorrow">{t("tomorrow")}</option>
                  <option value="day_after">{t("day_after")}</option>
                  <option value="specific_date">{t("specific_date")}</option>
                </select>
              </div>
            </div>

            {(whenNeeded === "specific_date" ||
              whenNeeded === "today" ||
              whenNeeded === "tomorrow" ||
              whenNeeded === "day_after") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {whenNeeded === "specific_date" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t("date")}
                    </label>
                    <input
                      {...register("neededDate")}
                      type="date"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t("preferred_time")}
                  </label>
                  <input
                    {...register("neededTime")}
                    type="time"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="--:-- --"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t("time_hint") ||
                      `Select preferred time for ${whenNeeded.replace("_", " ")}`}
                  </p>
                </div>
              </div>
            )}

            {/* Location Section */}
            <div className="space-y-4 pt-4 border-t border-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                {t("location_info")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t("district")}
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                  >
                    <option value="">{t("select_district")}</option>
                    {RANGPUR_DISTRICTS.map((district) => (
                      <option key={district.id} value={district.id}>
                        {locale === "bn" ? district.name_bn : district.name_en}
                      </option>
                    ))}
                  </select>
                  {errors.district && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.district.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t("upazila")}
                  </label>
                  <select
                    {...register("upazila")}
                    onChange={(e) => { setValue("upazila", e.target.value); setValue("union", ""); }}
                    disabled={!selectedDistrict}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">{t("select_upazila")}</option>
                    {availableUpazilas.map((upazila) => (
                      <option key={upazila.id} value={upazila.id}>
                        {locale === "bn" ? upazila.name_bn : upazila.name_en}
                      </option>
                    ))}
                  </select>
                  {errors.upazila && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.upazila.message}
                    </p>
                  )}
                </div>
                {availableUnions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {t("union")}
                    </label>
                    <select
                      {...register("union")}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                    >
                      <option value="">{t("select_union")}</option>
                      {availableUnions.map((union) => (
                        <option key={union.id} value={union.id}>
                          {locale === "bn" ? union.name_bn : union.name_en}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Location search + map picker for precise location */}
              <div className="space-y-3">
                {/* GPS status indicator — no duplicate button, the map has its own */}
                {userGps && (
                  <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {userGps.label || `${userGps.lat.toFixed(4)}, ${userGps.lng.toFixed(4)}`}
                    </span>
                  </div>
                )}

                {/* Detailed location breakdown from reverse geocoding */}
                {geoDetail && (
                  <div className="p-2.5 bg-green-50 rounded-xl border border-green-200">
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

                {/* Location search bar — live debounced search + keyboard nav,
                    unified with the homepage & map page search bars. */}
                <div className="relative" ref={placeContainerRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {isBn
                      ? "স্থান খুঁজুন (বাংলা / English / Banglish)"
                      : "Search location (Bangla / English / Banglish)"}
                  </label>
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
                        placeholder={
                          isBn
                            ? "যেমন: রংপুর সদর, saidpur, lalmonirhat, RMCH..."
                            : "e.g. Rangpur Sadar, saidpur, lalmonirhat, RMCH..."
                        }
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm transition-all"
                      />
                      {/* Clear button */}
                      {placeQuery && !placeSearching && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlaceQuery("");
                            setPlaceResults([]);
                            setPlaceError(null);
                            setShowPlaceResults(false);
                            setSelectedIdx(-1);
                            if (placeAbortRef.current)
                              placeAbortRef.current.abort();
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          aria-label={isBn ? "মুছুন" : "Clear"}
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
                      {/* Live-search spinner (replaces clear button while searching) */}
                      {placeSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-red-500" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (placeDebounceRef.current)
                          clearTimeout(placeDebounceRef.current);
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
                      <span className="hidden sm:inline">
                        {isBn ? "খুঁজুন" : "Search"}
                      </span>
                    </button>
                  </div>

                  {/* Helper hint line — shows live-status while typing */}
                  {placeQuery.trim().length > 0 &&
                    placeQuery.trim().length < 2 && (
                      <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {isBn
                          ? "আরও একটি অক্ষর লিখুন..."
                          : "Type one more character to search..."}
                      </p>
                    )}

                  {/* Search results dropdown — live, with keyboard highlight + type chips */}
                  {showPlaceResults &&
                    (placeResults.length > 0 ||
                      placeError ||
                      placeSearching) && (
                      <div
                        style={{
                          animation:
                            "request-search-dropdown-in 0.15s ease-out",
                        }}
                        className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-72 overflow-y-auto"
                      >
                        {placeSearching && placeResults.length === 0 && (
                          <div className="p-3 text-sm text-slate-500 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                            <span>
                              {isBn
                                ? "AI স্থান খুঁজছি..."
                                : "AI searching location..."}
                            </span>
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
                          const typeLabel = placeTypeLabel(place, isBn);
                          const typeColor = placeTypeColor(place);
                          return (
                            <button
                              key={
                                place.placeId ??
                                `${place.lat}-${place.lng}-${idx}`
                              }
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handlePickPlace(place);
                              }}
                              onMouseEnter={() => setSelectedIdx(idx)}
                              className={`w-full text-left px-3 py-2.5 border-b border-slate-100 last:border-b-0 transition-colors ${
                                isSelected
                                  ? "bg-red-50"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <MapPin
                                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                                    isSelected
                                      ? "text-red-600"
                                      : "text-red-500"
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
                  @keyframes request-search-dropdown-in {
                    0% { opacity: 0; transform: translateY(-6px); }
                    100% { opacity: 1; transform: translateY(0); }
                  }
                `}</style>

                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Crosshair className="w-3 h-3" />
                  {isBn
                    ? "সার্চ করুন, অথবা ম্যাপ খুলে পিন করুন — জেলা/উপজেলা অটো-ফিল হবে, ভুল হলে ম্যানুয়ালি ঠিক করতে পারেন"
                    : "Search above, or open the map to pin the spot — district/upazila auto-fill but you can manually fix them"}
                </p>

                {/* Collapsible map toggle — keeps the form compact by default.
                    The map (and its Leaflet tiles) only mount when expanded. */}
                <button
                  type="button"
                  onClick={() => setMapExpanded((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  aria-expanded={mapExpanded}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800 truncate">
                        {mapExpanded
                          ? isBn
                            ? "ম্যাপ বন্ধ করুন"
                            : "Close map"
                          : isBn
                            ? "ম্যাপ খুলুন"
                            : "Open map"}
                      </span>
                      <span className="block text-xs text-slate-500 truncate">
                        {userGps
                          ? pickedLocationName ||
                            (isBn
                              ? "অবস্থান নির্বাচিত হয়েছে"
                              : "Location pinned")
                          : isBn
                            ? "ম্যাপে ক্লিক করে হাসপাতালের অবস্থান চিহ্নিত করুন"
                            : "Click on the map to pin the hospital location"}
                      </span>
                    </span>
                  </span>
                  {mapExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {/* Clickable Map Picker — only rendered when expanded so
                    Leaflet tiles don't load until the user asks for them. */}
                {mapExpanded && (
                  <>
                    <LocationPickerMap
                      label={
                        isBn
                          ? "হাসপাতাল / রক্তের প্রয়োজনীয় স্থান চিহ্নিত করুন"
                          : "Pin Hospital / Blood Needed Location"
                      }
                      hint={
                        isBn
                          ? "ম্যাপে ক্লিক করে পিন সরান, টেনে ফাইন-টিউন করুন, অথবা 'Use My Location' ব্যবহার করুন।"
                          : "Click the map to reposition the pin. Drag to fine-tune, or use 'Use My Location'."
                      }
                      height={220}
                      showLocateButton={true}
                      showCoordinates={true}
                      initialLat={userGps?.lat ?? null}
                      initialLng={userGps?.lng ?? null}
                      flyTrigger={flyTrigger}
                      onLocationChange={handleMapPin}
                      onUseMyLocation={handleUseMyLocation}
                      locating={gpsLoading}
                      locationName={pickedLocationName}
                    />

                    {/* Helper actions row — visible whenever a location is set.
                        The Google Maps link opens directions in a new tab; the
                        "Paste to Address" button copies the pinned location
                        name into the Hospital Address field below. */}
                    {userGps && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${userGps.lat},${userGps.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-all"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            {isBn ? "গুগল ম্যাপে খুলুন" : "Open in Google Maps"}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              if (userGps?.label) {
                                setValue("hospitalAddress", userGps.label, {
                                  shouldValidate: true,
                                });
                                setHospitalAddressTouched(true);
                                toast.success(
                                  isBn
                                    ? "হাসপাতালের ঠিকানা ম্যাপ থেকে সেট করা হয়েছে"
                                    : "Hospital address set from map location",
                                );
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-all"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5" />
                            {isBn ? "ঠিকানায় পেস্ট করুন" : "Paste to Address"}
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        {/* Helper note — tells the user they can also go to
                            Google Maps, copy a location there, and paste it
                            into the Hospital Address field below. */}
                        <p className="text-[11px] text-slate-500 flex items-start gap-1.5 leading-snug">
                          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                          <span>
                            {isBn
                              ? "গুগল ম্যাপে গিয়ে কোনো ঠিকানা কপি করে নিচের হাসপাতালের ঠিকানা ঘরে পেস্ট করতে পারেন।"
                              : "You can also go to Google Maps, copy a location, and paste it into the Hospital Address field below."}
                          </span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Hospital className="w-5 h-5 text-red-600" />
                {t("hospital_details")}
              </h3>
              <p className="text-xs text-slate-400 -mt-2">
                {isBn
                  ? "ম্যাপ বা সার্চ থেকে ঠিকানা অটো-পেস্ট হবে। আপনি নিজেও লিখতে পারেন — দুটোই একসাথে থাকবে।"
                  : "Map/search location auto-pastes here. You can also type your own text — both coexist."}
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("hospital_name")}
                </label>
                <input
                  {...register("hospitalName", {
                    onChange: () => setHospitalNameTouched(true),
                  })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder={t("hospital_name_placeholder")}
                />
                {errors.hospitalName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.hospitalName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("hospital_address")}
                </label>
                <textarea
                  {...register("hospitalAddress", {
                    onChange: () => setHospitalAddressTouched(true),
                  })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  rows={2}
                  placeholder={t("hospital_address_placeholder")}
                />
                {errors.hospitalAddress && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.hospitalAddress.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-red-600" />
                {t("reason_title")}
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("reason_label")}
                </label>
                <textarea
                  {...register("reason")}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  rows={3}
                  placeholder={t("reason_placeholder")}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Phone className="w-5 h-5 text-red-600" />
                {t("contact_info")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t("primary_contact")}
                  </label>
                  <input
                    {...register("contactNumber")}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="017XXXXXXXX"
                  />
                  {errors.contactNumber && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.contactNumber.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t("alternative_contact")}
                  </label>
                  <input
                    {...register("alternativeNumber")}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="018XXXXXXXX"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    {t("whatsapp_number")}
                  </label>
                  <input
                    {...register("whatsappNumber")}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="01XXXXXXXXX (WhatsApp)"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t("whatsapp_hint") ||
                      "Donors can contact you via WhatsApp"}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-200"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <HeartPulse className="w-5 h-5" />
              )}
              {t("submit")}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
