"use client";

import { useState, useEffect } from "react";
import { StatsBarSkeleton, CardGridSkeleton } from "@/components/ui/Skeleton";
import {
  serverGetAnalyticsStats,
  serverGetMonthlyStats,
  serverGetDailyStats,
  serverGetWeeklyStats,
  serverGetDistrictStats,
} from "@/lib/db-actions";
import { useTranslations, useLocale } from "next-intl";
import {
  Users,
  Droplets,
  HeartPulse,
  Hospital,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { RANGPUR_DISTRICTS } from "@/lib/constants/rangpur";

interface Stats {
  totalUsers: number;
  totalDonors: number;
  totalPatients: number;
  totalHospitals: number;
  activeRequests: number;
  totalRequests: number;
  fulfilledRequests: number;
  donationsThisMonth: number;
}

interface BloodGroupStats {
  blood_group: string;
  count: number;
}

interface DistrictStats {
  district: string;
  donors: number;
  requests: number;
}

interface MonthlyStats {
  month: string;
  requests: number;
  donors: number;
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

export default function AdminAnalyticsPage() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDonors: 0,
    totalPatients: 0,
    totalHospitals: 0,
    activeRequests: 0,
    totalRequests: 0,
    fulfilledRequests: 0,
    donationsThisMonth: 0,
  });
  const [bloodGroupStats, setBloodGroupStats] = useState<BloodGroupStats[]>([]);
  const [districtStats, setDistrictStats] = useState<DistrictStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [urgencyStats, setUrgencyStats] = useState<
    { name: string; value: number }[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [timePeriod, setTimePeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [districtData, setDistrictData] = useState<
    {
      district: string;
      donors: number;
      donor_count: number;
      hospital_count: number;
      patient_count: number;
    }[]
  >([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);

    try {
      const data = await serverGetAnalyticsStats();

      setStats({
        totalUsers: data.totalUsers,
        totalDonors: data.totalDonors,
        totalPatients: data.totalPatients,
        totalHospitals: data.totalHospitals,
        activeRequests: data.activeRequests,
        totalRequests: data.totalRequests,
        fulfilledRequests: data.fulfilledRequests,
        donationsThisMonth: data.donationsThisMonth,
      });

      if (data.bloodGroups) {
        setBloodGroupStats(
          data.bloodGroups.map(
            (bg: { blood_group: string; count: number }) => ({
              blood_group: bg.blood_group,
              count: bg.count,
            }),
          ),
        );
      }

      if (data.urgencyLevels) {
        setUrgencyStats(
          data.urgencyLevels.map(
            (ul: { urgency_level: string; count: number }) => ({
              name:
                ul.urgency_level.charAt(0).toUpperCase() +
                ul.urgency_level.slice(1),
              value: ul.count,
            }),
          ),
        );
      }

      setRecentActivity(data.recentActivity || []);

      const monthlyData = await serverGetMonthlyStats();
      setMonthlyStats(monthlyData);

      const dailyData = await serverGetDailyStats(30);
      setDailyStats(dailyData);

      const weeklyData = await serverGetWeeklyStats(12);
      setWeeklyStats(weeklyData);

      const distData = await serverGetDistrictStats();
      setDistrictData(distData as any);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }

    setIsLoading(false);
  };

  // Compute month-over-month trend from monthlyStats (last month vs the month before).
  // Returns a string like "+12%", "-5%", "new" (when prior month was 0), or null when
  // there isn't enough history to compute a delta.
  const computeTrend = (key: "donors" | "requests"): string | null => {
    if (monthlyStats.length < 2) return null;
    const current = Number(monthlyStats[monthlyStats.length - 1][key]) || 0;
    const previous = Number(monthlyStats[monthlyStats.length - 2][key]) || 0;
    if (previous === 0) return current > 0 ? "new" : null;
    const delta = ((current - previous) / previous) * 100;
    return `${delta >= 0 ? "+" : ""}${Math.round(delta)}%`;
  };

  const donorsTrend = computeTrend("donors");
  const requestsTrend = computeTrend("requests");

  const statCards = [
    {
      label: t("total_users"),
      value: stats.totalUsers,
      icon: Users,
      color: "bg-blue-500",
      trend: donorsTrend,
    },
    {
      label: t("total_donors"),
      value: stats.totalDonors,
      icon: Droplets,
      color: "bg-red-500",
      trend: donorsTrend,
    },
    {
      label: t("active_requests"),
      value: stats.activeRequests,
      icon: HeartPulse,
      color: "bg-amber-500",
      trend: requestsTrend,
    },
    {
      label: t("total_hospitals"),
      value: stats.totalHospitals,
      icon: Hospital,
      color: "bg-green-500",
      trend: null,
    },
  ];

  const getDistrictName = (districtId: string) => {
    const district = RANGPUR_DISTRICTS.find((d) => d.id === districtId);
    if (district) return locale === "bn" ? district.name_bn : district.name_en;
    return districtId;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <StatsBarSkeleton count={4} />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t("analytics")}</h1>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
        >
          {t("refresh_data")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 ${stat.color} text-white rounded-2xl flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                {stat.trend && (
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      stat.trend === "new"
                        ? "bg-blue-100 text-blue-700"
                        : stat.trend.startsWith("+")
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {stat.value.toLocaleString()}
              </div>
              <div className="text-sm text-slate-500 font-medium mt-1">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-red-600" />
            <h3 className="text-base md:text-lg font-bold text-slate-900">
              {t("district_distribution")}
            </h3>
          </div>

          {districtData.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="text-sm text-slate-500 mb-3">
                    {t("donors_by_district")}
                  </p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={districtData.map((d) => ({
                          name: getDistrictName(d.district),
                          donors: d.donor_count || 0,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#475569", fontSize: 12 }}
                          width={90}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Bar
                          dataKey="donors"
                          fill="#ef4444"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500 mb-3">
                    {t("users_by_role_district")}
                  </p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={districtData.map((d) => ({
                          name: getDistrictName(d.district),
                          donors: d.donor_count || 0,
                          hospitals: d.hospital_count || 0,
                          patients: d.patient_count || 0,
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 10 }}
                          angle={-30}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="donors"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          name={t("donor")}
                        />
                        <Bar
                          dataKey="hospitals"
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                          name={t("hospital")}
                        />
                        <Bar
                          dataKey="patients"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          name={t("patient")}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">
                        {t("district")}
                      </th>
                      <th className="center py-2 px-3 text-slate-500 font-medium">
                        {t("donor")}
                      </th>
                      <th className="center py-2 px-3 text-slate-500 font-medium">
                        {t("hospital")}
                      </th>
                      <th className="center py-2 px-3 text-slate-500 font-medium">
                        {t("patient")}
                      </th>
                      <th className="center py-2 px-3 text-slate-500 font-medium">
                        {t("total")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtData.map((d, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-50 hover:bg-slate-50"
                      >
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {getDistrictName(d.district)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-red-600 font-medium">
                            {d.donor_count || 0}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-green-600 font-medium">
                            {d.hospital_count || 0}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-blue-600 font-medium">
                            {d.patient_count || 0}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                          {d.donors}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400">
              {t("no_data_yet")}
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h3 className="text-lg font-bold text-slate-900">
              {t("monthly_trends")}
            </h3>
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              {(["daily", "weekly", "monthly"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    timePeriod === period
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {period === "daily" && (t("daily") || "Daily")}
                  {period === "weekly" && (t("weekly") || "Weekly")}
                  {period === "monthly" && (t("monthly") || "Monthly")}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic chart based on selected period */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {timePeriod === "monthly" ? (
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                  <Legend />
                  <Line type="monotone" dataKey="requests" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: "#ef4444" }} name={t("requests")} />
                  <Line type="monotone" dataKey="donors" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6" }} name={t("donors")} />
                  <Line type="monotone" dataKey="donations" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981" }} name={t("donations") || "Donations"} />
                </LineChart>
              ) : timePeriod === "weekly" ? (
                <BarChart data={weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="weekLabel" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                  <Legend />
                  <Bar dataKey="donations" fill="#10b981" radius={[4, 4, 0, 0]} name={t("donations") || "Donations"} />
                  <Bar dataKey="newDonors" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t("new_donors") || "New Donors"} />
                  <Bar dataKey="newRequests" fill="#ef4444" radius={[4, 4, 0, 0]} name={t("new_requests") || "New Requests"} />
                </BarChart>
              ) : (
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                  <Legend />
                  <Bar dataKey="donations" fill="#10b981" radius={[4, 4, 0, 0]} name={t("donations") || "Donations"} />
                  <Bar dataKey="newDonors" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t("new_donors") || "New Donors"} />
                  <Bar dataKey="newRequests" fill="#ef4444" radius={[4, 4, 0, 0]} name={t("new_requests") || "New Requests"} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Per-period summary table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">{timePeriod === "daily" ? (t("date") || "Date") : timePeriod === "weekly" ? (t("week") || "Week") : (t("month") || "Month")}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t("donations") || "Donations"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t("units") || "Units"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t("new_donors") || "New Donors"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t("new_users") || "New Users"}</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">{t("new_requests") || "New Requests"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(timePeriod === "monthly" ? monthlyStats.slice().reverse() : timePeriod === "weekly" ? weeklyStats.slice().reverse() : dailyStats.slice().reverse()).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {timePeriod === "monthly" ? row.month : timePeriod === "weekly" ? row.weekLabel : row.date}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{row.donations ?? row.donations ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{row.units ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-blue-600 font-medium">{row.newDonors ?? row.donors ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{row.newUsers ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-red-600 font-medium">{row.newRequests ?? row.requests ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            {t("blood_group_distribution")}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bloodGroupStats}
                  dataKey="count"
                  nameKey="blood_group"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }: any) => `${name}: ${value}`}
                >
                  {bloodGroupStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            {t("urgency_breakdown")}
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={urgencyStats} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            {t("request_status")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-2xl text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.activeRequests}
              </div>
              <div className="text-sm text-green-700 font-medium">
                {t("active")}
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.fulfilledRequests}
              </div>
              <div className="text-sm text-blue-700 font-medium">
                {t("fulfilled")}
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <div className="text-3xl font-bold text-slate-600">
                {stats.totalRequests -
                  stats.activeRequests -
                  stats.fulfilledRequests}
              </div>
              <div className="text-sm text-slate-700 font-medium">
                {t("expired")}
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-2xl text-center">
              <div className="text-3xl font-bold text-red-600">
                {stats.totalRequests}
              </div>
              <div className="text-sm text-red-700 font-medium">
                {t("total")}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="font-semibold text-slate-900 mb-4">
              {t("fulfillment_rate")}
            </h4>
            <div className="w-full bg-slate-100 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all"
                style={{
                  width: `${stats.totalRequests > 0 ? (stats.fulfilledRequests / stats.totalRequests) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {stats.totalRequests > 0
                ? Math.round(
                    (stats.fulfilledRequests / stats.totalRequests) * 100,
                  )
                : 0}
              % {t("fulfillment_rate_desc")}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-6">
          {t("recent_activity")}
        </h3>
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              {t("no_recent_activity")}
            </p>
          ) : (
            recentActivity.map((user, index) => (
              <div
                key={user.id || index}
                className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    {user.role === "donor" ? (
                      <Droplets className="w-5 h-5 text-red-500" />
                    ) : user.role === "hospital" ? (
                      <Hospital className="w-5 h-5 text-green-500" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {user.full_name_bn || user.hospital_name_bn || "Unknown"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {user.role === "donor"
                        ? t("donor")
                        : user.role === "hospital"
                          ? t("hospital")
                          : t("patient")}
                      {user.blood_group && ` • ${user.blood_group}`}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
