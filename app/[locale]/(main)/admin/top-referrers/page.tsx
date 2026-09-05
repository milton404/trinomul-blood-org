'use client';

import { useState, useEffect } from 'react';
import { ListSkeleton } from "@/components/ui/Skeleton";
import { serverGetTopReferrers } from '@/lib/db-actions';
import { useTranslations } from 'next-intl';
import {
  Handshake, Trophy, Award, Users, TrendingUp, Crown, Medal, Star,
} from 'lucide-react';

interface Referrer {
  id: string;
  referrer_name: string;
  referrer_name_bn: string;
  referrer_phone: string;
  referral_count: number;
}

export default function TopReferrersPage() {
  const t = useTranslations('admin');
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReferrers = async () => {
      try {
        const data = await serverGetTopReferrers(50);
        setReferrers(data as Referrer[]);
      } catch (error) {
        console.error('Error fetching referrers:', error);
      }
      setIsLoading(false);
    };
    fetchReferrers();
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            {t('top_referrers') || 'Top Referrers'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('top_referrers_desc') || 'People who helped find donors for blood requests'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : referrers.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Handshake className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t('no_referrers') || 'No referrers yet'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {referrers.slice(0, 3).map((referrer, index) => (
              <div
                key={referrer.id}
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
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">
                      {referrer.referrer_name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {referrer.referrer_phone}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-2xl font-bold text-slate-900">
                    {referrer.referral_count}
                  </span>
                  <span className="text-sm text-slate-500">
                    {t('referrals') || 'referrals'}
                  </span>
                </div>
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
                      {t('referrer') || 'Referrer'}
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                      {t('contact') || 'Contact'}
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                      {t('referrals') || 'Referrals'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrers.map((referrer, index) => (
                    <tr
                      key={referrer.id}
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
                              : 'bg-indigo-100 text-indigo-600'
                          }`}>
                            <Handshake className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {referrer.referrer_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {referrer.referrer_phone}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-slate-900">
                            {referrer.referral_count}
                          </span>
                          <span className="text-xs text-slate-400">
                            {t('referrals') || 'referrals'}
                          </span>
                        </div>
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