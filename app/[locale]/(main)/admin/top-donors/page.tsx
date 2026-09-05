'use client';

import { useState, useEffect } from 'react';
import { ListSkeleton } from "@/components/ui/Skeleton";
import { serverGetTopDonors } from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import {
  Droplets, Trophy, Award, TrendingUp, Crown, Medal, Star,
  MapPin, Calendar,
} from 'lucide-react';

interface TopDonor {
  id: number;
  full_name_en: string | null;
  full_name_bn: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  total_donations: number;
  total_units: number;
  last_donation_date: string | null;
  badges: string[];
}

export default function AdminTopDonorsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [donors, setDonors] = useState<TopDonor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDonors = async () => {
      try {
        const data = await serverGetTopDonors(50);
        setDonors(data as TopDonor[]);
      } catch (error) {
        console.error('Error fetching top donors:', error);
      }
      setIsLoading(false);
    };
    fetchDonors();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-semibold text-slate-500">{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-yellow-500';
    if (rank === 2) return 'bg-gradient-to-r from-slate-300 to-slate-400 text-white border-slate-400';
    if (rank === 3) return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-500';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getDonorName = (d: TopDonor) => {
    if (locale === 'bn') return d.full_name_bn || d.full_name_en || '-';
    return d.full_name_en || d.full_name_bn || '-';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            {t('top_donors') || 'Top Donors'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('top_donors_desc') || 'Donors ranked by total donations'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : donors.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Droplets className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t('no_top_donors') || 'No donations recorded yet'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {donors.slice(0, 3).map((donor, index) => (
              <div
                key={donor.id}
                className={`relative overflow-hidden rounded-2xl border-2 ${
                  index === 0
                    ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50'
                    : index === 1
                    ? 'border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100'
                    : 'border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50'
                } p-6`}
              >
                <div className="absolute top-4 right-4">
                  {index === 0 && <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />}
                  {index === 1 && <Star className="w-6 h-6 text-slate-400 fill-slate-400" />}
                  {index === 2 && <Star className="w-6 h-6 text-amber-500 fill-amber-500" />}
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    index === 0
                      ? 'bg-yellow-400 text-white'
                      : index === 1
                      ? 'bg-slate-400 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {getRankIcon(index + 1)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-lg truncate">
                      {getDonorName(donor)}
                    </h3>
                    {donor.blood_group && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-full text-xs">
                        {donor.blood_group}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-2xl font-bold text-slate-900">
                      {donor.total_donations}
                    </span>
                    <span className="text-sm text-slate-500">
                      {t('donations') || 'donations'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-red-600" />
                    <span className="text-lg font-bold text-slate-900">
                      {donor.total_units}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t('units') || 'units'}
                    </span>
                  </div>
                </div>
                {donor.district && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-3">
                    <MapPin className="w-3 h-3" />
                    {donor.district}{donor.upazila ? `, ${donor.upazila}` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600 w-16">
                      {t('rank') || 'Rank'}
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                      {t('donor') || 'Donor'}
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                      {t('blood_group') || 'Blood Group'}
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                      {t('district') || 'District'}
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                      {t('donations') || 'Donations'}
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                      {t('units') || 'Units'}
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                      {t('last_donation') || 'Last Donation'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {donors.map((donor, index) => (
                    <tr
                      key={donor.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${getRankBadge(index + 1)}`}>
                          {getRankIcon(index + 1)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            index === 0
                              ? 'bg-yellow-100 text-yellow-600'
                              : index === 1
                              ? 'bg-slate-200 text-slate-600'
                              : index === 2
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            <Droplets className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {getDonorName(donor)}
                            </p>
                            {donor.badges && donor.badges.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {donor.badges.map((badge) => (
                                  <span key={badge} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded">
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {donor.blood_group && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-full text-sm">
                            {donor.blood_group}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {donor.district ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {donor.district}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xl font-bold text-slate-900">
                          {donor.total_donations}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-red-600">
                          {donor.total_units}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {donor.last_donation_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(donor.last_donation_date).toLocaleDateString()}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}