'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Trophy, Medal, Award, Heart, Droplets, MapPin, TrendingUp, Share2,
  Crown, Star, Loader2, Users, Handshake, ArrowUpRight, BarChart3,
} from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import {
  serverGetTopDonors,
  serverGetTopReferrers,
  serverGetDonorOfTheMonth,
  serverGetDonationImpactStats,
} from '@/lib/db-actions';

interface TopDonor {
  id: number;
  full_name_en: string | null;
  full_name_bn: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  show_on_leaderboard: boolean;
  total_donations: number;
  total_units: number;
  last_donation_date: string | null;
  badges: string[];
}

interface DonorOfTheMonth {
  id: number;
  full_name_en: string | null;
  full_name_bn: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  monthly_donations: number;
  monthly_units: number;
  total_donations: number;
  badges: string[];
}

interface ImpactStats {
  totalUnits: number;
  livesImpacted: number;
  activeDistricts: number;
  avgDonationsPerDonor: number;
}

interface TopReferrer {
  referrer_profile_id: number | null;
  referrer_name: string | null;
  referrer_name_bn: string | null;
  referrer_phone: string | null;
  blood_group: string | null;
  district: string | null;
  upazila: string | null;
  total_referrals: number;
  last_referral_date: string | null;
}

const BADGE_STYLES: Record<string, string> = {
  'First Drop': 'bg-blue-50 text-blue-700 ring-blue-100',
  'Regular Donor': 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  Silver: 'bg-slate-100 text-slate-700 ring-slate-200',
  Gold: 'bg-amber-50 text-amber-700 ring-amber-100',
  Platinum: 'bg-violet-50 text-violet-700 ring-violet-100',
  Newbie: 'bg-slate-50 text-slate-500 ring-slate-100',
};

