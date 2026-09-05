"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Droplets,
  HeartPulse,
  UserPlus,
  Phone,
  ChevronRight,
  Loader2,
  MapPin,
  Map,
  Sparkles,
  Users,
  ArrowLeft,
  Home,
} from "lucide-react";
import RequestCard from "@/components/requests/RequestCard";
import { RANGPUR_UPAZILAS, RANGPUR_DISTRICTS } from "@/lib/constants/rangpur";

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

// SSR-safe load of the unified explore map with search + filter toggle.
const ExploreMap = dynamic(
  () => import("@/components/map/ExploreMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] lg:h-[600px] w-full rounded-3xl bg-slate-100 animate-pulse" />
    ),
  },
);
import type { DataFilter } from "@/components/map/DataFilterToggle";
import { BloodGroup } from "@/lib/blood-group-parser";
import DonorCard from "@/components/donors/DonorCard";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import {
  serverGetActiveBloodRequests,
  serverGetDonorsWithStats,
  serverGetHomepageStats,
} from "@/lib/db-actions";

export default function MapPage() {
  const t = useTranslations("map");
  const tCommon = useTranslations("common");
  const tHome = useTranslations("home");
  const locale = useLocale();
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [mapRequests, setMapRequests] = useState<any[]>([]);
  const [mapDonors, setMapDonors] = useState<any[]>([]);
  const [mapViewMode, setMapViewMode] = useState<DataFilter>("all");
  const [mapBloodGroup, setMapBloodGroup] = useState<BloodGroup | null>(null);
  const [activeBloodGroup, setActiveBloodGroup] = useState<string | null>(null);
  const [allDonorsForFilter, setAllDonorsForFilter] = useState<any[]>([]);

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
  const [stats, setStats] = useState<{
    totalDonors: number;
    activeRequests: number;
    totalDonations: number;
    districts: number;
  } | null>(null);

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await serverGetActiveBloodRequests(3);
        setRecentRequests(data || []);
      } catch (error) {
        setRecentRequests([]);
      } finally {
        setIsLoadingRequests(false);
      }
    };

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
        // Also populate the donor filter list (active donors only)
        const active = (data || []).filter((d: any) => d.is_active);
        setAllDonorsForFilter(active);
      } catch (error) {
        setMapDonors([]);
        setAllDonorsForFilter([]);
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

  // Client-side filter: show all or filtered by active blood group
  const displayedDonors = useMemo(() => {
    if (!activeBloodGroup) return allDonorsForFilter;
    return allDonorsForFilter.filter(
      (d: any) => d.blood_group === activeBloodGroup,
    );
  }, [allDonorsForFilter, activeBloodGroup]);

  const handleBloodGroupClick = (group: string) => {
    // Toggle: clicking the active group deselects → show all
    if (activeBloodGroup === group) {
      setActiveBloodGroup(null);
    } else {
      setActiveBloodGroup(group);
    }
  };

  /** Called when the map search bar detects a blood group (e.g. "A+ Rangpur"). */
  const handleBloodGroupDetected = useCallback((bg: BloodGroup | null) => {
    setMapBloodGroup(bg);
    if (bg) {
      setMapViewMode("donors");
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main id="main-content" role="main">
        {/* Header Banner */}
        <section className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
          <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 relative z-10">
            <div className="flex items-center gap-4 mb-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors backdrop-blur-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                {tCommon("home")}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors backdrop-blur-sm"
              >
                <Home className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {t("donor_map")} — {t("rangpur_division")}
                </h1>
                <p className="text-white/80 text-sm md:text-base mt-1 font-medium">
                  {t("tap_pin_for_details")}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-red-500/30 backdrop-blur-sm text-white text-sm font-bold self-start border border-white/20">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                {mapRequests.length + mapDonors.length}{" "}
                {tCommon("total")}
              </span>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-green-800 mb-1">
                  {stats
                    ? stats.totalDonors > 0
                      ? stats.totalDonors
                      : "—"
                    : "—"}
                </div>
                <div className="text-slate-700 text-sm font-medium">
                  {tHome("stats_donors")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-red-600 mb-1">
                  {stats
                    ? stats.activeRequests > 0
                      ? stats.activeRequests
                      : "0"
                    : "—"}
                </div>
                <div className="text-slate-700 text-sm font-medium">
                  {tHome("stats_requests")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-amber-600 mb-1">
                  {stats
                    ? stats.totalDonations > 0
                      ? stats.totalDonations
                      : "0"
                    : "—"}
                </div>
                <div className="text-slate-700 text-sm font-medium">
                  {tCommon("donations")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">
                  {stats ? (stats.districts > 0 ? stats.districts : "0") : "—"}
                </div>
                <div className="text-slate-700 text-sm font-medium">
                  {tHome("stats_districts")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Full Map Section */}
        <section className="py-8 px-4 bg-gradient-to-b from-slate-100 to-white">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {t("active_requests_near_you")}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium">
                    {t("tap_pin_for_details")}
                  </p>
                </div>
              </div>
              <ExploreMap
                donors={mapDonors}
                requests={mapRequestsWithCoords}
                height={600}
                filter={mapViewMode}
                onFilterChange={setMapViewMode}
                bloodGroupFilter={mapBloodGroup}
                onBloodGroupDetected={handleBloodGroupDetected}
              />
              <div className="flex items-center justify-center gap-3 py-6">
                <Link
                  href="/requests"
                  className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors"
                >
                  {t("view_all_requests")}
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
          </div>
        </section>

        {/* Recent Requests Section */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  {tHome("recent_requests")}
                </h2>
                <p className="text-slate-600 mt-1 font-medium">
                  {tHome("recent_requests_subtitle")}
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="col-span-3 text-center py-12 text-slate-600 font-medium">
                  <HeartPulse className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>
                    {tHome("no_requests") ||
                      "No active blood requests at the moment"}
                  </p>
                  <Link
                    href="/request"
                    className="text-red-600 font-semibold hover:underline mt-2 inline-block"
                  >
                    {tHome("post_first_request") || "Post the first request"}
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
                  {tHome("find_donor_by_group")}
                </h2>
                <p className="text-slate-600 max-w-md mx-auto font-medium">
                  {tHome("find_donor_by_group_desc")}
                </p>
              </div>

              {/* Blood Group Pills */}
              <div
                className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8"
                role="group"
                aria-label="Filter donors by blood group"
              >
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

              {/* Donor Cards — always visible, client-side filtered */}
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  {activeBloodGroup ? (
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 font-bold text-sm">
                      {activeBloodGroup}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700">
                      <Droplets className="w-5 h-5" />
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-slate-800">
                    {activeBloodGroup
                      ? `${displayedDonors.length} ${displayedDonors.length === 1 ? tHome("donor_found") : tHome("donors_found")}`
                      : `${displayedDonors.length} ${tCommon("donors")}`}
                  </h3>
                  {activeBloodGroup && (
                    <button
                      onClick={() => setActiveBloodGroup(null)}
                      className="ml-auto text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                    >
                      {tCommon("viewAll")}
                    </button>
                  )}
                </div>

                {displayedDonors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {displayedDonors.map((donor, i) => (
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
                  <div className="text-center py-10 text-slate-500 font-medium">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p>{tHome("no_donors_found")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="py-12 px-4 bg-slate-900">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              {tHome("cta_title")}
            </h2>
            <p className="text-slate-300 mb-8 text-lg">
              {tHome("cta_subtitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="bg-white text-red-600 px-8 py-4 rounded-full font-bold hover:bg-red-50 transition-all shadow-lg hover:scale-105"
              >
                {tHome("register_now")}
              </Link>
              <Link
                href="/donors"
                className="bg-white/10 border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white/20 transition-all hover:scale-105"
              >
                {tHome("find_donor")}
              </Link>
              <Link
                href="/request"
                className="bg-red-600 border-2 border-red-600 text-white px-8 py-4 rounded-full font-bold hover:bg-red-700 transition-all hover:scale-105"
              >
                {tHome("post_request")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
