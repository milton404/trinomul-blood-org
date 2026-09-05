'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { serverGetPublicTransparencyStats } from '@/lib/db-actions';
import { RANGPUR_DISTRICTS } from '@/lib/constants/rangpur';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import {
  HeartPulse,
  Droplets,
  Users,
  MapPin,
  TrendingUp,
  Hospital,
  Activity,
  Calendar,
  Shield,
  FileCheck,
  BarChart3,
  Loader2,
  Award,
} from 'lucide-react';
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
} from 'recharts';

interface TransparencyStats {
  totalDonations: number;
  totalUnits: number;
  totalDonors: number;
  totalRequests: number;
  fulfilledRequests: number;
  activeRequests: number;
  totalHospitals: number;
  districtsCovered: number;
  livesSaved: number;
  donationsThisMonth: number;
  donationsThisYear: number;
  fulfillmentRate: number;
  bloodGroupDistribution: { blood_group: string; count: number }[];
  monthlyTrends: { month: string; donations: number; units: number }[];
  districtDonors: { district: string; count: number }[];
}

const COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

export default function TransparencyPage() {
  const t = useTranslations('transparency');
  const locale = useLocale();
  const isBn = locale === 'bn';

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<TransparencyStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await serverGetPublicTransparencyStats();
        if (!cancelled) setStats(data);
      } catch (error) {
        console.error('Error fetching transparency stats:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getDistrictName = (districtId: string) => {
    const district = RANGPUR_DISTRICTS.find((d) => d.id === districtId);
    if (district) return isBn ? district.name_bn : district.name_en;
    return districtId;
  };

  const impactCards = [
    {
      label: t('lives_saved'),
      value: stats?.totalUnits ?? 0,
      icon: HeartPulse,
      color: 'bg-red-500',
      desc: isBn ? 'রক্তদান দ্বারা প্রভাবিত' : 'Impacted by donations',
    },
    {
      label: t('total_donations'),
      value: stats?.totalDonations ?? 0,
      icon: Droplets,
      color: 'bg-blue-500',
      desc: isBn ? 'সর্বমোট রক্তদান' : 'All-time donations',
    },
    {
      label: t('active_donors'),
      value: stats?.totalDonors ?? 0,
      icon: Users,
      color: 'bg-green-500',
      desc: isBn ? 'নিবন্ধিত সক্রিয় রক্তদাতা' : 'Registered active donors',
    },
    {
      label: t('districts_covered'),
      value: stats?.districtsCovered ?? 0,
      icon: MapPin,
      color: 'bg-amber-500',
      desc: isBn ? 'রংপুর বিভাগজুড়ে' : 'Across Rangpur division',
    },
  ];

  const commitmentItems = [
    {
      icon: FileCheck,
      text: t('commitment_1'),
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: BarChart3,
      text: t('commitment_2'),
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: Shield,
      text: t('commitment_3'),
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  const fulfillmentPct = stats?.fulfillmentRate ?? 0;
  const monthlyData = (stats?.monthlyTrends ?? []).map((m) => ({
    month: m.month,
    donations: m.donations,
    units: m.units,
  }));
  const bloodGroupData = stats?.bloodGroupDistribution ?? [];
  const districtData = (stats?.districtDonors ?? []).map((d) => ({
    name: getDistrictName(d.district),
    donors: d.count,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-grow">
        {/* Hero section: green-to-red gradient */}
        <section className="bg-gradient-to-br from-green-600 via-yellow-500 to-red-600 text-white py-16">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isBn ? 'স্বচ্ছতা ড্যাশবোর্ড' : 'Transparency Dashboard'}
            </h1>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            ) : (
              <>
                {/* Impact stat cards row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {impactCards.map((stat, i) => {
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
                        </div>
                        <div className="text-3xl font-bold text-slate-900">
                          {stat.value.toLocaleString()}
                        </div>
                        <div className="text-sm font-semibold text-slate-700 mt-1">
                          {stat.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {stat.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Secondary stats: this month / this year / hospitals / active requests */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-slate-900">
                        {(stats?.donationsThisMonth ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {t('donations_this_month')}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-slate-900">
                        {(stats?.donationsThisYear ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {t('donations_this_year')}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Hospital className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-slate-900">
                        {(stats?.totalHospitals ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {t('total_hospitals')}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <Activity className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-slate-900">
                        {(stats?.activeRequests ?? 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {t('active_requests')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fulfillment rate progress bar */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">
                      {t('fulfillment_rate')}
                    </h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {fulfillmentPct}%
                      </div>
                      <div className="text-xs text-slate-500">
                        {(stats?.fulfilledRequests ?? 0).toLocaleString()} /{' '}
                        {(stats?.totalRequests ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all"
                      style={{ width: `${fulfillmentPct}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    {fulfillmentPct}% {t('fulfillment_rate_desc')}
                  </p>
                </div>

                {/* Charts grid: monthly trends + blood group distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Monthly donation trends line chart */}
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">
                      {t('monthly_trends')}
                    </h3>
                    {monthlyData.length > 0 ? (
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 12 }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#94a3b8', fontSize: 12 }}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="donations"
                              stroke="#ef4444"
                              strokeWidth={3}
                              dot={{ r: 4, fill: '#ef4444' }}
                              name={isBn ? 'রক্তদান' : 'Donations'}
                            />
                            <Line
                              type="monotone"
                              dataKey="units"
                              stroke="#22c55e"
                              strokeWidth={3}
                              dot={{ r: 4, fill: '#22c55e' }}
                              name={isBn ? 'ইউনিট' : 'Units'}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-slate-400">
                        {isBn ? 'কোনো তথ্য নেই' : 'No data yet'}
                      </div>
                    )}
                  </div>

                  {/* Blood group distribution pie chart */}
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">
                      {t('blood_group_distribution')}
                    </h3>
                    {bloodGroupData.length > 0 ? (
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={bloodGroupData}
                              dataKey="count"
                              nameKey="blood_group"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ name, value }: any) =>
                                `${name}: ${value}`
                              }
                            >
                              {bloodGroupData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                borderRadius: '16px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-slate-400">
                        {isBn ? 'কোনো তথ্য নেই' : 'No data yet'}
                      </div>
                    )}
                  </div>
                </div>

                {/* District-wise donor distribution bar chart (horizontal) */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-6">
                    <MapPin className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-bold text-slate-900">
                      {t('district_distribution')}
                    </h3>
                  </div>
                  {districtData.length > 0 ? (
                    <div className="h-[340px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={districtData}
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
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#475569', fontSize: 12 }}
                            width={110}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '12px',
                              border: 'none',
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            }}
                          />
                          <Bar
                            dataKey="donors"
                            fill="#ef4444"
                            radius={[0, 4, 4, 0]}
                            name={isBn ? 'রক্তদাতা' : 'Donors'}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-slate-400">
                      {isBn ? 'কোনো তথ্য নেই' : 'No data yet'}
                    </div>
                  )}
                </div>

                {/* How We Operate section */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-red-500 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {t('how_we_operate')}
                    </h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-8">
                    {t('how_we_operate_desc')}
                  </p>

                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    {t('transparency_commitment')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {commitmentItems.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={i}
                          className={`p-5 ${item.bg} rounded-2xl flex gap-3 items-start`}
                        >
                          <div
                            className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                      {isBn
                        ? 'এই ড্যাশবোর্ড সরাসরি আমাদের ডাটাবেস থেকে সর্বজনীন সমষ্টিগত তথ্য প্রদর্শন করে।'
                        : 'This dashboard displays public aggregate data directly from our database.'}
                    </p>
                    <a
                      href={`/${locale}/leaderboard`}
                      className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl text-sm font-semibold hover:from-red-700 hover:to-red-800 transition-colors whitespace-nowrap"
                    >
                      {t('view_leaderboard')}
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
