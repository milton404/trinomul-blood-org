"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Users, Droplets, HeartPulse, Hospital, Loader2,
  TrendingUp, AlertTriangle, ArrowRight, Zap, Sparkles, Bot,
  Building2, UserCheck, UserPlus, BadgeCheck, Droplet, Trophy,
} from "lucide-react";
import {
  serverGetDashboardStats,
  serverGetAllBloodRequests,
  serverGetBloodInventory,
  serverGetAllDonations,
  serverGetDashboardAISnapshot,
  serverGetDonorApplications,
} from "@/lib/db-actions";
import { Link } from "@/i18n/routing";

interface DashboardAISnapshot {
  topInsight: {
    id: string;
    category: string;
    severity: "info" | "warning" | "critical" | "success";
    title: string;
    description: string;
    recommendation?: string;
  } | null;
  criticalCount: number;
  warningCount: number;
  usingAI: boolean;
  provider: "deepseek" | "zhipu" | "rules";
  summary: string;
}

interface DashboardStats {
  totalUsers: number;
  totalDonations: number;
  totalRequests: number;
  totalHospitals: number;
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin");

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDonations: 0,
    totalRequests: 0,
    totalHospitals: 0,
  });
  const [donationData, setDonationData] = useState<
    { name: string; donations: number; requests: number }[]
  >([]);
  const [bloodInventory, setBloodInventory] = useState<
    { blood_group: string; count: number }[]
  >([]);
  const [urgentRequests, setUrgentRequests] = useState<number>(0);
  const [pendingApplications, setPendingApplications] = useState<number>(0);
  const [aiSnapshot, setAiSnapshot] = useState<DashboardAISnapshot | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const dbStats = await serverGetDashboardStats();
        setStats({
          totalUsers: dbStats.totalUsers,
          totalDonations: dbStats.totalDonations || 0,
          totalRequests: dbStats.totalRequests,
          totalHospitals: dbStats.totalHospitals,
        });

        const inventory = await serverGetBloodInventory();
        setBloodInventory(inventory as any);

        const requests = await serverGetAllBloodRequests() as any[];
        const urgentCount = requests.filter(
          (r: any) => r.status === 'active' && (r.urgency_level === 'urgent' || r.urgency_level === 'critical')
        ).length;
        setUrgentRequests(urgentCount);

        try {
          const apps = await serverGetDonorApplications({ limit: 1 });
          setPendingApplications(apps.total);
        } catch (err) {
          console.error("Error fetching donor applications count:", err);
        }

        // Build monthly chart data from real request + donation records.
        // Previously donations were fudged as `count * 0.8`; now we aggregate
        // actual donations by month and merge with request counts.
        const monthlyRequests: Record<string, number> = {};
        for (const item of requests) {
          const date = new Date(item.created_at);
          if (Number.isNaN(date.getTime())) continue;
          const monthYear = date.toLocaleString("default", {
            month: "short",
            year: "2-digit",
          });
          monthlyRequests[monthYear] = (monthlyRequests[monthYear] || 0) + 1;
        }

        const monthlyDonations: Record<string, number> = {};
        try {
          const donations = (await serverGetAllDonations()) as any[];
          for (const item of donations) {
            const date = new Date(item.created_at ?? item.donation_date);
            if (Number.isNaN(date.getTime())) continue;
            const monthYear = date.toLocaleString("default", {
              month: "short",
              year: "2-digit",
            });
            monthlyDonations[monthYear] = (monthlyDonations[monthYear] || 0) + 1;
          }
        } catch (err) {
          console.error("Error fetching donations for chart:", err);
        }

        const allMonths = Array.from(
          new Set([...Object.keys(monthlyRequests), ...Object.keys(monthlyDonations)]),
        ).sort(
          (a, b) =>
            new Date(`01 ${a}`).getTime() - new Date(`01 ${b}`).getTime(),
        );

        const chartData = allMonths.map((name) => ({
          name,
          donations: monthlyDonations[name] || 0,
          requests: monthlyRequests[name] || 0,
        }));

        setDonationData(chartData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();

    // Fetch AI snapshot separately so it doesn't block the main dashboard load.
    serverGetDashboardAISnapshot()
      .then((snap) => setAiSnapshot(snap as DashboardAISnapshot))
      .catch((err) => console.error("AI snapshot fetch failed:", err))
      .finally(() => setAiLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-pulse">
              <div className="w-12 h-12 bg-slate-200 rounded-2xl mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-24 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statsCards = [
    { label: t("totalUsers") || "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users, color: "bg-blue-500" },
    { label: t("donations") || "Donations", value: stats.totalDonations.toLocaleString(), icon: Droplets, color: "bg-green-500" },
    { label: t("requests") || "Requests", value: stats.totalRequests.toLocaleString(), icon: HeartPulse, color: "bg-amber-500" },
    { label: t("hospitals") || "Hospitals", value: stats.totalHospitals.toLocaleString(), icon: Hospital, color: "bg-emerald-500" },
  ];

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const getInventoryCount = (bg: string) => {
    const found = bloodInventory.find((b) => b.blood_group === bg);
    return found?.count || 0;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <span className="text-red-600 font-bold">A</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("dashboard_overview")}</h1>
          <p className="text-sm text-slate-500">{t("dashboard_subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statsCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.color} text-white rounded-xl md:rounded-2xl flex items-center justify-center`}>
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="text-xl md:text-2xl font-bold text-slate-900 mt-3">{stat.value}</div>
              <div className="text-xs md:text-sm text-slate-500 font-medium">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base md:text-lg font-bold text-slate-900">{t("blood_inventory")}</h3>
          <Link href="/donors" className="text-xs md:text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
            {t("view_all_donors")} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 md:gap-3">
          {bloodGroups.map((bg) => {
            const count = getInventoryCount(bg);
            const isLow = count > 0 && count < 5;
            return (
              <div key={bg} className={`p-2 md:p-3 rounded-xl md:rounded-2xl border text-center transition-all hover:shadow-md ${count === 0 ? 'bg-slate-50 border-slate-200' : isLow ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 hover:border-red-200'}`}>
                <div className={`font-bold text-sm md:text-lg ${count === 0 ? 'text-slate-300' : 'text-red-600'}`}>{bg}</div>
                <div className={`text-lg md:text-xl font-bold mt-0.5 ${count === 0 ? 'text-slate-300' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4">{t("quick_actions")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { href: "/admin/donors", label: t("manage_donors"), icon: Droplets, color: "bg-rose-50 text-rose-600 hover:bg-rose-100" },
            { href: "/admin/donor-applications", label: t("donor_applications"), icon: UserPlus, color: "bg-orange-50 text-orange-600 hover:bg-orange-100", badge: pendingApplications },
            { href: "/admin/top-donors", label: t("top_donors"), icon: Trophy, color: "bg-yellow-50 text-yellow-600 hover:bg-yellow-100" },
            { href: "/admin/verifications", label: t("verifications"), icon: BadgeCheck, color: "bg-teal-50 text-teal-600 hover:bg-teal-100" },
            { href: "/admin/blood-requests", label: t("blood_requests"), icon: Droplet, color: "bg-red-50 text-red-600 hover:bg-red-100" },
            { href: "/admin/users", label: t("manage_users"), icon: Users, color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
            { href: "/admin/hospitals", label: t("manage_hospitals"), icon: Hospital, color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" },
            { href: "/admin/blood-requests?status=active&urgencyLevel=critical", label: t("urgent_requests"), icon: Zap, color: "bg-red-50 text-red-600 hover:bg-red-100", badge: urgentRequests },
            { href: "/admin/donations", label: t("view_donations"), icon: Droplets, color: "bg-rose-50 text-rose-600 hover:bg-rose-100" },
            { href: "/admin/donor-matches", label: t("view_donor_matches"), icon: UserCheck, color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
            { href: "/admin/organizations", label: t("manage_organizations"), icon: Building2, color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" },
            { href: "/admin/analytics", label: t("view_analytics"), icon: TrendingUp, color: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100" },
            { href: "/admin/ai-insights", label: t("view_ai_insights"), icon: Sparkles, color: "bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100" },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <Link key={i} href={action.href} className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl transition-all ${action.color}`}>
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{action.label}</span>
                {action.badge !== undefined && action.badge > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center">{action.badge}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI Insights summary card */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-lg p-6 md:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-grow">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold">
                  {t("ai_insights") || "AI Insights"}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    aiSnapshot?.usingAI
                      ? "bg-green-400/30 text-green-50"
                      : "bg-amber-400/30 text-amber-50"
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  {aiSnapshot?.usingAI
                    ? (aiSnapshot.provider === "deepseek"
                        ? "DeepSeek"
                        : aiSnapshot.provider === "zhipu"
                          ? "Zhipu GLM"
                          : "AI")
                    : (t("ai_rules_mode") || "Rules")}
                </span>
              </div>
              {aiLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-white/20 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse"></div>
                </div>
              ) : aiSnapshot?.topInsight ? (
                <>
                  <p className="text-sm text-purple-50 font-medium mb-1">
                    {aiSnapshot.topInsight.title}
                  </p>
                  <p className="text-sm text-purple-100 line-clamp-2">
                    {aiSnapshot.topInsight.description}
                  </p>
                  {(aiSnapshot.criticalCount > 0 || aiSnapshot.warningCount > 0) && (
                    <div className="flex items-center gap-3 mt-3">
                      {aiSnapshot.criticalCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-400/30 text-red-50 rounded-full text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          {aiSnapshot.criticalCount} {t("ai_critical") || "critical"}
                        </span>
                      )}
                      {aiSnapshot.warningCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-400/30 text-amber-50 rounded-full text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          {aiSnapshot.warningCount} {t("ai_warnings") || "warnings"}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-purple-100">
                  {t("ai_no_insights") || "No insights available yet."}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/admin/ai-insights"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-xl text-sm font-semibold hover:bg-purple-50 transition-colors flex-shrink-0"
          >
            {t("ai_view_all") || "View All Insights"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-base md:text-lg font-bold text-slate-900 mb-6">{t("request_trends")}</h3>
          <div className="h-[250px] md:h-[300px] w-full">
            {donationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="requests" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">{t("no_data_yet")}</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-base md:text-lg font-bold text-slate-900 mb-6">{t("request_overview")}</h3>
          <div className="h-[250px] md:h-[300px] w-full">
            {donationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={donationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                  <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">{t("no_data_yet")}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
