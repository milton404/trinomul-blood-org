'use client';

import { useState, useEffect, use } from 'react';
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import { BloodDropLoading } from "@/components/ui/BloodDropLoading";
import {
  serverGetProfileByUserId,
  serverGetDonationsByDonorId,
  serverGetDonorsWithStats,
  serverGetMyAdminContext,
  serverUpdateProfile,
} from '@/lib/db-actions';
import { toast } from 'sonner';
import DonorVerificationPanel from '@/components/admin/DonorVerificationPanel';
import DonorContactStats from '@/components/admin/DonorContactStats';
import DonorQrCard from '@/components/donors/DonorQrCard';
import QuickAddDonationModal from '@/components/admin/QuickAddDonationModal';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Droplet,
  Heart,
  Phone,
  MapPin,
  Calendar,
  Hospital,
  User,
  Loader2,
  Handshake,
  Activity,
  ShieldCheck,
  Clock,
  FileText,
  MessageCircle,
  Edit2,
  Power,
  Download,
  Plus,
  AlertTriangle,
  CheckCircle,
  X,
  Star,
  QrCode as QrCodeIcon,
} from 'lucide-react';

interface Donation {
  id: number;
  blood_group: string;
  units: number;
  hospital_name: string | null;
  donation_date: string;
  donation_type?: string;
  recipient_type: string;
  notes: string | null;
  request_id: number | null;
}

interface DonorProfile {
  id: number;
  email: string;
  full_name_bn: string;
  full_name_en: string;
  phone: string;
  blood_group: string;
  sex: string;
  date_of_birth: string;
  district: string;
  upazila: string;
  union_name: string;
  address: string;
  role: string;
  is_active: boolean;
  created_at: string;
  weight_kg?: number;
  alternative_phone?: string;
  whatsapp_number?: string;
  preferred_contact?: string;
  occupation?: string;
  has_chronic_disease?: number;
  disease_details?: string;
  hb_level?: number | null;
  last_hb_test_date?: string | null;
  last_donation_date?: string | null;
  last_donation_type?: string | null;
  phone_verified?: number;
  show_on_leaderboard?: number;
  organization_id?: number;
  // Donor identity verification (NID + admin approval)
  nid_number?: string | null;
  nid_front_url?: string | null;
  nid_back_url?: string | null;
  nid_uploaded_at?: string | null;
  is_verified?: number;
  verification_status?: string;
  verified_by_admin_id?: number | null;
  verified_at?: string | null;
  verification_note?: string | null;
  // Presence + response metrics
  last_active_at?: string | null;
  response_count?: number;
  response_total_ms?: number;
  // Anonymous mode (hide name on public profile)
  is_anonymous?: number;
}

interface DonorStats {
  total_donations?: number;
  total_units?: number;
  total_referrals?: number;
  is_eligible?: boolean;
  eligible_whole_blood?: boolean;
  eligible_platelets?: boolean;
  eligible_plasma?: boolean;
  next_eligible_date?: string | null;
  badges?: string[];
}

