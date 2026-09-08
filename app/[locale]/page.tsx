"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Droplets,
  HeartPulse,
  UserPlus,
  Phone,
  Shield,
  Clock,
  ChevronRight,
  Menu,
  X,
  Loader2,
  MapPin,
  Map,
  Sparkles,
  Users,
  Facebook,
  MessageCircle,
  Heart,
  Share2,
  Hand,
} from "lucide-react";
import ModernSelect, { type SelectOption } from "@/components/ui/ModernSelect";
import RequestCard from "@/components/requests/RequestCard";

// SSR-safe load of the unified explore map with search + filter toggle.
const ExploreMap = dynamic(
  () => import("@/components/map/ExploreMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[450px] w-full rounded-3xl bg-slate-100 animate-pulse" />
    ),
  },
);
import type { DataFilter } from "@/components/map/DataFilterToggle";
import { BloodGroup } from "@/lib/blood-group-parser";
import DonorCard from "@/components/donors/DonorCard";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import {
  serverGetActiveBloodRequests,
  serverGetDonorsWithStats,
  serverGetHomepageStats,
} from "@/lib/db-actions";
import { serverParseSearchQuery } from "@/lib/ai/search-parser";
import { useUserLocation, haversineKm } from "@/hooks/use-user-location";
import {
  RANGPUR_DISTRICTS,
  RANGPUR_UPAZILAS,
  getUpazilasByDistrict,
  getUnionsByUpazila,
} from "@/lib/constants/rangpur";

/**
 * Resolve a request's coordinates the same way the Requests page does:
 * explicit lat/lng first, then upazila centroid, then district centroid.
 */
function requestCoords(req: any): { lat: number; lng: number } | null {
  if (typeof req.lat === "number" && typeof req.lng === "number") {
    return { lat: req.lat, lng: req.lng };
  }
  const upaName = (req.upazila || "").toLowerCase();
  if (upaName) {
    const upa = RANGPUR_UPAZILAS.find(
      (u) =>
        u.name_en.toLowerCase() === upaName ||
        u.name_bn === req.upazila ||
        u.name_en.toLowerCase().endsWith(upaName) ||
        u.name_en.toLowerCase().split(" ")[0] === upaName,
    );
    if (upa) return { lat: upa.lat, lng: upa.lng };
  }
  const distName = (req.district || "").toLowerCase();
  if (distName) {
    const d = RANGPUR_DISTRICTS.find(
      (x) => x.name_en.toLowerCase() === distName || x.name_bn === req.district,
    );
    if (d) return { lat: d.lat, lng: d.lng };
  }
  return null;
}

