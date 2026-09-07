"use client";

import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import DonorCard from "@/components/donors/DonorCard";
import DonorDetailModal from "@/components/donors/DonorDetailModal";
import { CardGridSkeleton } from "@/components/ui/Skeleton";
import DonorEligibilityChecker from "@/components/donors/DonorEligibilityChecker";
import BloodCompatibilityGuide from "@/components/donors/BloodCompatibilityGuide";
import MapToggle, { MapViewMode } from "@/components/map/MapToggle";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Navigation,
  Heart,
  Droplets,
  Info,
  Loader2,
  Sparkles,
  MapPin,
  Map,
  X,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ModernSelect, { type SelectOption } from "@/components/ui/ModernSelect";
import { useLocale } from "next-intl";
import { fetchDonorsData } from "@/lib/public-reads";
import { serverParseSearchQuery } from "@/lib/ai/search-parser";

import { useUserLocation, haversineKm } from "@/hooks/use-user-location";
import AiThinkingBadge from "@/components/common/AiThinkingBadge";
import {
  RANGPUR_DISTRICTS,
  RANGPUR_UPAZILAS,
  getUpazilasByDistrict,
  getDistrictById,
  getUnionsByUpazila,
} from "@/lib/constants/rangpur";

// SSR-safe map load — Leaflet touches `window` at import.
const DonorMap = dynamic(() => import("@/components/map/DonorMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-3xl bg-slate-100 animate-pulse" />
  ),
}) as typeof import("@/components/map/DonorMap").default;