const DONATION_TYPE_LABELS: Record<string, string> = {
  whole_blood: 'Whole Blood',
  platelets: 'Platelets',
  plasma: 'Plasma',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso.replace(' ', 'T') + (iso.includes('T') ? '' : 'Z')).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso.replace(' ', 'T') + (iso.includes('T') ? '' : 'Z')).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AdminDonorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const donorId = parseInt(id, 10);

  const t = useTranslations('admin');
  const locale = useLocale();
  const isBn = locale === 'bn';
  const router = useRouter();

  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<DonorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminCtx, setAdminCtx] = useState<{ isFullAdmin: boolean; isDistrictAdmin: boolean; role: string } | null>(null);
  const [showAddDonationModal, setShowAddDonationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name_bn: '',
    full_name_en: '',
    phone: '',
    blood_group: '',
    district: '',
    upazila: '',
    union_name: '',
    address: '',
  });

  const refreshProfile = () => {
    serverGetProfileByUserId(donorId).then((p) => setProfile(p as DonorProfile | null));
    serverGetDonorsWithStats().then((allDonors) => {
      const match = (allDonors as any[])?.find((d) => d.id === donorId);
      setStats(match || null);
    });
  };

  const handleToggleActive = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await serverUpdateProfile(profile.id, { is_active: profile.is_active ? 0 : 1 });
      toast.success(profile.is_active ? 'Donor deactivated' : 'Donor activated');
      refreshProfile();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    }
    setSaving(false);
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditForm({
      full_name_bn: profile.full_name_bn || '',
      full_name_en: profile.full_name_en || '',
      phone: profile.phone || '',
      blood_group: profile.blood_group || '',
      district: profile.district || '',
      upazila: profile.upazila || '',
      union_name: profile.union_name || '',
      address: profile.address || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await serverUpdateProfile(profile.id, {
        full_name_bn: editForm.full_name_bn,
        full_name_en: editForm.full_name_en,
        phone: editForm.phone,
        blood_group: editForm.blood_group || null,
        district: editForm.district || null,
        upazila: editForm.upazila || null,
        union_name: editForm.union_name || null,
        address: editForm.address || null,
      });
      toast.success('Donor profile updated');
      setShowEditModal(false);
      refreshProfile();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    }
    setSaving(false);
  };

  useEffect(() => {
    serverGetMyAdminContext().then(setAdminCtx).catch(() => setAdminCtx(null));
  }, []);

  useEffect(() => {
    if (!donorId || Number.isNaN(donorId)) return;
    setIsLoading(true);
    Promise.all([
      serverGetProfileByUserId(donorId).catch(() => null),
      serverGetDonationsByDonorId(donorId, Date.now()).catch(() => []),
      serverGetDonorsWithStats().catch(() => []),
    ])
      .then(([p, dons, allDonors]) => {
        setProfile(p as DonorProfile | null);
        setDonations((dons as Donation[]) || []);
        const match = (allDonors as any[])?.find((d) => d.id === donorId);
        setStats(match || null);
      })
      .finally(() => setIsLoading(false));
  }, [donorId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="pt-8">
          <BloodDropLoading label="Loading" size={64} />
        </div>
        <DetailPageSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500 font-medium">Donor not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    );
  }

  const fullName = locale === 'bn' ? profile.full_name_bn || profile.full_name_en : profile.full_name_en || profile.full_name_bn;
  const totalDonations = stats?.total_donations ?? donations.length;
  const totalUnits = stats?.total_units ?? donations.reduce((sum, d) => sum + (d.units || 0), 0);
  const totalReferrals = stats?.total_referrals ?? 0;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
              <Droplet className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2.5 py-1 bg-red-100 text-red-700 font-bold text-sm rounded-lg">
                  {profile.blood_group}
                </span>
                <span className={`px-2.5 py-1 font-bold text-xs rounded-lg ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-slate-400">{profile.role}</span>
                {profile.phone_verified === 1 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-200">
                    <CheckCircle className="w-2.5 h-2.5" />
                    Verified
                  </span>
                )}
                {profile.has_chronic_disease && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-200">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Chronic
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{profile.phone}</span>
                <span className="sm:hidden">Call</span>
              </a>
            )}
            {profile.whatsapp_number && (() => {
              let waNum = profile.whatsapp_number.replace(/\D/g, '');
              if (waNum.startsWith('880')) { /* already international */ }
              else if (waNum.startsWith('0')) waNum = '880' + waNum.slice(1);
              else if (waNum.startsWith('1') && waNum.length === 10) waNum = '880' + waNum;
              return (
                <a
                  href={`https://wa.me/${waNum}?text=${encodeURIComponent('Hello, I saw your profile on Trinomul Blood Bank.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1DA851] transition-colors text-sm font-medium"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              );
            })()}
            <button
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
              title="Edit profile"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={handleToggleActive}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors text-sm font-medium disabled:opacity-50 ${
                profile.is_active
                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                  : 'border-green-200 text-green-600 hover:bg-green-50'
              }`}
              title={profile.is_active ? 'Deactivate' : 'Activate'}
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{profile.is_active ? 'Deactivate' : 'Activate'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Heart className="w-3.5 h-3.5" />
            Donations
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalDonations}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Droplet className="w-3.5 h-3.5" />
            Units
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalUnits}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Handshake className="w-3.5 h-3.5" />
            Referrals
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalReferrals}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Eligible
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.is_eligible ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      {/* Profile details + eligibility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile info */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" />
            Profile
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500">Location</span>
                <p className="font-semibold text-slate-900">{profile.union_name ? `${profile.upazila} (${profile.union_name}), ${profile.district}` : `${profile.upazila}, ${profile.district}`}</p>
              </div>
            </div>
            {profile.address && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500">Address</span>
                  <p className="font-semibold text-slate-900">{profile.address}</p>
                </div>
              </div>
            )}
            {profile.email && (
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500">Email</span>
                  <p className="font-semibold text-slate-900">{profile.email}</p>
                </div>
              </div>
            )}
            {profile.alternative_phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500">Alt Phone</span>
                  <p className="font-semibold text-slate-900">{profile.alternative_phone}</p>
                </div>
              </div>
            )}
            {profile.date_of_birth && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500">Date of Birth</span>
                  <p className="font-semibold text-slate-900">{formatDate(profile.date_of_birth)}</p>
                </div>
              </div>
            )}
            {profile.weight_kg && (
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500">Weight</span>
                  <p className="font-semibold text-slate-900">{profile.weight_kg} kg</p>
                </div>
              </div>
            )}
            {profile.occupation && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500">Occupation</span>
                  <p className="font-semibold text-slate-900">{profile.occupation}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-500">Joined</span>
                <p className="font-semibold text-slate-900">{formatDate(profile.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Eligibility & badges */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-400" />
            Eligibility & Badges
          </h2>
          <div className="space-y-4 text-sm">
            {/* Eligibility badges */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Whole Blood', eligible: stats?.eligible_whole_blood },
                { label: 'Platelets', eligible: stats?.eligible_platelets },
                { label: 'Plasma', eligible: stats?.eligible_plasma },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                    item.eligible
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </div>

            {/* Hb status */}
            {profile.hb_level != null && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Hemoglobin:</span>
                <span className={`font-bold ${profile.hb_level >= 12.5 ? 'text-green-600' : 'text-red-600'}`}>
                  {profile.hb_level} g/dL
                </span>
                {profile.last_hb_test_date && (
                  <span className="text-xs text-slate-400">({formatDate(profile.last_hb_test_date)})</span>
                )}
              </div>
            )}

            {/* Last donation */}
            {profile.last_donation_date && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Last donation:</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(profile.last_donation_date)}
                  {profile.last_donation_type && ` (${DONATION_TYPE_LABELS[profile.last_donation_type] || profile.last_donation_type})`}
                </span>
              </div>
            )}

            {/* Next eligible */}
            {stats?.next_eligible_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Next eligible:</span>
                <span className="font-semibold text-slate-900">{formatDate(stats.next_eligible_date)}</span>
              </div>
            )}

            {/* Badges */}
            {stats?.badges && stats.badges.length > 0 && (
              <div>
                <span className="text-slate-500 block mb-2">Badges</span>
                <div className="flex flex-wrap gap-1.5">
                  {stats.badges.map((badge, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border border-green-200 bg-green-50 text-green-700"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Identity verification panel (NID + phone) */}
      {profile.role === 'donor' && (
        <DonorVerificationPanel
          donorId={profile.id}
          nidNumber={profile.nid_number ?? null}
          nidFrontPublicId={profile.nid_front_url ?? null}
          nidBackPublicId={profile.nid_back_url ?? null}
          phone={profile.phone ?? null}
          phoneVerified={profile.phone_verified ?? 0}
          verificationStatus={profile.verification_status ?? 'unverified'}
          isVerified={profile.is_verified ?? 0}
          verificationNote={profile.verification_note ?? null}
          verifiedAt={profile.verified_at ?? null}
          nidUploadedAt={profile.nid_uploaded_at ?? null}
          onStateChange={() => {
            // Refresh profile + stats after a verification action.
            serverGetProfileByUserId(donorId).then((p) => setProfile(p as DonorProfile | null));
            serverGetDonorsWithStats().then((allDonors) => {
              const match = (allDonors as any[])?.find((d) => d.id === donorId);
              setStats(match || null);
            });
          }}
        />
      )}

      {/* Contact click stats — how many people called/WhatsApp'd this donor */}
      {profile.role === 'donor' && (
        <DonorContactStats donorId={profile.id} />
      )}

      {/* Donor QR card — admin can download and share with donor */}
      {profile.role === 'donor' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 self-start">
            <QrCodeIcon className="w-5 h-5 text-slate-400" />
            {isBn ? 'ডোনার QR কার্ড' : 'Donor QR Card'}
          </h2>
          <DonorQrCard
            donorId={profile.id}
            bloodGroup={profile.blood_group}
            district={profile.district}
            isVerified={!!profile.is_verified}
            donorName={profile.full_name_en || profile.full_name_bn}
          />
        </div>
      )}

      {/* Donation history table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Donation History
            <span className="text-sm font-normal text-slate-400">({donations.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const headers = ['Date', 'Type', 'Units', 'Hospital', 'Recipient', 'Notes'];
                const rows = donations.map(d => [
                  formatDateTime(d.donation_date),
                  DONATION_TYPE_LABELS[d.donation_type || 'whole_blood'] || d.donation_type || 'Whole Blood',
                  d.units,
                  d.hospital_name || '',
                  d.recipient_type || 'Patient',
                  d.notes || '',
                ]);
                const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `donor-${donorId}-donations.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={donations.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={() => setShowAddDonationModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
              title="Quick Add Donation"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Donation
            </button>
          </div>
        </div>
        {donations.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Heart className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p>No donations recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Units</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Hospital</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">
                      {formatDateTime(donation.donation_date)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                        {DONATION_TYPE_LABELS[donation.donation_type || 'whole_blood'] || donation.donation_type || 'Whole Blood'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {donation.units}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {donation.hospital_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {donation.recipient_type || 'Patient'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                      {donation.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddDonationModal && (
        <QuickAddDonationModal
          donorId={profile.id}
          donorName={fullName}
          bloodGroup={profile.blood_group}
          onClose={() => setShowAddDonationModal(false)}
          onSuccess={() => {
            serverGetDonationsByDonorId(donorId, Date.now()).then((dons) => setDonations((dons as Donation[]) || []));
            serverGetDonorsWithStats().then((allDonors) => {
              const match = (allDonors as any[])?.find((d) => d.id === donorId);
              setStats(match || null);
            });
          }}
        />
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Donor Profile</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name (BN)</label>
                  <input
                    value={editForm.full_name_bn}
                    onChange={(e) => setEditForm({ ...editForm, full_name_bn: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name (EN)</label>
                  <input
                    value={editForm.full_name_en}
                    onChange={(e) => setEditForm({ ...editForm, full_name_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Blood Group</label>
                  <select
                    value={editForm.blood_group}
                    onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    <option value="">—</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">District</label>
                  <input
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Upazila</label>
                  <input
                    value={editForm.upazila}
                    onChange={(e) => setEditForm({ ...editForm, upazila: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Union</label>
                  <input
                    value={editForm.union_name}
                    onChange={(e) => setEditForm({ ...editForm, union_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}