export default function HomePage() {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const tMap = useTranslations("map");
  const locale = useLocale();
  const { location: userLocation } = useUserLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedUpazila, setSelectedUpazila] = useState("");
  const [selectedUnion, setSelectedUnion] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "parsed" | "fallback">("idle");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [mapRequests, setMapRequests] = useState<any[]>([]);
  const [mapDonors, setMapDonors] = useState<any[]>([]);
  const [mapViewMode, setMapViewMode] = useState<DataFilter>("all");
  const [mapBloodGroup, setMapBloodGroup] = useState<BloodGroup | null>(null);
  const [selectedGroupDonors, setSelectedGroupDonors] = useState<any[]>([]);

  // Resolve request coords (GPS → upazila/district centroid) so pins render
  // even when the request was created without capturing exact GPS.
  const mapRequestsWithCoords = useMemo(
    () =>
      mapRequests.map((r) => {
        if (typeof r.lat === "number" && typeof r.lng === "number") return r;
        const c = requestCoords(r);
        return c ? { ...r, lat: c.lat, lng: c.lng } : r;
      }),
    [mapRequests],
  );
  const heroTitles = [t("hero_title_1"), t("hero_title_2"), t("hero_title_3"), t("hero_title_4"), t("hero_title_5")];
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (!Array.isArray(heroTitles) || heroTitles.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % heroTitles.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [heroTitles]);
  const [activeBloodGroup, setActiveBloodGroup] = useState<string | null>(null);
  const [isLoadingDonors, setIsLoadingDonors] = useState(false);
  // Hand-hint animation: plays once when the blood-group section scrolls into view
  const bloodGroupSectionRef = useRef<HTMLDivElement>(null);
  const [showHandHint, setShowHandHint] = useState(false);
  const [stats, setStats] = useState<{
    totalDonors: number;
    activeRequests: number;
    totalDonations: number;
    districts: number;
  } | null>(null);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const availableUpazilas = useMemo(() => {
    if (!selectedDistrict) return [];
    return getUpazilasByDistrict(selectedDistrict);
  }, [selectedDistrict]);

  const availableUnions = useMemo(() => {
    if (!selectedUpazila) return [];
    return getUnionsByUpazila(selectedUpazila);
  }, [selectedUpazila]);

  const bloodGroupOptions: SelectOption<string>[] = useMemo(
    () =>
      bloodGroups.map((g) => ({
        value: g,
        label: g,
        labelBn: g,
        badge: g,
      })),
    [bloodGroups],
  );

  const districtOptions: SelectOption<string>[] = useMemo(
    () =>
      RANGPUR_DISTRICTS.map((d) => ({
        value: d.id,
        label: d.name_en,
        labelBn: d.name_bn,
      })),
    [],
  );

  const upazilaOptions: SelectOption<string>[] = useMemo(
    () =>
      availableUpazilas.map((u) => ({
        value: u.id,
        label: u.name_en,
        labelBn: u.name_bn,
      })),
    [availableUpazilas],
  );

  const unionOptions: SelectOption<string>[] = useMemo(
    () =>
      availableUnions.map((u) => ({
        value: u.id,
        label: u.name_en,
        labelBn: u.name_bn,
      })),
    [availableUnions],
  );

  // Trigger hand-hint animation once when the blood-group section enters the viewport
  useEffect(() => {
    const el = bloodGroupSectionRef.current;
    if (!el) return;
    let played = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !played) {
            played = true;
            setShowHandHint(true);
            // Total animation duration ~2.6s, then hide the hand
            const t = window.setTimeout(() => setShowHandHint(false), 2600);
            observer.disconnect();
            return () => window.clearTimeout(t);
          }
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await serverGetActiveBloodRequests(3);
        // Attach distance from the user's location (GPS / cache / profile) so
        // homepage cards show "X km" just like the Requests page.
        if (userLocation) {
          for (const r of data || []) {
            const c = requestCoords(r);
            r.distance_km = c
              ? haversineKm(userLocation.lat, userLocation.lng, c.lat, c.lng)
              : null;
          }
        }
        setRecentRequests(data || []);
      } catch (error) {
        setRecentRequests([]);
      } finally {
        setIsLoadingRequests(false);
      }
    };

    // Fetch a larger set for the interactive map (only pins with coords render).
    const fetchMapRequests = async () => {
      try {
        const data = await serverGetActiveBloodRequests(50);
        setMapRequests(data || []);
      } catch (error) {
        setMapRequests([]);
      }
    };

    const fetchMapDonors = async () => {
      try {
        const data = await serverGetDonorsWithStats();
        setMapDonors(data || []);
      } catch (error) {
        setMapDonors([]);
      }
    };

    const fetchStats = async () => {
      try {
        const data = await serverGetHomepageStats();
        setStats(data);
      } catch (error) {}
    };

    fetchRequests();
    fetchMapRequests();
    fetchMapDonors();
    fetchStats();
  }, []);

  const recentRequestsRef = useRef(recentRequests);
  recentRequestsRef.current = recentRequests;

  // Location resolves asynchronously (GPS prompt / cache / profile) — attach
  // distance to already-loaded homepage requests once we know where the user is.
  useEffect(() => {
    if (!userLocation) return;
    setRecentRequests((prev) =>
      prev.map((r) => {
        const c = requestCoords(r);
        return {
          ...r,
          distance_km: c
            ? haversineKm(userLocation.lat, userLocation.lng, c.lat, c.lng)
            : null,
        };
      }),
    );
  }, [userLocation]);

  const handleBloodGroupClick = async (group: string) => {
    if (activeBloodGroup === group) {
      setActiveBloodGroup(null);
      setSelectedGroupDonors([]);
      return;
    }

    setActiveBloodGroup(group);
    setIsLoadingDonors(true);

    try {
      const allDonors = await serverGetDonorsWithStats();
      const filtered = allDonors.filter(
        (d: any) => d.blood_group === group && d.is_active && d.is_eligible,
      );
      setSelectedGroupDonors(filtered);
    } catch (error) {
      setSelectedGroupDonors([]);
    }

    setIsLoadingDonors(false);
  };

  /** Called when the map search bar detects a blood group (e.g. "A+ Rangpur"). */
  const handleBloodGroupDetected = (bg: BloodGroup | null) => {
    setMapBloodGroup(bg);
    if (bg) {
      setMapViewMode("donors");
    }
  };

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrict(districtId);
    setSelectedUpazila("");
    setSelectedUnion("");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setAiStatus("idle");

    const params = new URLSearchParams();
    // Dropdown selections take priority — they are the user's explicit choice
    let finalBloodGroup = selectedBloodGroup;
    let finalDistrict = selectedDistrict;
    let finalUpazila = selectedUpazila;
    let finalKeywords = "";

    // If user typed a natural-language query, let AI fill in the gaps only
    if (searchQuery.trim()) {
      setAiStatus("thinking");
      try {
        const parsed = await serverParseSearchQuery(searchQuery.trim());
        if (parsed.ai_used) {
          setAiStatus("parsed");
        } else {
          setAiStatus("fallback");
        }
        // Dropdown FILTERS have priority over AI (user explicitly chose them).
        // AI only fills in what the dropdowns don't have.
        if (parsed.blood_group && !finalBloodGroup) finalBloodGroup = parsed.blood_group;
        if (parsed.district_id && !finalDistrict) finalDistrict = parsed.district_id;
        if (parsed.upazila_id && !finalUpazila) {
          // Only use AI's upazila if it belongs to the final district
          const upaBelongsToFinalDistrict = !parsed.district_id || parsed.district_id === finalDistrict;
          if (upaBelongsToFinalDistrict) {
            finalUpazila = parsed.upazila_id;
          }
        }
        // If AI gave a district but dropdown already had one, and AI's upazila
        // belongs to the dropdown's district, still use it (no conflict here)
        if (parsed.upazila_id && !finalUpazila && parsed.district_id && parsed.district_id !== finalDistrict) {
          // AI's upazila belongs to a different district than dropdown — skip it
        }
        finalKeywords = parsed.keywords || "";
      } catch (err) {
        console.warn("[Home search] AI parse failed, using raw query:", err);
        setAiStatus("fallback");
        finalKeywords = searchQuery.trim();
      }
    }

    if (finalBloodGroup) params.set("blood_group", finalBloodGroup);
    if (finalDistrict) params.set("district", finalDistrict);
    if (finalUpazila) params.set("upazila", finalUpazila);
    if (selectedUnion) params.set("union", selectedUnion);

    // Build the q param: use AI-extracted keywords (names, phones, etc.)
    // Only fall back to raw query if AI didn't extract any structured fields
    const parsedSomething = finalBloodGroup || finalDistrict || finalUpazila;
    const qText = finalKeywords || (parsedSomething ? "" : searchQuery.trim());
    if (qText) params.set("q", qText);

    window.location.href = `/${locale}/donors?${params.toString()}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" role="main">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-red-700 via-red-600 to-rose-800 text-white overflow-hidden min-h-[100vh] flex flex-col justify-start pt-[8vh] md:pt-[6vh]">
          {/* Layered background: dot grid + soft radial glows + bottom fade */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-25" />
          <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-rose-400/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-24 w-[32rem] h-[32rem] rounded-full bg-red-900/40 blur-3xl pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 pt-4 pb-8 sm:py-10 md:py-14 relative z-10 w-full">
            <div className="text-center mb-5 sm:mb-7">
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium ring-1 ring-white/25 shadow-sm mb-3 sm:mb-4">
                <Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{t("hero_badge")}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-2 sm:mb-3 leading-[1.15] drop-shadow-sm text-balance">
                <span key={heroIdx} style={{ animation: "fadeIn 0.5s ease-in" }}>
                  {Array.isArray(heroTitles) && heroTitles.length > 0
                    ? heroTitles[heroIdx % heroTitles.length]
                    : t("hero_title")}
                </span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-white/85 max-w-2xl mx-auto leading-relaxed">
                {t("hero_subtitle")}
              </p>
            </div>

            {/* Search Card — elevated glass panel, stacked on mobile */}
            <div className="max-w-[calc(100%-2rem)] sm:max-w-4xl mx-auto">
              {(() => {
                const hasFilters = !!(selectedBloodGroup || selectedDistrict || selectedUpazila || searchQuery.trim());
                const thinking = isSearching && aiStatus === "thinking";
                const isBn = locale === "bn";
                const searchPlaceholder = isBn
                  ? "রক্তের গ্রুপ, এলাকা, নাম বা ফোন লিখুন…"
                  : "Type blood group, area, name or phone…";
                const searchAriaLabel = isBn ? "সার্চ করুন" : "Search donors";
                const submitLabel = thinking
                  ? (isBn ? "বিশ্লেষণ…" : "Analyzing…")
                  : isSearching
                    ? (isBn ? "খুঁজছে…" : "Searching…")
                    : t("search_btn");
                return (
              <form
                onSubmit={handleSearch}
                role="search"
                aria-label={isBn ? "রক্তদাতা খুঁজুন" : "Find a Blood Donor"}
                aria-busy={isSearching}
                noValidate
                className="relative rounded-2xl sm:rounded-3xl px-2 py-2.5 sm:px-4 sm:py-4
                           bg-white
                           ring-1 ring-white/60
                           shadow-xl shadow-red-950/20 sm:shadow-2xl sm:shadow-red-950/30
                           transition-shadow duration-300"
              >
                {/* Card header */}
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-600/30 flex-shrink-0">
                      <Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </span>
                    <h2 className="text-[13px] sm:text-sm font-bold text-slate-900 truncate">
                      {isBn ? "রক্তদাতা খুঁজুন" : "Find a Blood Donor"}
                    </h2>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold ring-1 ring-violet-200 flex-shrink-0">
                    <Sparkles className="w-3 h-3" />
                    {isBn ? "এআই সার্চ" : "AI-powered search"}
                  </span>
                </div>

                {/* Row 1: 3 filter dropdowns — grid on desktop, stacked on mobile */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  <ModernSelect
                    value={selectedBloodGroup}
                    onChange={(v) => setSelectedBloodGroup(v)}
                    options={bloodGroupOptions}
                    placeholder={t("select_blood_group")}
                    label={t("blood_group")}
                    locale={locale as "en" | "bn"}
                    variant="blood"
                    size="sm"
                    icon={<Droplets className="w-4 h-4" />}
                  />
                  <ModernSelect
                    value={selectedDistrict}
                    onChange={handleDistrictChange}
                    options={districtOptions}
                    placeholder={t("select_district")}
                    label={t("district")}
                    locale={locale as "en" | "bn"}
                    variant="location"
                    searchable
                    size="sm"
                    searchPlaceholder={isBn ? "জেলা খুঁজুন..." : "Search district..."}
                    icon={<MapPin className="w-4 h-4" />}
                  />
                  <ModernSelect
                    value={selectedUpazila}
                    onChange={(v) => { setSelectedUpazila(v); setSelectedUnion(""); }}
                    options={upazilaOptions}
                    placeholder={
                      selectedDistrict
                        ? t("select_upazila")
                        : isBn ? "প্রথমে জেলা নির্বাচন করুন" : "Select a district first"
                    }
                    label={t("upazila")}
                    locale={locale as "en" | "bn"}
                    variant="location"
                    searchable
                    size="sm"
                    searchPlaceholder={isBn ? "উপজেলা খুঁজুন..." : "Search upazila..."}
                    disabled={!selectedDistrict}
                    icon={<Map className="w-4 h-4" />}
                    className="col-span-2 sm:col-span-1"
                  />
                  {unionOptions.length > 0 && (
                    <ModernSelect
                      value={selectedUnion}
                      onChange={setSelectedUnion}
                      options={unionOptions}
                      placeholder={t("select_union")}
                      label={t("union")}
                      locale={locale as "en" | "bn"}
                      variant="location"
                      searchable
                      size="sm"
                      searchPlaceholder={isBn ? "ইউনিয়ন খুঁজুন..." : "Search union..."}
                      icon={<MapPin className="w-4 h-4" />}
                      className="col-span-2 sm:col-span-1"
                    />
                  )}
                </div>

                {/* Row 2: AI Search Bar + Submit */}
                <div className="mt-2.5 sm:mt-3 group relative flex items-stretch gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                      thinking ? "text-violet-500" : "text-slate-400 group-focus-within:text-red-500"
                    }`} />
                    <input
                      type="text"
                      name="search"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setAiStatus("idle");
                      }}
                      aria-label={searchAriaLabel}
                      placeholder={searchPlaceholder}
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="search"
                      className={`w-full pl-9 sm:pl-10 ${
                        thinking ? "pr-10" : searchQuery ? "pr-9" : "pr-12"
                      } py-2 sm:py-2.5 rounded-xl border-2
                                 bg-slate-50/60 text-slate-800 placeholder:text-slate-400 outline-none text-[13px] sm:text-sm font-medium
                                 focus:bg-white focus:ring-4
                                 hover:border-slate-500 transition-all duration-200 ${
                                   thinking
                                     ? "border-slate-400 focus:border-slate-600 focus:ring-slate-200"
                                     : "border-slate-400 focus:border-slate-600 focus:ring-slate-200"
                                 }`}
                    />
                    {thinking && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                        <Sparkles className="w-3 h-3 text-violet-500 animate-pulse" />
                      </div>
                    )}
                    {!searchQuery && !thinking && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[9px] font-bold pointer-events-none shadow-sm">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}
                    {searchQuery && !thinking && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setAiStatus("idle");
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        aria-label={isBn ? "মুছুন" : "Clear"}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !hasFilters}
                    aria-disabled={isSearching || !hasFilters}
                    aria-label={submitLabel}
                    className={`relative overflow-hidden shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold text-[13px] sm:text-sm
                               flex items-center justify-center gap-1.5
                               transition-all duration-300
                               ${
                                 hasFilters
                                   ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
                                   : "bg-slate-300 text-slate-800 shadow-none cursor-not-allowed"
                               }
                               disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                  >
                    {thinking ? (
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    ) : isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{submitLabel}</span>
                  </button>
                </div>

                {/* Filter chips — left-aligned with clear-all */}
                <div className="mt-2 sm:mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="sr-only" aria-live="polite" role="status">
                    {isSearching
                      ? locale === "bn" ? "অনুসন্ধান করা হচ্ছে…" : "Searching…"
                      : ""}
                  </span>
                  {(selectedBloodGroup || selectedDistrict || selectedUpazila || searchQuery) ? (
                    <>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mr-0.5">
                        {locale === "bn" ? "ফিল্টার" : "Filters"}
                      </span>
                      {selectedBloodGroup && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold ring-1 ring-rose-200">
                          <Droplets className="w-3 h-3" />
                          {selectedBloodGroup}
                          <button
                            type="button"
                            onClick={() => setSelectedBloodGroup("")}
                            className="p-0.5 rounded-full hover:bg-rose-100 transition-colors"
                            aria-label={locale === "bn" ? `${selectedBloodGroup} সরান` : `Remove ${selectedBloodGroup}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      )}
                      {selectedDistrict && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200">
                          <MapPin className="w-3 h-3" />
                          {locale === "bn"
                            ? RANGPUR_DISTRICTS.find((d) => d.id === selectedDistrict)?.name_bn
                            : RANGPUR_DISTRICTS.find((d) => d.id === selectedDistrict)?.name_en}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDistrict("");
                              setSelectedUpazila("");
                            }}
                            className="p-0.5 rounded-full hover:bg-emerald-100 transition-colors"
                            aria-label={locale === "bn" ? "জেলা সরান" : "Remove district"}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      )}
                      {selectedUpazila && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold ring-1 ring-teal-200">
                          <Map className="w-3 h-3" />
                          {locale === "bn"
                            ? availableUpazilas.find((u) => u.id === selectedUpazila)?.name_bn
                            : availableUpazilas.find((u) => u.id === selectedUpazila)?.name_en}
                          <button
                            type="button"
                            onClick={() => setSelectedUpazila("")}
                            className="p-0.5 rounded-full hover:bg-teal-100 transition-colors"
                            aria-label={locale === "bn" ? "উপজেলা সরান" : "Remove upazila"}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      )}
                      {searchQuery && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold ring-1 ring-slate-200">
                          <Search className="w-3 h-3" />
                          "{searchQuery.slice(0, 18)}
                          {searchQuery.length > 18 ? "…" : ""}"
                          <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                            aria-label={locale === "bn" ? "সার্চ টেক্সট মুছুন" : "Clear search text"}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBloodGroup("");
                          setSelectedDistrict("");
                          setSelectedUpazila("");
                          setSearchQuery("");
                          setAiStatus("idle");
                        }}
                        className="ml-auto text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline underline-offset-2 transition-colors"
                      >
                        {locale === "bn" ? "সব মুছুন" : "Clear all"}
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                      {locale === "bn"
                        ? "ফিল্টার নির্বাচন করুন বা টাইপ করে খুঁজুন — যেমন: “A+ রংপুর সদর”"
                        : "Pick filters or just type — e.g. “A+ Rangpur Sadar”"}
                    </span>
                  )}
                </div>
              </form>
                );
              })()}
            </div>

            {/* Quick Action Buttons — full-width stacked on mobile */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 mt-5 sm:mt-7 max-w-[calc(100%-2rem)] sm:max-w-none mx-auto">
              <Link
                href="/request"
                className="group relative overflow-hidden bg-white text-red-700 px-4 py-2.5 sm:px-6 sm:py-3 sm:w-80 rounded-xl font-bold text-[13px] sm:text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 shadow-xl shadow-red-950/25 hover:shadow-2xl hover:shadow-red-950/30 ring-1 ring-white"
              >
                <HeartPulse className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="whitespace-nowrap">{t("post_request")}</span>
                <span className="absolute top-0 -left-1/2 w-1/2 h-full bg-gradient-to-r from-transparent via-red-100/60 to-transparent skew-x-12 group-hover:left-full transition-all duration-700 pointer-events-none" />
              </Link>
              <Link
                href="/register?role=donor"
                className="group relative overflow-hidden bg-slate-900/90 backdrop-blur text-white px-4 py-2.5 sm:px-6 sm:py-3 sm:w-80 rounded-xl font-bold text-[13px] sm:text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 shadow-xl shadow-black/30 ring-1 ring-white/15 hover:ring-white/30"
              >
                <UserPlus className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{t("become_donor")}</span>
                <span className="absolute top-0 -left-1/2 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-full transition-all duration-700 pointer-events-none" />
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-10 sm:py-12 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-0.5">
                  {stats
                    ? stats.totalDonors > 0
                      ? stats.totalDonors
                      : "—"
                    : "—"}
                </div>
                <div className="text-slate-500 text-xs sm:text-sm font-medium">
                  {t("stats_donors")}
                </div>
              </div>
              <div className="text-center group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                  <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-0.5">
                  {stats
                    ? stats.activeRequests > 0
                      ? stats.activeRequests
                      : "0"
                    : "—"}
                </div>
                <div className="text-slate-500 text-xs sm:text-sm font-medium">
                  {t("stats_requests")}
                </div>
              </div>
              <div className="text-center group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-0.5">
                  {stats
                    ? stats.totalDonations > 0
                      ? stats.totalDonations
                      : "0"
                    : "—"}
                </div>
                <div className="text-slate-500 text-xs sm:text-sm font-medium">
                  {t("stats_donations")}
                </div>
              </div>
              <div className="text-center group">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-violet-50 rounded-xl flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition-transform">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" />
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-0.5">
                  {stats ? (stats.districts > 0 ? stats.districts : "0") : "—"}
                </div>
                <div className="text-slate-500 text-xs sm:text-sm font-medium">
                  {t("stats_districts")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Map — with search + donor/request filter toggle overlays */}
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 text-red-600">
                    <MapPin className="w-5 h-5" />
                  </span>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                    {tMap("active_requests_near_you")}
                  </h2>
                </div>
                <p className="text-slate-600 text-sm font-medium">
                  {tMap("tap_pin_for_details")}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-600 text-white text-sm font-bold self-start">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                {mapRequests.length + mapDonors.length}{" "}
                {tCommon("total")}
              </span>
            </div>
            <ExploreMap
              donors={mapDonors}
              requests={mapRequestsWithCoords}
              height={450}
              filter={mapViewMode}
              onFilterChange={setMapViewMode}
              bloodGroupFilter={mapBloodGroup}
              onBloodGroupDetected={handleBloodGroupDetected}
            />
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link
                href="/requests"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors"
              >
                {tMap("view_all_requests")}
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/donors"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-green-800 hover:bg-green-900 text-white font-bold text-sm transition-colors"
              >
                {tCommon("viewAll")}{" "}
                {tCommon("donors")}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Recent Requests Section */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  {t("recent_requests")}
                </h2>
                <p className="text-slate-600 mt-1 font-medium">
                  {t("recent_requests_subtitle")}
                </p>
              </div>
              <Link
                href="/requests"
                className="text-red-600 font-semibold hover:underline flex items-center gap-2"
              >
                {tCommon("viewAll")}
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
              {isLoadingRequests ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-pulse"
                  >
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded"></div>
                      <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </div>
                ))
              ) : recentRequests.length > 0 ? (
                recentRequests.map((request, index) => (
                  <RequestCard key={index} request={request} />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-slate-600 font-medium">
                  <HeartPulse className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>
                    {t("no_requests") ||
                      "No active blood requests at the moment"}
                  </p>
                  <Link
                    href="/request"
                    className="text-red-600 font-semibold hover:underline mt-2 inline-block"
                  >
                    {t("post_first_request") || "Post the first request"}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Blood Group Donor Finder */}
        <section className="py-16 px-4 bg-gradient-to-br from-red-50 via-white to-orange-50">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-3xl shadow-lg shadow-red-100/50 border border-red-100 p-8 md:p-12">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-droplets w-8 h-8 text-green-700" aria-hidden="true"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path></svg>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  {t("find_donor_by_group")}
                </h2>
                <p className="text-slate-600 max-w-md mx-auto font-medium">
                  {t("find_donor_by_group_desc")}
                </p>
              </div>

              {/* Blood Group Pills */}
              <div
                ref={bloodGroupSectionRef}
                className="relative flex flex-wrap justify-center gap-2 sm:gap-3 mb-8"
                role="group"
                aria-label="Filter donors by blood group"
              >
                {/* Animated hand hint — points at the O- pill (universal donor) and taps */}
                {showHandHint && (
                  <span
                    className="pointer-events-none absolute z-20 right-[calc(50%-7rem)] sm:right-[calc(50%-8rem)] -top-2 sm:-top-3"
                    style={{ animation: "bloodHandTap 2.4s ease-in-out 1 forwards" }}
                    aria-hidden="true"
                  >
                    {/* Hand keyframes — float down, tap, lift, fade */}
                    <style>{`
                      @keyframes bloodHandTap {
                        0%   { transform: translateY(-18px) rotate(-8deg); opacity: 0; }
                        15%  { transform: translateY(0) rotate(-8deg); opacity: 1; }
                        30%  { transform: translateY(2px) rotate(-2deg) scale(0.92); opacity: 1; }
                        42%  { transform: translateY(-4px) rotate(-8deg) scale(1); opacity: 1; }
                        60%  { transform: translateY(2px) rotate(-2deg) scale(0.92); opacity: 1; }
                        72%  { transform: translateY(-2px) rotate(-8deg) scale(1); opacity: 1; }
                        100% { transform: translateY(-22px) rotate(-8deg); opacity: 0; }
                      }
                    `}</style>
                    <span className="relative inline-flex items-center justify-center">
                      {/* Soft pulse ring under the hand */}
                      <span className="absolute inset-0 rounded-full bg-red-400/30 blur-md animate-ping" />
                      <Hand className="relative w-7 h-7 sm:w-8 sm:h-8 text-red-600 drop-shadow-lg" fill="currentColor" />
                    </span>
                  </span>
                )}
                {bloodGroups.map((group) => {
                  const isActive = activeBloodGroup === group;
                  const baseColor = group.startsWith("A")
                    ? "blue"
                    : group.startsWith("B")
                      ? "teal"
                      : group.startsWith("AB")
                        ? "purple"
                        : "red";
                  const colorMap: Record<
                    string,
                    {
                      active: string;
                      ring: string;
                      icon: string;
                      hoverBorder: string;
                      hoverText: string;
                      hoverBg: string;
                    }
                  > = {
                    blue: {
                      active:
                        "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105",
                      ring: "ring-blue-200",
                      icon: "text-blue-600",
                      hoverBorder: "hover:border-blue-400",
                      hoverText: "hover:text-blue-600",
                      hoverBg: "hover:bg-blue-50",
                    },
                    teal: {
                      active:
                        "bg-teal-600 text-white shadow-lg shadow-teal-200 scale-105",
                      ring: "ring-teal-200",
                      icon: "text-teal-600",
                      hoverBorder: "hover:border-teal-400",
                      hoverText: "hover:text-teal-600",
                      hoverBg: "hover:bg-teal-50",
                    },
                    purple: {
                      active:
                        "bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105",
                      ring: "ring-purple-200",
                      icon: "text-purple-600",
                      hoverBorder: "hover:border-purple-400",
                      hoverText: "hover:text-purple-600",
                      hoverBg: "hover:bg-purple-50",
                    },
                    red: {
                      active:
                        "bg-red-600 text-white shadow-lg shadow-red-200 scale-105",
                      ring: "ring-red-200",
                      icon: "text-red-600",
                      hoverBorder: "hover:border-red-400",
                      hoverText: "hover:text-red-600",
                      hoverBg: "hover:bg-red-50",
                    },
                  };
                  const c = colorMap[baseColor];
                  return (
                    <button
                      key={group}
                      onClick={() => handleBloodGroupClick(group)}
                      className={`px-3.5 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer border-2 shrink-0 ${
                        isActive
                          ? c.active
                          : `bg-white text-slate-700 border-slate-200 ${c.hoverBorder} ${c.hoverText} ${c.hoverBg} hover:shadow-md`
                      } ${isActive ? `ring-2 ${c.ring}` : ""}`}
                      aria-pressed={isActive}
                    >
                      <span className="flex items-center gap-1 sm:gap-1.5">
                        <Droplets
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? "text-white" : c.icon}`}
                        />
                        {group}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Donor Cards */}
              {activeBloodGroup && (
                <div className="mt-8">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold text-sm">
                      {activeBloodGroup}
                    </span>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {selectedGroupDonors.length}{" "}
                      {selectedGroupDonors.length === 1
                        ? t("donor_found")
                        : t("donors_found")}
                    </h3>
                  </div>

                  {isLoadingDonors ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-pulse"
                        >
                          <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-3"></div>
                          <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto mb-2"></div>
                          <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto"></div>
                        </div>
                      ))}
                    </div>
                  ) : selectedGroupDonors.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {selectedGroupDonors.map((donor, i) => (
                        <DonorCard
                          key={donor.id || i}
                          donor={{
                            full_name: donor.full_name_en || donor.full_name_bn,
                            blood_group: donor.blood_group,
                            district: donor.district,
                            upazila: donor.upazila,
                            total_donations: donor.total_donations || 0,
                            is_active: donor.is_active,
                            badges: donor.badges || [],
                            phone: donor.phone,
                            avatar_url: donor.avatar_url,
                            hb_status: donor.hb_status,
                            distance_km: donor.distance_km ?? null,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-14 bg-gradient-to-br from-red-50/80 to-orange-50/60 rounded-2xl border border-red-100 border-dashed">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                        <Droplets className="w-8 h-8 text-red-400" />
                      </div>
                      <p className="text-slate-700 font-semibold text-lg mb-1">
                        {t("no_donors_for_group", {
                          group: activeBloodGroup,
                        })}
                      </p>
                      <p className="text-slate-500 text-sm mt-1 mb-5 font-medium">
                        {t("try_another_group")}
                      </p>
                      <Link
                        href="/register?role=donor"
                        className="inline-flex items-center gap-2 bg-green-800 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-green-900 transition-all shadow-md shadow-green-200 hover:shadow-lg hover:shadow-green-200"
                      >
                        <UserPlus className="w-4 h-4" />
                        {t("become_donor_btn")}
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
              {t("how_it_works")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-green-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {t("step1_title")}
                </h3>
                <p className="text-slate-600 font-medium">{t("step1_desc")}</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-green-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {t("step2_title")}
                </h3>
                <p className="text-slate-600 font-medium">{t("step2_desc")}</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HeartPulse className="w-8 h-8 text-green-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {t("step3_title")}
                </h3>
                <p className="text-slate-600 font-medium">{t("step3_desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section className="py-16 px-4 bg-gradient-to-br from-rose-50 via-white to-red-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                <Users className="w-4 h-4" />
                {locale === "bn" ? "আমাদের কমিউনিটি" : "Our Community"}
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                {locale === "bn"
                  ? "একসাথে আমরা জীবন বাঁচাই"
                  : "Together We Save Lives"}
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto font-medium">
                {locale === "bn"
                  ? "রংপুর বিভাগ জুড়ে আমাদের রক্তদাতা ও স্বেচ্ছাসেবক পরিবারে যুক্ত হোন। প্রতিটি রক্তদান একটি জীবন বাঁচায়।"
                  : "Join our family of donors and volunteers across Rangpur division. Every donation saves a life."}
              </p>
            </div>

            {/* Community Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <HeartPulse className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {stats?.totalDonors ?? "—"}
                </div>
                <div className="text-xs text-slate-600 mt-1 font-semibold">
                  {locale === "bn" ? "নিবন্ধিত দাতা" : "Active Donors"}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {stats?.totalDonations ?? "—"}
                </div>
                <div className="text-xs text-slate-600 mt-1 font-semibold">
                  {locale === "bn" ? "রক্তদান সম্পন্ন" : "Donations Made"}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {stats?.districts ?? "—"}
                </div>
                <div className="text-xs text-slate-600 mt-1 font-semibold">
                  {locale === "bn" ? "জেলা সমূহ" : "Districts Covered"}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Share2 className="w-6 h-6 text-violet-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {locale === "bn" ? "উন্মুক্ত" : "Open"}
                </div>
                <div className="text-xs text-slate-600 mt-1 font-semibold">
                  {locale === "bn" ? "সবার জন্য" : "For Everyone"}
                </div>
              </div>
            </div>

            {/* Community Join Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <a
                href="https://facebook.com/trinomulbloodbank"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Facebook className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {locale === "bn" ? "ফেসবুক পেজ" : "Facebook Page"}
                </h3>
                <p className="text-sm text-slate-600 mb-3 font-medium">
                  {locale === "bn"
                    ? "আমাদের ফেসবুক পেজে লাইক দিন এবং সর্বশেষ আপডেট পান।"
                    : "Follow our page for updates, stories, and urgent alerts."}
                </p>
                <span className="text-blue-600 text-sm font-semibold flex items-center gap-1">
                  {locale === "bn" ? "ফলো করুন" : "Follow"}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </a>

              <a
                href="https://facebook.com/groups/trinomulbloodbank"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-rose-200 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {locale === "bn" ? "ফেসবুক গ্রুপ" : "Facebook Group"}
                </h3>
                <p className="text-sm text-slate-600 mb-3 font-medium">
                  {locale === "bn"
                    ? "কমিউনিটি গ্রুপে যুক্ত হয়ে রক্তদাতা ও রোগীদের সাথে সংযুক্ত হোন।"
                    : "Join the community group to connect with donors and patients."}
                </p>
                <span className="text-rose-600 text-sm font-semibold flex items-center gap-1">
                  {locale === "bn" ? "যুক্ত হোন" : "Join Group"}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </a>

              <Link
                href="/register?role=donor"
                className="group bg-gradient-to-br from-red-600 to-rose-600 p-6 rounded-2xl shadow-md border border-red-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-white"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {locale === "bn" ? "রক্তদাতা হিসেবে যোগ দিন" : "Become a Donor"}
                </h3>
                <p className="text-sm text-white/95 mb-3 font-medium">
                  {locale === "bn"
                    ? "নিবন্ধন করুন এবং জরুরি প্রয়োজনে কারো জীবন বাঁচান।"
                    : "Register today and be ready to save a life when needed."}
                </p>
                <span className="text-white text-sm font-semibold flex items-center gap-1">
                  {locale === "bn" ? "নিবন্ধন করুন" : "Register Now"}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </div>

            {/* Community message banner */}
            <div className="mt-10 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-rose-100 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center shrink-0">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-slate-800 font-semibold">
                  {locale === "bn"
                    ? "\"প্রতিটি রক্তদান একটি জীবনের পুনর্জন্ম — আসুন একসাথে এই মহান কাজে অংশ নিই।\""
                    : "\"Every donation is a rebirth of life — let's be part of this noble cause together.\""}
                </p>
                <p className="text-sm text-slate-600 mt-1 font-medium">
                  {locale === "bn"
                    ? "— তৃণমূল ব্লাড ব্যাংক রংপুর"
                    : "— Trinomul Blood Bank Rangpur"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">{t("cta_title")}</h2>
            <p className="text-white/90 mb-8 text-lg">{t("cta_subtitle")}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="bg-white text-red-600 px-8 py-4 rounded-full font-bold hover:bg-red-50 transition-all shadow-lg hover:scale-105"
              >
                {t("register_now")}
              </Link>
              <Link
                href="/donors"
                className="bg-white/10 border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white/20 transition-all hover:scale-105"
              >
                {t("find_donor")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