function badgeClass(badge: string): string {
  return BADGE_STYLES[badge] ?? 'bg-slate-50 text-slate-600 ring-slate-100';
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function bloodGroupColor(bg: string | null): string {
  switch (bg) {
    case 'A+': return 'bg-red-500';
    case 'A-': return 'bg-rose-500';
    case 'B+': return 'bg-amber-500';
    case 'B-': return 'bg-orange-500';
    case 'AB+': return 'bg-violet-500';
    case 'AB-': return 'bg-purple-500';
    case 'O+': return 'bg-emerald-500';
    case 'O-': return 'bg-teal-500';
    default: return 'bg-slate-500';
  }
}

function getRankTheme(rank: number) {
  if (rank === 1) return { panel: 'border-amber-200 bg-amber-50', ring: 'bg-amber-400 text-white', icon: 'text-amber-500', label: 'bg-amber-100 text-amber-800' };
  if (rank === 2) return { panel: 'border-slate-200 bg-slate-50', ring: 'bg-slate-400 text-white', icon: 'text-slate-500', label: 'bg-slate-200 text-slate-700' };
  return { panel: 'border-orange-200 bg-orange-50', ring: 'bg-orange-500 text-white', icon: 'text-orange-600', label: 'bg-orange-100 text-orange-800' };
}

export default function LeaderboardPage() {
  const t = useTranslations('leaderboard');
  const locale = useLocale();
  const isBn = locale === 'bn';
  const [donors, setDonors] = useState<TopDonor[]>([]);
  const [referrers, setReferrers] = useState<TopReferrer[]>([]);
  const [donorOfMonth, setDonorOfMonth] = useState<DonorOfTheMonth | null>(null);
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('https://trinomul-blood-bank-rangpur.vercel.app');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const results = await Promise.allSettled([
          serverGetTopDonors(20), serverGetTopReferrers(20), serverGetDonorOfTheMonth(), serverGetDonationImpactStats(),
        ]);
        if (results[0].status === 'fulfilled') setDonors((results[0].value as TopDonor[]) ?? []);
        else console.error('leaderboard topDonors failed:', results[0].reason);
        if (results[1].status === 'fulfilled') setReferrers((results[1].value as TopReferrer[]) ?? []);
        else console.error('leaderboard referrers failed:', results[1].reason);
        if (results[2].status === 'fulfilled') setDonorOfMonth((results[2].value as DonorOfTheMonth | null) ?? null);
        else console.error('leaderboard donorOfMonth failed:', results[2].reason);
        if (results[3].status === 'fulfilled') setStats((results[3].value as ImpactStats) ?? null);
        else console.error('leaderboard impactStats failed:', results[3].reason);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
    if (typeof window !== 'undefined') setShareUrl(window.location.href);
  }, []);

  const donorName = (en: string | null, bn: string | null) =>
    (isBn ? (bn || en) : (en || bn)) || (isBn ? 'অজ্ঞাত দাতা' : 'Anonymous Donor');
  const shareText = t('share_text');
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const podium = donors.slice(0, 3);

  const renderBadges = (badges: string[] = []) => (
    <div className="flex flex-wrap gap-1.5">
      {badges.length === 0 ? <span className="text-xs text-slate-400">—</span> : badges.map((badge, index) => (
        <span key={`${badge}-${index}`} className={`rounded-full px-2 py-1 text-[11px] font-bold ring-1 ${badgeClass(badge)}`}>{badge}</span>
      ))}
    </div>
  );

  const rankIcon = (rank: number, size = 'h-5 w-5') => {
    if (rank === 1) return <Trophy className={`${size} text-amber-500`} />;
    if (rank === 2) return <Medal className={`${size} text-slate-400`} />;
    if (rank === 3) return <Award className={`${size} text-orange-500`} />;
    return <span className="text-sm font-black text-slate-400">#{rank}</span>;
  };

  const statsCards = stats ? [
    { icon: Heart, value: stats.livesImpacted, label: t('lives_impacted'), color: 'text-rose-500', bg: 'bg-rose-50' },
    { icon: Droplets, value: stats.totalUnits, label: t('total_units'), color: 'text-red-500', bg: 'bg-red-50' },
    { icon: MapPin, value: stats.activeDistricts, label: t('active_districts'), color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: TrendingUp, value: stats.avgDonationsPerDonor, label: t('avg_per_donor'), color: 'text-indigo-500', bg: 'bg-indigo-50' },
  ] : [];

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
      <Navbar />
      <main>
        <section className="relative overflow-hidden bg-[#101827] px-4 pb-8 pt-6 text-white md:pb-10 md:pt-8">
          <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-200">
                <Trophy className="h-3 w-3" /> {isBn ? 'কমিউনিটি সম্মাননা' : 'Community honours'}
              </div>
              <h1 className="max-w-xl text-2xl font-black tracking-tight md:text-3xl">{t('title')}</h1>
              <p className="mt-1.5 max-w-xl text-xs leading-5 text-slate-300 md:text-sm">{t('subtitle')}</p>
            </div>
            <div className="mt-4 grid max-w-xl grid-cols-3 gap-3">
              {[
                [donors.length, isBn ? 'র‍্যাঙ্কড দাতা' : 'Ranked donors'],
                [stats?.totalUnits ?? 0, isBn ? 'ইউনিট দান' : 'Units donated'],
                [stats?.activeDistricts ?? 0, isBn ? 'সক্রিয় জেলা' : 'Active districts'],
              ].map(([value, label]) => (
                <div key={label} className="border-l border-white/20 pl-2.5 md:pl-3">
                  <p className="text-lg font-black md:text-xl">{value}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400 md:text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative mx-auto -mt-5 max-w-6xl px-4 pb-16 md:-mt-6">
          {isLoading ? (
            <div className="flex min-h-96 flex-col items-center justify-center rounded-[2rem] bg-white shadow-xl shadow-slate-200/60">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-orange-500" />
              <p className="text-slate-500">{isBn ? 'লোড হচ্ছে...' : 'Loading leaderboard...'}</p>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8">
              {donorOfMonth && (
                <div className="flex flex-col gap-5 rounded-[2rem] border border-orange-200 bg-gradient-to-r from-orange-500 to-rose-500 p-5 text-white shadow-xl shadow-orange-200/40 md:flex-row md:items-center md:justify-between md:p-7">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20"><Crown className="h-7 w-7" /></div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-100">{t('donor_of_month')}</p>
                      <h2 className="mt-1 text-2xl font-black">{donorName(donorOfMonth.full_name_en, donorOfMonth.full_name_bn)}</h2>
                      <p className="mt-1 text-sm text-orange-100">{donorOfMonth.monthly_donations} {t('monthly_donations').toLowerCase()} · {donorOfMonth.total_donations} {t('total_donations').toLowerCase()}</p>
                    </div>
                  </div>
                  {donorOfMonth.blood_group && <span className="w-fit rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold"><Droplets className="mr-1 inline h-4 w-4" />{donorOfMonth.blood_group}</span>}
                </div>
              )}

              {podium.length > 0 && (
                <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 md:p-8">
                  <div className="mb-8 flex items-end justify-between gap-4">
                    <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">{isBn ? 'এই মুহূর্তের র‍্যাঙ্কিং' : 'The current ranking'}</p><h2 className="mt-2 text-2xl font-black md:text-3xl">{t('top_donors')}</h2></div>
                    <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 sm:inline-flex">{isBn ? 'দান সংখ্যার ভিত্তিতে' : 'Based on total donations'}</span>
                  </div>
                  <div className="grid items-end gap-4 md:grid-cols-3 md:gap-5">
                    {[podium[1], podium[0], podium[2]].filter(Boolean).map((donor, displayIndex) => {
                      const rank = donor === podium[0] ? 1 : donor === podium[1] ? 2 : 3;
                      const theme = getRankTheme(rank);
                      return (
                        <article key={donor.id} className={`relative rounded-[1.75rem] border p-5 text-center transition-transform hover:-translate-y-1 ${rank === 1 ? 'order-first md:order-none md:-translate-y-4' : ''} ${theme.panel}`}>
                          {rank === 1 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">{isBn ? 'চ্যাম্পিয়ন' : 'Champion'}</div>}
                          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${theme.ring}`}>{rankIcon(rank, 'h-7 w-7')}</div>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">#{rank}</p>
                          <h3 className="mt-2 truncate text-lg font-black text-slate-900">{donorName(donor.full_name_en, donor.full_name_bn)}</h3>
                          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-500"><span>{donor.district || (isBn ? 'অজানা জেলা' : 'Unknown district')}</span>{donor.blood_group && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${theme.label}`}>{donor.blood_group}</span>}</div>
                          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-black/5 pt-4"><div><p className="text-2xl font-black text-slate-900">{donor.total_donations}</p><p className="text-[11px] font-semibold text-slate-500">{t('donations')}</p></div><div><p className="text-2xl font-black text-slate-900">{donor.total_units}</p><p className="text-[11px] font-semibold text-slate-500">{t('units')}</p></div></div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {stats && <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{statsCards.map(({ icon: Icon, value, label, color, bg }) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div><p className="text-2xl font-black">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500 md:text-sm">{label}</p></div>)}</div>}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                  <div className="flex items-center gap-3 border-b border-slate-100 p-5 md:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100"><Trophy className="h-5 w-5 text-orange-600" /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{isBn ? 'শীর্ষ ১০' : 'Top 10'}</p><h2 className="mt-1 text-xl font-black md:text-2xl">{isBn ? 'শীর্ষ ১০ রক্তদাতা' : 'Top 10 Blood Donors'}</h2></div></div>
                  {donors.length === 0 ? <div className="px-6 py-16 text-center"><Users className="mx-auto mb-3 h-12 w-12 text-slate-300" /><p className="text-slate-500">{t('no_donors')}</p></div> : <ol className="divide-y divide-slate-100">{donors.slice(0, 10).map((donor, index) => { const rank = index + 1; const name = donorName(donor.full_name_en, donor.full_name_bn); return <li key={donor.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-orange-50/40 md:gap-4 md:px-6"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">{rank}</div><div className="relative shrink-0"><div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white ${bloodGroupColor(donor.blood_group)}`}>{initials(name)}</div>{rank === 1 && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white ring-2 ring-white"><Crown className="h-3 w-3" /></span>}{rank === 2 && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-400 text-white ring-2 ring-white"><Medal className="h-3 w-3" /></span>}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{name}</p><div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">{donor.blood_group && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600"><Droplets className="mr-0.5 inline h-2.5 w-2.5" />{donor.blood_group}</span>}<span className="truncate">{donor.district || '—'}</span></div></div><div className="text-right"><p className="text-base font-black">{donor.total_donations}<span className="ml-1 text-[10px] font-semibold text-slate-400">{t('donations')}</span></p><div className="mt-0.5 hidden md:block">{renderBadges(donor.badges)}</div></div></li>; })}</ol>}
                </section>

                <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                  <div className="flex items-center gap-3 border-b border-slate-100 p-5 md:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100"><BarChart3 className="h-5 w-5 text-emerald-600" /></div><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{isBn ? 'পরিসংখ্যান' : 'Summary'}</p><h2 className="mt-1 text-xl font-black md:text-2xl">{isBn ? 'দান রিপোর্ট' : 'Donation Report'}</h2></div></div>
                  <div className="divide-y divide-slate-100">
                    {(stats ? [
                      { icon: Droplets, value: stats.totalUnits, label: t('total_units'), color: 'text-red-500' },
                      { icon: Heart, value: stats.livesImpacted, label: t('lives_impacted'), color: 'text-rose-500' },
                      { icon: MapPin, value: stats.activeDistricts, label: t('active_districts'), color: 'text-emerald-500' },
                      { icon: TrendingUp, value: stats.avgDonationsPerDonor, label: t('avg_per_donor'), color: 'text-indigo-500' },
                    ] : []).map(({ icon: Icon, value, label, color }) => <div key={label} className="flex items-center gap-4 px-5 py-4 md:px-6"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100"><Icon className={`h-4 w-4 ${color}`} /></div><p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-600">{label}</p><p className="text-lg font-black">{value}</p></div>)}
                  </div>
                  <div className="border-t border-slate-100 p-5 md:p-6">
                    <div className="mb-4 flex items-center gap-2"><Handshake className="h-4 w-4 text-indigo-500" /><h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{t('top_referrers')}</h3></div>
                    {referrers.length === 0 ? <p className="text-sm text-slate-400">{t('no_referrers')}</p> : <ol className="divide-y divide-slate-50">{referrers.slice(0, 5).map((referrer, index) => { const name = donorName(referrer.referrer_name, referrer.referrer_name_bn); return <li key={`${referrer.referrer_profile_id ?? referrer.referrer_phone ?? referrer.referrer_name}-${index}`} className="flex items-center gap-3 py-2.5"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${bloodGroupColor(referrer.blood_group)}`}>{initials(name)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{name}</p><p className="truncate text-xs text-slate-400">{referrer.district || '—'}</p></div><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">{referrer.total_referrals}</span></li>; })}</ol>}
                  </div>
                </section>
              </div>

              <section className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-red-600 p-5 text-white shadow-xl shadow-rose-200/50 md:p-6"><ArrowUpRight className="absolute right-4 top-4 h-14 w-14 text-white/10" /><div className="relative"><div className="flex items-center gap-2"><Share2 className="h-4 w-4" /><h2 className="text-lg font-black md:text-xl">{t('share_title')}</h2></div><p className="mt-1 text-sm text-rose-100">{t('share_desc')}</p><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white/90"><Heart className="mr-1.5 inline h-3.5 w-3.5" />{t('share_text')}</div><div className="flex gap-2"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-green-600 transition hover:bg-green-50">{t('share_whatsapp')}</a><a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50">{t('share_facebook')}</a></div></div></div></section>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500"><Users className="mt-1 h-5 w-5 shrink-0 text-slate-400" />{t('privacy_note')}</div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