function DonorsContent() {
  const t = useTranslations("common");
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedUpazila, setSelectedUpazila] = useState("");
  const [selectedUnion, setSelectedUnion] = useState("");
  const [filterDonationType, setFilterDonationType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "donors" | "eligibility" | "compatibility"
  >("donors");
  const [sortByProximity, setSortByProximity] = useState(false);
  const [donors, setDonors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<MapViewMode>("list");
  const [highlightDonor, setHighlightDonor] = useState<any | null>(null);
  const router = useRouter();

  // Shared user location: GPS → localStorage cache → profile-set location.
  const {
    location: userLocation,
    placeName: userPlaceName,
    isLocating,
    error: locationError,
    requestLocation,
  } = useUserLocation();

  // AI search state — chips of what the AI understood + loading animation
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiChips, setAiChips] = useState<
    { type: "bloodGroup" | "district" | "upazila"; label: string; value: string }[]
  >([]);
  const [lastAiQuery, setLastAiQuery] = useState("");

  const locale = useLocale();
  const isBn = locale === "bn";

  const bloodGroups = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  /**
   * Called when a user clicks "View these donors" inside a donor cluster
   * popup on the map. Sets the upazila filter and switches back to list view
   * so the user can browse individual donor cards for that area.
   */
  const handleViewDonorsByUpazila = (upazilaLabel: string) => {
    // Match by display name; if no exact match, fall back to a case-insensitive
    // comparison against the available upazilas of the currently selected district.
    const allUpazilas = selectedDistrict
      ? getUpazilasByDistrict(selectedDistrict)
      : RANGPUR_DISTRICTS.flatMap((d) => getUpazilasByDistrict(d.id));
    const match = allUpazilas.find(
      (u) =>
        u.name_en === upazilaLabel ||
        u.name_en.toLowerCase() === upazilaLabel.toLowerCase() ||
        u.name_bn === upazilaLabel,
    );
    if (match) {
      // Ensure the parent district is selected so the upazila option is visible.
      if (!selectedDistrict) {
        const parent = RANGPUR_DISTRICTS.find((d) =>
          getUpazilasByDistrict(d.id).some((u) => u.id === match.id),
        );
        if (parent) setSelectedDistrict(parent.id);
      }
      setSelectedUpazila(match.id);
      setSelectedUnion("");
    }
    setViewMode("list");
  };

  const resolveDistrictId = (val: string): string => {
    if (!val) return "";
    const byId = RANGPUR_DISTRICTS.find((d) => d.id === val);
    if (byId) return byId.id;
    const byName = RANGPUR_DISTRICTS.find((d) => d.name_en === val);
    return byName ? byName.id : val;
  };

  const districtName = useMemo(() => {
    if (!selectedDistrict) return "";
    const d = getDistrictById(selectedDistrict);
    return d ? d.name_en : selectedDistrict;
  }, [selectedDistrict]);

  const upazilaName = useMemo(() => {
    if (!selectedUpazila || !selectedDistrict) return "";
    const upazilas = getUpazilasByDistrict(selectedDistrict);
    const u = upazilas.find((up) => up.id === selectedUpazila);
    return u ? u.name_en : selectedUpazila;
  }, [selectedUpazila, selectedDistrict]);

  const availableUpazilas = useMemo(() => {
    if (!selectedDistrict) return [];
    return getUpazilasByDistrict(selectedDistrict);
  }, [selectedDistrict]);

  const availableUnions = useMemo(() => {
    if (!selectedUpazila) return [];
    return getUnionsByUpazila(selectedUpazila);
  }, [selectedUpazila]);

  useEffect(() => {
    fetchDonors();
  }, []);

  // Presence polling — silently refetch every 30s when tab is visible
  // so online/offline status stays fresh without real-time infrastructure.
  useEffect(() => {
    const poll = async () => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") return;
      try {
        const data = await fetchDonorsData();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDonors(data);
      } catch {
        /* silent — don't disrupt the UI on poll failure */
      }
    };
    const interval = setInterval(poll, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const bg = searchParams.get("blood_group");
    const dist = searchParams.get("district");
    const upa = searchParams.get("upazila");
    const un = searchParams.get("union");
    const q = searchParams.get("q");
    if (bg && bg !== "All") setSelectedGroup(bg);
    if (dist) {
      setSelectedDistrict(resolveDistrictId(dist));
    }
    if (upa) {
      setSelectedUpazila(upa);
      // Auto-resolve parent district from upazila ID if district wasn't provided
      if (!dist) {
        const parentUpa = RANGPUR_UPAZILAS.find((u) => u.id === upa);
        if (parentUpa) {
          setSelectedDistrict(parentUpa.district_id);
        }
      }
    }
    if (un) setSelectedUnion(un);
    if (q) setSearchQuery(q);

    const hasFilters = bg || dist || upa || q;
    if (!hasFilters) {
      // Silent auto-detect: GPS → cache → profile location.
      requestLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, requestLocation]);

  // Nearest-first by default once any location is available (GPS or the
  // location the user set in their profile), unless they toggled it off.
  const proximityTouchedRef = useRef(false);
  useEffect(() => {
    if (userLocation && !proximityTouchedRef.current) {
      setSortByProximity(true);
    }
  }, [userLocation]);

  const fetchDonors = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDonorsData();
      setDonors(data);
    } catch (error) {
      console.error("Error fetching donors:", error);
    }
    setIsLoading(false);
  };

  // When the URL has ?donor=ID (e.g. from a shared link), find that donor
  // in the fetched list and pop up a detail modal with a close button.
  // If the donor isn't in the list (filtered out by eligibility/active filters),
  // fetch the donor directly by ID so the shared link always works.
  useEffect(() => {
    const donorId = searchParams.get("donor");
    if (!donorId) {
      setHighlightDonor(null);
      return;
    }
    if (isLoading) return;
    const numericId = Number(donorId);
    const found = donors.find((d) => d.id === numericId);
    if (found) {
      setHighlightDonor(found);
    } else if (donors.length > 0) {
      let cancelled = false;
      fetch(`/api/donors/${numericId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => {
          if (!cancelled && d && !d.error) setHighlightDonor(d);
        })
        .catch(() => {});
      return () => { cancelled = true; };
    }
  }, [searchParams, donors, isLoading]);

  const closeDonorModal = () => {
    setHighlightDonor(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("donor");
    const qs = params.toString();
    router.replace(qs ? `/${locale}/donors?${qs}` : `/${locale}/donors`);
  };

  const handleGetLocation = () => {
    proximityTouchedRef.current = true;
    if (sortByProximity && userLocation) {
      setSortByProximity(false); // toggle off
      return;
    }
    setSortByProximity(true);
    requestLocation(); // ask for a fresh real-time fix
  };

  /**
   * AI search (DeepSeek / GLM): understands English, Bangla and Banglish,
   * tolerates typos, auto-fills the blood-group/district/upazila filters and
   * rewrites the search box with the corrected remaining keywords.
   */
  const handleAiSearch = async () => {
    const q = searchQuery.trim();
    if (!q || q === lastAiQuery) return;
    setLastAiQuery(q);
    setIsAiLoading(true);
    try {
      const result = await serverParseSearchQuery(q);
      const chips: typeof aiChips = [];

      if (result.blood_group) {
        setSelectedGroup(result.blood_group);
        chips.push({ type: "bloodGroup", label: result.blood_group, value: result.blood_group });
      }
      if (result.district_id) {
        setSelectedDistrict(result.district_id);
        const d = getDistrictById(result.district_id);
        chips.push({ type: "district", label: d ? d.name_en : result.district_id, value: result.district_id });
      }
      if (result.upazila_id) {
        const upa = RANGPUR_UPAZILAS.find((u) => u.id === result.upazila_id);
        if (upa) {
          setSelectedDistrict(upa.district_id);
          setSelectedUpazila(upa.id);
          setSelectedUnion("");
          chips.push({ type: "upazila", label: upa.name_en, value: upa.id });
        }
      }
      setAiChips(chips);

      // Put the corrected remaining words back into the search bar.
      if (result.keywords !== undefined && result.keywords.trim() !== q) {
        setSearchQuery(result.keywords.trim());
      }

      // AI found a place → show the map.
      if (result.district_id || result.upazila_id) {
        setViewMode("map");
      }
    } catch (error) {
      console.error("AI search failed:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const removeAiChip = (chip: (typeof aiChips)[number]) => {
    setAiChips((prev) => prev.filter((c) => c !== chip));
    if (chip.type === "bloodGroup") setSelectedGroup("All");
    if (chip.type === "district") {
      setSelectedDistrict("");
      setSelectedUpazila(""); setSelectedUnion("");
    }
    if (chip.type === "upazila") setSelectedUpazila(""); setSelectedUnion("");
  };

  const filteredDonors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    // Split query into words for token-based matching
    const qWords = q.split(/\s+/).filter((w) => w.length >= 2);

    // Pre-compute distance from user location for each donor so we can both
    // sort by proximity AND pass the value to DonorCard for display.
    const useProximity = sortByProximity && !!userLocation;

    return donors
      .filter((donor) => {
        if (!donor.is_eligible) return false;

        // Multi-field text search: name (EN/BN), phone, district, upazila, address, hospital
        const nameEn = (donor.full_name_en || "").toLowerCase();
        const nameBn = donor.full_name_bn || "";
        const phone = (donor.phone || "").replace(/[\s\-()]/g, "");
        const dist = (donor.district || "").toLowerCase();
        const upa = (donor.upazila || "").toLowerCase();
        const addr = (donor.address || "").toLowerCase();
        const hospitalEn = (donor.hospital_name_en || "").toLowerCase();
        const hospitalBn = donor.hospital_name_bn || "";

        // Check against each possible field
        let matchesSearch = !q;
        if (q && !matchesSearch) {
          // Phone match: strip non-digits from query too for comparison
          const qDigits = q.replace(/\D/g, "");

          // Direct substring match across all fields
          const directMatch =
            nameEn.includes(q) ||
            nameBn.includes(q) ||
            dist.includes(q) ||
            upa.includes(q) ||
            addr.includes(q) ||
            hospitalEn.includes(q) ||
            hospitalBn.includes(q) ||
            (qDigits.length >= 3 && phone.includes(qDigits));

          // Token-based match: if any query word matches any field
          // (helps with "karim rangpur" → name contains "karim" OR district contains "rangpur")
          const tokenMatch = qWords.some((word) => {
            // Fuzzy: allow partial match on each token
            return (
              nameEn.includes(word) ||
              nameBn.includes(word) ||
              dist.includes(word) ||
              upa.includes(word) ||
              addr.includes(word) ||
              hospitalEn.includes(word) ||
              hospitalBn.includes(word) ||
              // Also try first 3 chars of each word as prefix match (typo tolerance)
              (word.length >= 4 && nameEn.startsWith(word.slice(0, 3))) ||
              (word.length >= 4 && dist.startsWith(word.slice(0, 3))) ||
              (word.length >= 4 && upa.startsWith(word.slice(0, 3)))
            );
          });

          matchesSearch = directMatch || tokenMatch;
        }

        const matchesGroup =
          selectedGroup === "All" ||
          (donor.blood_group || "").trim().toUpperCase() === selectedGroup.trim().toUpperCase();

        // District match: compare against stored name, ID-derived name, or partial
        let matchesDistrict = !selectedDistrict;
        if (selectedDistrict && !matchesDistrict) {
          const distTarget = districtName.toLowerCase();
          const distId = selectedDistrict.toLowerCase();
          matchesDistrict =
            dist === distTarget ||
            dist === distId ||
            dist.includes(distTarget) ||
            distTarget.includes(dist) ||
            // Also match if donor's district ID matches
            (donor.district_id && donor.district_id.toLowerCase() === distId);
        }

        // Upazila match: stored name might be "Sadar" but constant has "Rangpur Sadar",
        // so check both directions (includes) + ID match
        let matchesUpazila = !selectedUpazila;
        if (selectedUpazila && !matchesUpazila) {
          const upaTarget = upazilaName.toLowerCase();
          const upaId = selectedUpazila.toLowerCase();
          matchesUpazila =
            upa === upaTarget ||
            upa.includes(upaTarget) ||
            upaTarget.includes(upa) ||
            upa === upaId ||
            // Also match if donor's upazila ID matches
            (donor.upazila_id && donor.upazila_id.toLowerCase() === upaId);
        }

        // Union match: only relevant for Rangpur Sadar. donor.union_name is
        // stored as an ID (or display name); compare both ways.
        const unionVal = (donor.union_name || "").toLowerCase();
        let matchesUnion = !selectedUnion;
        if (selectedUnion && !matchesUnion) {
          const unionId = selectedUnion.toLowerCase();
          matchesUnion = unionVal === unionId || unionVal.includes(unionId);
        }

        const matchesDonationType =
          filterDonationType === "all" ||
          (filterDonationType === "whole_blood" &&
            donor.eligible_whole_blood) ||
          (filterDonationType === "platelets" && donor.eligible_platelets) ||
          (filterDonationType === "plasma" && donor.eligible_plasma);

        // Status filter — quick toggles for common donor availability states.
        // - "available"   : donor can donate at least one type right now (not in cooldown)
        // - "active"      : donor has opted in as active (is_active = true)
        // - "hb_eligible" : donor has a recorded Hb level in the eligible range
        // - "frequent"    : donor has made 5+ lifetime donations
        const eligibleCount = donor.eligible_types_count ?? 0;
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "available" && eligibleCount > 0) ||
          (filterStatus === "active" && donor.is_active) ||
          (filterStatus === "hb_eligible" && donor.hb_status === "eligible") ||
          (filterStatus === "frequent" && (donor.total_donations || 0) >= 5);

        return (
          matchesSearch &&
          matchesGroup &&
          matchesDistrict &&
          matchesUpazila &&
          matchesUnion &&
          matchesDonationType &&
          matchesStatus
        );
      })
      .map((donor) => {
        // Attach distance from user location when proximity is active.
        // All donors have resolved lat/lng (stored → upazila centroid → district centroid).
        const distance_km = useProximity
          ? haversineKm(userLocation!.lat, userLocation!.lng, donor.lat, donor.lng)
          : null;
        return { ...donor, _distanceKm: distance_km };
      })
      .sort((a, b) => {
        if (useProximity) {
          // Pure haversine distance naturally gives the tiered order the user
          // wants: nearest upazila → same zila → other zilas, because donors
          // in closer upazilas are physically nearer.
          return (a._distanceKm ?? Infinity) - (b._distanceKm ?? Infinity);
        }
        return (b.total_donations || 0) - (a.total_donations || 0);
      });
  }, [
    donors,
    searchQuery,
    selectedGroup,
    selectedDistrict,
    selectedUpazila,
    selectedUnion,
    filterDonationType,
    filterStatus,
    districtName,
    upazilaName,
    sortByProximity,
    userLocation,
  ]);

  const handleDistrictChange = (value: string) => {
    setSelectedDistrict(value);
    setSelectedUpazila(""); setSelectedUnion("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main
        id="main-content"
        role="main"
        className="flex-grow max-w-7xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4 md:py-6"
      >
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-0.5">
              {t("donors")}
            </h1>
            <p className="text-xs text-slate-500">
              {isBn
                ? "রংপুর বিভাগে আপনার কাছের রক্তদাতা খুঁজুন।"
                : "Find life-saving blood donors near you in Rangpur division."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {sortByProximity && userLocation && (
              <div className="flex items-center gap-1.5 text-xs md:text-sm text-green-600 bg-green-50 px-2.5 md:px-3 py-1.5 rounded-full">
                <Navigation className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {isBn
                  ? `কাছের রক্তদাতা আগে${userPlaceName ? ` · ${userPlaceName}` : ""}`
                  : `Showing nearest donors first${userPlaceName ? ` · ${userPlaceName}` : ""}`}
              </div>
            )}
            <MapToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-3 md:mb-5 space-y-3">
          {/* Row 1: Search + District + Upazila + Near Me */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  isBn
                    ? "নাম, ফোন, এলাকা লিখুন… যেমন: \"ও পজিটিভ রংপুর\""
                    : 'Search in English/Bangla/Banglish… e.g. "O+ rangpur"'
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim() === "") {
                    setAiChips([]);
                    setLastAiQuery("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAiSearch();
                }}
                className="pl-9 pr-16 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none w-full text-sm bg-white"
                aria-label="Search donors by name, phone, or location"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <AiThinkingBadge loading={isAiLoading} />
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <ModernSelect
                value={selectedDistrict}
                onChange={(v) => { setSelectedDistrict(v); setSelectedUpazila(""); setSelectedUnion(""); }}
                options={RANGPUR_DISTRICTS.map((d) => ({
                  value: d.id,
                  label: d.name_en,
                  labelBn: d.name_bn,
                }))}
                placeholder="All Districts"
                variant="location"
                locale={locale as "en" | "bn"}
                searchable
                clearable
                className="flex-1 min-w-[45%] sm:min-w-[140px] sm:flex-none"
                label=""
              />
              <ModernSelect
                value={selectedUpazila}
                onChange={(v) => { setSelectedUpazila(v); setSelectedUnion(""); }}
                options={availableUpazilas.map((u) => ({
                  value: u.id,
                  label: u.name_en,
                  labelBn: u.name_bn,
                }))}
                placeholder="All Upazilas"
                variant="location"
                locale={locale as "en" | "bn"}
                searchable
                clearable
                disabled={!selectedDistrict}
                className="flex-1 min-w-[45%] sm:min-w-[140px] sm:flex-none"
                label=""
              />
              {availableUnions.length > 0 && (
                <ModernSelect
                  value={selectedUnion}
                  onChange={setSelectedUnion}
                  options={availableUnions.map((u) => ({
                    value: u.id,
                    label: u.name_en,
                    labelBn: u.name_bn,
                  }))}
                  placeholder="All Unions"
                  variant="location"
                  locale={locale as "en" | "bn"}
                  searchable
                  clearable
                  className="flex-1 min-w-[45%] sm:min-w-[140px] sm:flex-none"
                  label=""
                />
              )}
              <button
                onClick={handleGetLocation}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${
                  sortByProximity
                    ? "border-green-300 bg-green-50 text-green-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50/50"
                }`}
                aria-label="Sort by proximity"
                aria-pressed={sortByProximity}
              >
                {isLocating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                {isBn ? "কাছের" : "Near Me"}
              </button>
            </div>
          </div>

          {/* AI understood chips — what the AI extracted from your query */}
          {aiChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 text-[10px] font-bold select-none">
                <Sparkles className="w-2.5 h-2.5" />
                {isBn ? "AI বুঝেছে" : "AI matched"}
              </span>
              {aiChips.map((chip) => (
                <span
                  key={`${chip.type}-${chip.value}`}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold ${
                    chip.type === "bloodGroup"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : chip.type === "district"
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-sky-200 bg-sky-50 text-sky-700"
                  }`}
                >
                  {chip.type === "bloodGroup" ? (
                    <Droplets className="w-3 h-3" />
                  ) : (
                    <MapPin className="w-3 h-3" />
                  )}
                  {chip.label}
                  <button
                    onClick={() => removeAiChip(chip)}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
                    aria-label={`Remove ${chip.label} filter`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => {
                  setAiChips([]);
                  setSelectedGroup("All");
                  setSelectedDistrict("");
                  setSelectedUpazila(""); setSelectedUnion("");
                }}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline underline-offset-2 ml-1 transition-colors"
              >
                {isBn ? "সব মুছুন" : "Clear all"}
              </button>
            </div>
          )}

          {locationError && sortByProximity && (
            <p className="text-xs text-red-500">{locationError}</p>
          )}

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Row 2: Blood Group Pills */}
          <div
            className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide"
            role="group"
            aria-label="Filter by blood group"
          >
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap mr-0.5 uppercase tracking-wider">
              {isBn ? "রক্ত:" : "Blood:"}
            </span>
            {bloodGroups.map((group) => (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  selectedGroup === group
                    ? "bg-red-600 text-white shadow-md shadow-red-200 scale-[1.02]"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-red-300 hover:bg-red-50"
                }`}
                aria-pressed={selectedGroup === group}
              >
                {group}
              </button>
            ))}
          </div>

          {/* Row 3: Donation Type Filter */}
          <div
            className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide"
            role="group"
            aria-label="Filter by donation type"
          >
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap mr-0.5 uppercase tracking-wider">
              {isBn ? "ধরন:" : "Type:"}
            </span>
            {[
              { value: "all", label: "All Types", labelBn: "সব ধরনের" },
              { value: "whole_blood", label: "Whole Blood", labelBn: "সম্পূর্ণ রক্ত" },
              { value: "platelets", label: "Platelets", labelBn: "প্লাটিলেট" },
              { value: "plasma", label: "Plasma", labelBn: "প্লাজমা" },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setFilterDonationType(type.value)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  filterDonationType === type.value
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 scale-[1.02]"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                }`}
                aria-pressed={filterDonationType === type.value}
              >
                {isBn ? type.labelBn : type.label}
              </button>
            ))}
          </div>

          {/* Row 4: Status / Availability Filter */}
          <div
            className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide"
            role="group"
            aria-label="Filter by donor status"
          >
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap mr-0.5 uppercase tracking-wider">
              {isBn ? "অবস্থা:" : "Status:"}
            </span>
            {[
              { value: "all", label: "All Donors", labelBn: "সকল" },
              { value: "available", label: "Available Now", labelBn: "এখন উপলব্ধ" },
              { value: "active", label: "Active", labelBn: "সক্রিয়" },
              { value: "hb_eligible", label: "Hb Eligible", labelBn: "Hb যোগ্য" },
              { value: "frequent", label: "Frequent (5+)", labelBn: "নিয়মিত (৫+)" },
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => setFilterStatus(status.value)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  filterStatus === status.value
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-[1.02]"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
                }`}
                aria-pressed={filterStatus === status.value}
              >
                {isBn ? status.labelBn : status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation for Tools */}
        <div
          className="mb-4 md:mb-6 flex flex-wrap gap-1 sm:gap-2 border-b border-slate-200 pb-2 md:pb-3 overflow-x-auto scrollbar-hide"
          role="tablist"
        >
          <button
            onClick={() => setActiveTab("donors")}
            className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
              activeTab === "donors"
                ? "bg-red-600 text-white shadow-lg shadow-red-200"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
            role="tab"
            aria-selected={activeTab === "donors"}
          >
            <Heart className="w-3.5 h-3.5" />
            {isBn ? "রক্তদাতা খুঁজুন" : "Find Donors"}
            <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === "donors" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {filteredDonors.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("eligibility")}
            className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
              activeTab === "eligibility"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
            role="tab"
            aria-selected={activeTab === "eligibility"}
          >
            <Info className="w-3.5 h-3.5" />
            {isBn ? "যোগ্যতা যাচাই" : "Eligibility"}
          </button>
          <button
            onClick={() => setActiveTab("compatibility")}
            className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
              activeTab === "compatibility"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
            role="tab"
            aria-selected={activeTab === "compatibility"}
          >
            <Droplets className="w-3.5 h-3.5" />
            {isBn ? "রক্তের সামঞ্জস্যতা" : "Compatibility"}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "donors" && (
            <motion.div
              key="donors-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              role="tabpanel"
            >
              {isLoading ? (
                <CardGridSkeleton count={6} />
              ) : viewMode === "map" ? (
                <>
                  <DonorMap
                    donors={filteredDonors}
                    height={500}
                    onViewDonors={handleViewDonorsByUpazila}
                  />
                  {filteredDonors.length === 0 && (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Map className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {isBn ? "মানচিত্রে কোনো রক্তদাতা নেই" : "No donors to display on map"}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {isBn ? "ফিল্টার পরিবর্তন করে দেখুন।" : "Try adjusting your filters."}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {filteredDonors.length > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-slate-500">
                        {isBn ? "মোট" : "Showing"}{" "}
                        <span className="font-semibold text-slate-900">{filteredDonors.length}</span>{" "}
                        {isBn
                          ? `জন রক্তদাতা${filteredDonors.length > 1 ? "" : ""} পাওয়া গেছে`
                          : `donor${filteredDonors.length !== 1 ? "s" : ""} found`}
                      </p>
                      {(searchQuery || selectedGroup !== "All" || selectedDistrict || filterDonationType !== "all" || filterStatus !== "all") && (
                        <button
                          onClick={() => {
                            setSearchQuery(""); setSelectedGroup("All"); setSelectedDistrict("");
                            setSelectedUpazila(""); setSelectedUnion(""); setFilterDonationType("all"); setFilterStatus("all");
                            setAiChips([]); setLastAiQuery("");
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          {isBn ? "ফিল্টার মুছুন" : "Clear filters"}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {filteredDonors.map((donor, i) => (
                    <DonorCard
                      key={donor.id || i}
                      donor={{
                        id: donor.id,
                        full_name: donor.full_name_en || donor.full_name_bn,
                        blood_group: donor.blood_group,
                        district: donor.district,
                        upazila: donor.upazila,
                        total_donations: donor.total_donations || 0,
                        is_active: donor.is_active,
                        is_eligible: donor.is_eligible,
                        next_eligible_date: donor.next_eligible_date,
                        donation_type: donor.donation_type || "whole_blood",
                        eligible_whole_blood: donor.eligible_whole_blood,
                        eligible_platelets: donor.eligible_platelets,
                        eligible_plasma: donor.eligible_plasma,
                        eligible_types_count: donor.eligible_types_count,
                        badges: donor.badges || [],
                        phone: donor.phone,
                        avatar_url: donor.avatar_url,
                        total_referrals: donor.total_referrals || 0,
                        total_units: donor.total_units || 0,
                        hb_status: donor.hb_status,
                        distance_km: donor._distanceKm,
                        is_verified: donor.is_verified,
                        verification_status: donor.verification_status,
                        is_anonymous: donor.is_anonymous,
                        last_active_at: donor.last_active_at,
                        created_at: donor.created_at,
                        response_count: donor.response_count,
                        response_total_ms: donor.response_total_ms,
                      }}
                    />
                  ))}
                </div>
              </>
            )}

              {!isLoading && viewMode === "list" && filteredDonors.length === 0 && (
                <div className="text-center py-16 md:py-20">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Search className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {isBn ? "কোনো রক্তদাতা পাওয়া যায়নি" : "No donors found"}
                  </h3>
                  <p className="text-sm md:text-base text-slate-500 max-w-md mx-auto">
                    {isBn
                      ? "আপনার সার্চ বা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।"
                      : "Try adjusting your search or filters, or browse all available donors."}
                  </p>
                  {(searchQuery || selectedGroup !== "All" || selectedDistrict || filterDonationType !== "all" || filterStatus !== "all") && (
                    <button
                      onClick={() => {
                        setSearchQuery(""); setSelectedGroup("All"); setSelectedDistrict("");
                        setSelectedUpazila(""); setSelectedUnion(""); setFilterDonationType("all"); setFilterStatus("all");
                        setAiChips([]); setLastAiQuery("");
                      }}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      {isBn ? "সব ফিল্টার মুছুন" : "Clear all filters"}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "eligibility" && (
            <motion.div
              key="eligibility-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              role="tabpanel"
              className="max-w-2xl mx-auto"
            >
              <DonorEligibilityChecker />
            </motion.div>
          )}

          {activeTab === "compatibility" && (
            <motion.div
              key="compatibility-tab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              role="tabpanel"
              className="max-w-4xl mx-auto"
            >
              <BloodCompatibilityGuide />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <DonorDetailModal donor={highlightDonor} onClose={closeDonorModal} />

      <Footer />
    </div>
  );
}

export default function DonorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen p-4">
          <CardGridSkeleton count={6} />
        </div>
      }
    >
      <DonorsContent />
    </Suspense>
  );
}
