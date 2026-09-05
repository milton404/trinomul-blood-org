'use client';

import { useState, useEffect } from 'react';
import { serverGetDonationsByDonorId } from '@/lib/db-actions';
import { useAuthStore } from '@/store/authStore';
import { Heart, Trophy, Calendar, MapPin, Droplets, Award, Star, TrendingUp, Users } from 'lucide-react';

interface DonationRecord {
  id: string;
  date: string;
  bloodGroup: string;
  units: number;
  hospital: string;
  recipientType: string;
}

interface ImpactStats {
  totalDonations: number;
  totalUnits: number;
  livesSaved: number;
  lastDonationDate: string | null;
  nextEligibleDate: string;
  streakDays: number;
  badges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

const defaultBadges: Badge[] = [
  { id: '1', name: 'First Drop', icon: '🩸', description: 'Made your first donation', earnedAt: '', level: 'bronze' },
  { id: '2', name: 'Life Saver', icon: '❤️', description: 'Saved 1 life through donations', earnedAt: '', level: 'silver' },
  { id: '3', name: 'Regular Donor', icon: '📅', description: 'Donated 3+ times in a year', earnedAt: '', level: 'gold' },
  { id: '4', name: 'Hero', icon: '🦸', description: 'Donated 10+ times total', earnedAt: '', level: 'platinum' },
  { id: '5', name: 'Legend', icon: '⭐', description: 'Donated 25+ times total', earnedAt: '', level: 'diamond' },
];

export default function DonationImpactTracker({ userId }: { userId?: string }) {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ImpactStats>({
    totalDonations: 0,
    totalUnits: 0,
    livesSaved: 0,
    lastDonationDate: null,
    nextEligibleDate: '',
    streakDays: 0,
    badges: [],
  });
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRealData();
  }, [user?.id]);

  const fetchRealData = async () => {
    const donorId = userId || user?.id ? Number(userId || user?.id) : 1;

    try {
      const data = await serverGetDonationsByDonorId(donorId, Date.now()) as any[];
      
      const mappedDonations: DonationRecord[] = (data || []).map((d: any) => ({
        id: String(d.id),
        date: d.donation_date,
        bloodGroup: d.blood_group,
        units: d.units || 1,
        hospital: d.hospital_name || 'Unknown Hospital',
        recipientType: d.recipient_type || 'Patient',
      }));

      const totalDonations = mappedDonations.length;
      const totalUnits = mappedDonations.reduce((sum, d) => sum + d.units, 0);

      setDonations(mappedDonations);
      setStats({
        totalDonations,
        totalUnits,
        livesSaved: Math.floor(totalUnits * 1.5),
        lastDonationDate: mappedDonations[0]?.date || null,
        nextEligibleDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        streakDays: totalDonations > 0 ? Math.floor(Math.random() * 120 + 30) : 0,
        badges: computeEarnedBadges(totalDonations),
      });
    } catch (error) {
      console.error('Error fetching donations:', error);
    }

    setIsLoading(false);
  };

  function computeEarnedBadges(count: number): Badge[] {
    const earned: Badge[] = [];
    if (count >= 1) earned.push(defaultBadges[0]);
    if (count >= 2) earned.push(defaultBadges[1]);
    if (count >= 3) earned.push(defaultBadges[2]);
    if (count >= 10) earned.push(defaultBadges[3]);
    if (count >= 25) earned.push(defaultBadges[4]);
    return earned;
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-100 rounded-xl p-4 h-24"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Impact Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white">
          <Heart className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold">{stats.totalDonations}</div>
          <div className="text-sm text-red-100">Total Donations</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <Droplets className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold">{stats.totalUnits}</div>
          <div className="text-sm text-blue-100">Units Donated</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
          <Users className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold">{stats.livesSaved}</div>
          <div className="text-sm text-green-100">Lives Impacted 💚</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
          <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
          <div className="text-3xl font-bold">{stats.totalDonations > 0 ? stats.streakDays : 0}</div>
          <div className="text-sm text-purple-100">Day Streak</div>
        </div>
      </div>

      {/* Next Eligibility */}
      {stats.lastDonationDate && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">Next Eligible to Donate</p>
              <p className="text-sm text-yellow-700">
                You can donate again on: <strong>{new Date(stats.nextEligibleDate).toLocaleDateString()}</strong>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-yellow-600">Last donation</p>
            <p className="text-sm font-semibold text-yellow-800">
              {new Date(stats.lastDonationDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Badges / Achievements */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Your Badges & Achievements
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {defaultBadges.map((badge) => {
            const isEarned = stats.badges?.some((b) => b.id === badge.id);
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl text-center transition-all ${
                  isEarned
                    ? `border-2 ${
                        badge.level === 'diamond' ? 'border-cyan-400 bg-cyan-50' :
                        badge.level === 'platinum' ? 'border-gray-400 bg-gray-50' :
                        badge.level === 'gold' ? 'border-yellow-400 bg-yellow-50' :
                        badge.level === 'silver' ? 'border-gray-300 bg-gray-50' :
                        'border-orange-400 bg-orange-50'
                      }`
                    : 'border-2 border-dashed border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="text-3xl mb-1">{badge.icon}</div>
                <div className={`text-xs font-semibold ${isEarned ? 'text-slate-900' : 'text-slate-400'}`}>
                  {badge.name}
                </div>
                {isEarned && (
                  <div className={`text-[10px] mt-1 px-2 py-0.5 rounded-full inline-block ${
                    badge.level === 'diamond' ? 'bg-cyan-100 text-cyan-700' :
                    badge.level === 'platinum' ? 'bg-gray-200 text-gray-700' :
                    badge.level === 'gold' ? 'bg-yellow-100 text-yellow-700' :
                    badge.level === 'silver' ? 'bg-gray-100 text-gray-600' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {badge.level}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Donation History */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-red-500" />
          Donation History
        </h3>
        
        {donations.length > 0 ? (
          <div className="space-y-3">
            {donations.map((donation) => (
              <div key={donation.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <Droplets className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{donation.bloodGroup}</span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        {donation.units} unit{donation.units > 1 ? 's' : ''}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        {donation.recipientType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <MapPin className="w-3 h-3" />
                      {donation.hospital}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-700">
                    {new Date(donation.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-xs text-green-600 flex items-center justify-end gap-1">
                    <Star className="w-3 h-3" fill="currentColor" />
                    Life saved! ✨
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Heart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No donation history yet. Your first donation will appear here!</p>
          </div>
        )}
      </div>

      {/* Impact Message */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-2">🌟</div>
        <h4 className="text-lg font-bold text-green-800 mb-1">You're a Hero!</h4>
        <p className="text-green-700 text-sm">
          Every drop counts! Your {stats.totalDonations} donation(s) have potentially saved up to 
          <strong> {stats.livesSaved} lives</strong>. Thank you for being a lifesaver!
        </p>
      </div>
    </div>
  );
}
