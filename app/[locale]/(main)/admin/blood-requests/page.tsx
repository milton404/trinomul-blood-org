'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  serverUpdateRequestStatus, serverAdminUpdateLifecycleStatus, serverDeleteRequest, serverUpdateBloodRequest,
  serverGetAdminRequests, serverGetRequestStatusCounts, serverGetMyAdminContext,
  serverAdminCreateBloodRequest, serverFindMatchingDonors, serverRecordDonorMatches,
  serverGetRequestEditHistory,
} from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import {
  HeartPulse, Search, Loader2, ChevronLeft, ChevronRight,
  Edit, Trash2, X, Save,
  CheckCircle, XCircle, FileDown, Navigation,
  Users, QrCode, ExternalLink, Plus, Siren, History, Mail
} from 'lucide-react';
import { exportToCSV, REQUEST_EXPORT_HEADERS } from '@/lib/export';
import FulfillRequestModal from '@/components/admin/FulfillRequestModal';
import CreateRequestModal from '@/components/admin/CreateRequestModal';
import EmailDonorsModal from '@/components/admin/EmailDonorsModal';

// Lazy-load DonorMatchPanel — it pulls in matching logic and is only
// needed when an admin explicitly runs matching for a request.
const DonorMatchPanel = lazy(() => import('@/components/admin/DonorMatchPanel'));

// Lazy-load the same Emergency SOS flow users get — it has its own modal
// overlay and countdown, and needs Leaflet which touches `window`.
const EmergencySOS = lazy(() =>
  import('@/components/requests/EmergencySOS').then((m) => ({ default: m.default })),
);

interface BloodRequest {
  id: number;
  requester_id: number;
  requester_type: string;
  patient_name: string;
  patient_age: number;
  blood_group: string;
  units_needed: number;
  urgency_level: 'normal' | 'urgent' | 'critical';
  when_needed: string;
  needed_date: string;
  needed_time: string;
  district: string;
  upazila: string;
  lat: number;
  lng: number;
  hospital_name: string;
  hospital_address: string;
  contact_number: string;
  alternative_number: string;
  reason: string;
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
  tracking_code?: string | null;
  current_status?: string | null;
  created_at: string;
  archived_at?: string | null;
  archive_reason?: string | null;
  admin_notice?: string | null;
  patient_hb_level?: number | null;
  show_fulfilled_badge?: number | null;
  is_last_chance?: boolean;
  edit_count?: number;
}

type AdminView = 'active' | 'last_chance' | 'fulfilled' | 'expired' | 'cancelled' | 'deleted' | 'all';

export default function AdminRequestsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const isBn = locale === 'bn';

  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<AdminView>('active');
  const [counts, setCounts] = useState<{ active: number; lastChance: number; fulfilled: number; expired: number; cancelled: number; deleted: number; all: number } | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [matchRequest, setMatchRequest] = useState<BloodRequest | null>(null);
  const [emailRequest, setEmailRequest] = useState<BloodRequest | null>(null);
  const [fulfillRequest, setFulfillRequest] = useState<BloodRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [historyRequest, setHistoryRequest] = useState<BloodRequest | null>(null);
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adminCtx, setAdminCtx] = useState<{
    isFullAdmin: boolean;
    isDistrictAdmin: boolean;
    role: string;
  } | null>(null);

  const itemsPerPage = 10;
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    serverGetMyAdminContext().then(setAdminCtx).catch(() => setAdminCtx(null));
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [currentPage, viewTab, urgencyFilter, bloodGroupFilter, searchQuery]);

  const fetchRequests = async () => {
    setIsLoading(true);

    try {
      const [result, statusCounts] = await Promise.all([
        serverGetAdminRequests({
          view: viewTab,
          urgencyLevel: urgencyFilter,
          bloodGroup: bloodGroupFilter,
          search: searchQuery || undefined,
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
        }),
        serverGetRequestStatusCounts(),
      ]);

      setRequests(result.rows as BloodRequest[]);
      setTotalPages(Math.max(1, Math.ceil(result.total / itemsPerPage)));
      setCounts(statusCounts);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }

    setIsLoading(false);
  };

  const handleUpdateRequestStatus = async (request: BloodRequest, newStatus: string) => {
    try {
      await serverUpdateRequestStatus(request.id, newStatus);
      toast.success(t('request_updated'));
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update request');
    }
  };

  const handleUpdateLifecycleStatus = async (request: BloodRequest, newStatus: string) => {
    if (newStatus === (request.current_status || 'submitted')) return;
    try {
      await serverAdminUpdateLifecycleStatus(request.id, newStatus);
      toast.success(t('request_updated'));
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  /**
   * Admin-side Emergency SOS — identical to the public flow but the request
   * is stamped as admin-created. Critical urgency, auto-matches top donors.
   */
  const handleEmergencySOS = async (data: any) => {
    if (sosSubmitting) return;
    setSosSubmitting(true);
    try {
      const requestId = await serverAdminCreateBloodRequest({
        patientName: data.patientName || 'Emergency Patient',
        patientAge: data.patientAge || 0,
        bloodGroup: data.bloodGroup || 'O+',
        unitsNeeded: 1,
        urgencyLevel: 'critical',
        whenNeeded: 'now',
        neededDate: null,
        neededTime: null,
        district: data.location || 'Unknown',
        upazila: 'Emergency',
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        hospitalName: 'Emergency - See Location',
        hospitalAddress: data.location || 'Location shared via GPS',
        contactNumber: data.contactNumber,
        alternativeNumber: null,
        reason: `🚨 EMERGENCY SOS: ${data.urgencyReason || 'Urgent blood needed'}`,
      });

      // Auto-trigger donor matching for emergency SOS requests, same as the
      // public form — top 10 eligible donors are matched and notified.
      if (requestId) {
        try {
          const matches = (await serverFindMatchingDonors(
            data.bloodGroup || 'O+',
            data.location,
            undefined,
            'critical',
            10,
            data.lat ?? null,
            data.lng ?? null,
          )) as any[];

          if (matches && matches.length > 0) {
            await serverRecordDonorMatches(requestId, matches, 'sms');
            toast.success(
              isBn
                ? `🚨 ${matches.length} জন ডোনার ম্যাচ হয়েছে এবং নোটিফাই করা হয়েছে!`
                : `🚨 ${matches.length} donor${matches.length === 1 ? '' : 's'} matched and notified!`,
            );
          } else {
            toast.warning(
              isBn
                ? 'কাছাকাছি কোনো যোগ্য ডোনার পাওয়া যায়নি।'
                : 'No eligible donors found nearby.',
            );
          }
        } catch (matchErr) {
          console.error('Emergency auto-matching failed:', matchErr);
          toast.error(
            isBn
              ? 'অটো-ম্যাচিং ব্যর্থ হয়েছে — ম্যানুয়ালি সামলান।'
              : 'Auto-matching failed — admin will handle manually.',
          );
        }
      }

      setShowSOS(false);
      fetchRequests();
      toast.success(
        isBn
          ? '🚨 জরুরি রিকোয়েস্ট তৈরি হয়েছে!'
          : '🚨 Emergency request created!',
      );
    } catch (error: any) {
      console.error('SOS error:', error);
      toast.error(
        isBn
          ? 'জরুরি অ্যালার্ট পাঠানো ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'
          : 'Failed to send emergency alert. Please try again.',
      );
    } finally {
      setSosSubmitting(false);
    }
  };

  const handleDeleteRequest = async (request: BloodRequest) => {
    if (!confirm(t('confirm_delete_request'))) return;

    try {
      await serverDeleteRequest(request.id);
      toast.success(t('request_deleted'));
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete request');
    }
  };

  const handleViewHistory = async (request: BloodRequest) => {
    setHistoryRequest(request);
    setHistoryLoading(true);
    try {
      const history = await serverGetRequestEditHistory(request.id);
      setEditHistory(history as any[]);
    } catch {
      setEditHistory([]);
    }
    setHistoryLoading(false);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'urgent': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'fulfilled': return 'bg-blue-100 text-blue-700';
      case 'expired': return 'bg-slate-100 text-slate-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Tracking lifecycle status (submitted → matching → donor_found → donating → fulfilled)
  const trackingStatusInfo: Record<string, { label: string; color: string }> = {
    submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700' },
    matching: { label: 'Matching', color: 'bg-amber-100 text-amber-700' },
    donor_found: { label: 'Donor Found', color: 'bg-green-100 text-green-700' },
    donating: { label: 'Donating', color: 'bg-purple-100 text-purple-700' },
    fulfilled: { label: 'Fulfilled', color: 'bg-green-200 text-green-800' },
    cancelled: { label: 'Cancelled', color: 'bg-slate-200 text-slate-700' },
    expired: { label: 'Expired', color: 'bg-slate-200 text-slate-600' },
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('requests_management')}</h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto items-center">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_requests')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none w-full sm:w-64"
            />
          </div>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="all">{t('all_urgency')}</option>
            <option value="normal">{t('normal')}</option>
            <option value="urgent">{t('urgent')}</option>
            <option value="critical">{t('critical')}</option>
          </select>
          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="all">{t('all_blood_groups')}</option>
            {bloodGroups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
          <button
            onClick={() => exportToCSV(requests, 'blood_requests', REQUEST_EXPORT_HEADERS)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-colors"
          >
            <FileDown className="w-4 h-4" /> {t('export_csv')}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> {t('create_request') || 'Create Request'}
          </button>
          <button
            onClick={() => setShowSOS(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 text-sm font-semibold transition-colors animate-pulse"
            title={isBn ? 'জরুরি SOS রিকোয়েস্ট তৈরি করুন' : 'Create an Emergency SOS request'}
          >
            <Siren className="w-4 h-4" /> {isBn ? '🚨 জরুরি SOS' : '🚨 Emergency SOS'}
          </button>
        </div>
      </div>

      {/* Lifecycle tabs with counts — every request is viewable here,
          including archived history (fulfilled/expired/cancelled/deleted). */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'active', label: t('active'), count: counts?.active, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
          { key: 'last_chance', label: t('last_chance') || 'Last Chance', count: counts?.lastChance, cls: 'bg-amber-100 text-amber-800 border-amber-300' },
          { key: 'fulfilled', label: t('fulfilled'), count: counts?.fulfilled, cls: 'bg-blue-100 text-blue-700 border-blue-200' },
          { key: 'expired', label: t('expired'), count: counts?.expired, cls: 'bg-slate-100 text-slate-600 border-slate-200' },
          { key: 'cancelled', label: t('cancelled'), count: counts?.cancelled, cls: 'bg-rose-100 text-rose-700 border-rose-200' },
          { key: 'deleted', label: t('deleted_by_user') || 'Deleted by user', count: counts?.deleted, cls: 'bg-slate-200 text-slate-700 border-slate-300' },
          { key: 'all', label: t('all_status'), count: counts?.all, cls: 'bg-slate-900 text-white border-slate-900' },
        ] as { key: AdminView; label: string; count?: number; cls: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setViewTab(tab.key); setCurrentPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
              viewTab === tab.key ? tab.cls + ' ring-2 ring-offset-1 ring-slate-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${viewTab === tab.key ? 'bg-white/40' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : requests.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <HeartPulse className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_requests_found')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('patient')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('blood_group')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('hospital')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('urgency')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('status')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Tracking</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('date')}</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{request.patient_name}</p>
                        <p className="text-sm text-slate-500">{t('age')}: {request.patient_age} | {request.units_needed} {t('units')}{request.patient_hb_level != null ? ` | Hb: ${request.patient_hb_level} g/dL` : ''}</p>
                        <p className="text-xs text-slate-400">{request.contact_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-full text-sm">
                        {request.blood_group}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{request.hospital_name}</p>
                        <p className="text-xs text-slate-500">{request.district}, {request.upazila}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyColor(request.urgency_level)}`}>
                        {t(request.urgency_level)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                          {t(request.status)}
                        </span>
                        {request.is_last_chance && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            {t('last_chance') || 'Last Chance'}
                          </span>
                        )}
                        {request.archive_reason === 'deleted_by_user' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                            {t('deleted_by_user') || 'Deleted by user'}
                          </span>
                        )}
                        {(request.edit_count ?? 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                            <Edit className="w-2.5 h-2.5" />
                            {isBn ? `সম্পাদিত (${request.edit_count})` : `Edited (${request.edit_count})`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {request.tracking_code ? (
                        <div className="space-y-1">
                          <a
                            href={`/${locale}/track/${request.tracking_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-600 hover:text-indigo-700"
                            title="Open public tracking page"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            {request.tracking_code}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {request.current_status && (
                            <div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(trackingStatusInfo[request.current_status] || trackingStatusInfo.submitted).color}`}>
                                {(trackingStatusInfo[request.current_status] || trackingStatusInfo.submitted).label}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">{formatDate(request.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5 flex-wrap">
                        {request.status === 'active' && (
                          <button
                            onClick={() => setMatchRequest(request)}
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap text-purple-600 hover:bg-purple-50 transition-colors"
                            title="Find & notify matching donors"
                          >
                            <Users className="w-2.5 h-2.5" />
                            {isBn ? 'ম্যাচ' : 'Match'}
                          </button>
                        )}
                        {request.status === 'active' && (
                          <button
                            onClick={() => setEmailRequest(request)}
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap text-rose-600 hover:bg-rose-50 transition-colors"
                            title={isBn ? 'নির্বাচিত দাতাদের এই রিকোয়েস্টের ইমেইল পাঠান' : 'Email this request to selected donors'}
                          >
                            <Mail className="w-2.5 h-2.5" />
                            {isBn ? 'ইমেইল' : 'Email'}
                          </button>
                        )}
                        {request.status === 'active' && (
                          <>
                            <button
                              onClick={() => setFulfillRequest(request)}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap text-green-600 hover:bg-green-50 transition-colors"
                              title={t('mark_fulfilled')}
                            >
                              <CheckCircle className="w-2.5 h-2.5" />
                              {isBn ? 'পূর্ণ' : 'Fulfill'}
                            </button>
                            <select
                              value={request.current_status || 'submitted'}
                              onChange={(e) => handleUpdateLifecycleStatus(request, e.target.value)}
                              className="px-1 py-0.5 rounded text-[9px] font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                              title={isBn ? 'স্ট্যাটাস আপডেট' : 'Update status'}
                            >
                              <option value="submitted">{isBn ? 'জমা' : 'Submitted'}</option>
                              <option value="matching">{isBn ? 'ম্যাচিং' : 'Matching'}</option>
                              <option value="donor_found">{isBn ? 'দাতা পাওয়া' : 'Donor Found'}</option>
                              <option value="donating">{isBn ? 'দান হচ্ছে' : 'Donating'}</option>
                              <option value="fulfilled">{isBn ? 'পূর্ণ' : 'Fulfilled'}</option>
                            </select>
                            <button
                              onClick={() => handleUpdateRequestStatus(request, 'cancelled')}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap text-red-600 hover:bg-red-50 transition-colors"
                              title={t('cancel')}
                            >
                              <XCircle className="w-2.5 h-2.5" />
                              {t('cancel')}
                            </button>
                          </>
                        )}
                        {request.lat != null && request.lng != null && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${request.lat},${request.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title={t('get_directions') || 'Get Directions'}
                          >
                            <Navigation className="w-2.5 h-2.5" />
                            {t('get_directions')}
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowEditModal(true);
                          }}
                          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap text-blue-600 hover:bg-blue-50 transition-colors"
                          title={t('edit')}
                        >
                          <Edit className="w-2.5 h-2.5" />
                          {t('edit')}
                        </button>
                        {(request.edit_count ?? 0) > 0 && (
                          <button
                            onClick={() => handleViewHistory(request)}
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title={isBn ? 'সম্পাদনা ইতিহাস' : 'Edit History'}
                          >
                            <History className="w-2.5 h-2.5" />
                            {isBn ? 'ইতিহাস' : 'History'}
                          </button>
                        )}
                        {adminCtx?.isFullAdmin && (
                          <button
                            onClick={() => handleDeleteRequest(request)}
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium whitespace-nowrap text-red-600 hover:bg-red-50 transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            {t('delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {t('page')} {currentPage} {t('of')} {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showEditModal && selectedRequest && (
        <EditRequestModal
          request={selectedRequest}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRequest(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setSelectedRequest(null);
            fetchRequests();
          }}
        />
      )}

      {fulfillRequest && (
        <FulfillRequestModal
          request={fulfillRequest}
          onClose={() => setFulfillRequest(null)}
          onDone={() => {
            setFulfillRequest(null);
            fetchRequests();
          }}
        />
      )}

      {showCreateModal && (
        <CreateRequestModal
          onClose={() => setShowCreateModal(false)}
          onDone={() => {
            setShowCreateModal(false);
            fetchRequests();
          }}
        />
      )}

      {showSOS && (
        <Suspense fallback={null}>
          <EmergencySOS
            onEmergencySubmit={handleEmergencySOS}
            onCancel={() => setShowSOS(false)}
          />
        </Suspense>
      )}

      {emailRequest && (
        <EmailDonorsModal
          request={{
            id: emailRequest.id,
            patient_name: emailRequest.patient_name,
            blood_group: emailRequest.blood_group,
            district: emailRequest.district,
            upazila: emailRequest.upazila,
            urgency_level: emailRequest.urgency_level,
          }}
          onClose={() => setEmailRequest(null)}
        />
      )}

      {matchRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Donor Matching
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {matchRequest.patient_name} • {matchRequest.blood_group} • {matchRequest.hospital_name}
                </p>
              </div>
              <button
                onClick={() => setMatchRequest(null)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <Suspense
                fallback={
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                }
              >
                <DonorMatchPanel
                  requestId={matchRequest.id}
                  bloodGroup={matchRequest.blood_group}
                  district={matchRequest.district}
                  upazila={matchRequest.upazila}
                  lat={matchRequest.lat}
                  lng={matchRequest.lng}
                  urgencyLevel={matchRequest.urgency_level}
                  patientName={matchRequest.patient_name}
                  hospitalName={matchRequest.hospital_name}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {historyRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                {isBn ? 'সম্পাদনা ইতিহাস' : 'Edit History'}
                <span className="text-sm font-normal text-slate-500">
                  #{historyRequest.id}
                </span>
              </h3>
              <button
                onClick={() => {
                  setHistoryRequest(null);
                  setEditHistory([]);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : editHistory.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                {isBn ? 'কোনো সম্পাদনা ইতিহাস নেই' : 'No edit history found'}
              </p>
            ) : (
              <div className="space-y-3">
                {editHistory.map((entry) => {
                  const changedFields: string[] = (() => {
                    try { return JSON.parse(entry.changed_fields); } catch { return []; }
                  })();
                  const prevVals: Record<string, any> = (() => {
                    try { return JSON.parse(entry.previous_values); } catch { return {}; }
                  })();
                  const newVals: Record<string, any> = (() => {
                    try { return JSON.parse(entry.new_values); } catch { return {}; }
                  })();
                  const editorLabel =
                    entry.editor_type === 'guest'
                      ? `Guest (IP: ${entry.editor_ip || 'unknown'})`
                      : entry.editor_type === 'admin'
                        ? `Admin${entry.editor_email ? ` (${entry.editor_email})` : ''}`
                        : `User #${entry.editor_id ?? '?'}`;
                  return (
                    <div
                      key={entry.id}
                      className="border border-slate-200 rounded-xl p-3 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            entry.editor_type === 'guest'
                              ? 'bg-amber-100 text-amber-700'
                              : entry.editor_type === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}>
                            {entry.editor_type}
                          </span>
                          <span className="text-xs font-medium text-slate-600">
                            {editorLabel}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {entry.created_at?.replace('T', ' ').slice(0, 19)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {changedFields.map((field) => (
                          <div key={field} className="flex items-start gap-2 text-xs">
                            <span className="font-semibold text-slate-700 min-w-[100px]">
                              {field}:
                            </span>
                            <span className="text-red-500 line-through flex-1 break-words">
                              {String(prevVals[field] ?? '—')}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="text-green-600 font-medium flex-1 break-words">
                              {String(newVals[field] ?? '—')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EditRequestModal({ request, onClose, onSave }: {
  request: BloodRequest;
  onClose: () => void;
  onSave: () => void;
}) {
  const t = useTranslations('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: request.patient_name,
    patient_age: request.patient_age,
    blood_group: request.blood_group,
    units_needed: request.units_needed,
    urgency_level: request.urgency_level,
    hospital_name: request.hospital_name,
    hospital_address: request.hospital_address,
    contact_number: request.contact_number,
    alternative_number: request.alternative_number || '',
    reason: request.reason || '',
    status: request.status,
    admin_notice: request.admin_notice || '',
    patient_hb_level: request.patient_hb_level ?? null,
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Route status changes through the lifecycle-aware action so
      // cancelled → instant archive, fulfilled → seal window starts.
      const { status, ...rest } = formData;
      if (status !== request.status) {
        await serverUpdateRequestStatus(request.id, status);
      }
      await serverUpdateBloodRequest(request.id, rest);
      toast.success(t('request_updated'));
      onSave();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update request');
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">{t('edit_request')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('patient_name')}</label>
              <input
                type="text"
                value={formData.patient_name}
                onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('patient_age')}</label>
              <input
                type="number"
                value={formData.patient_age}
                onChange={(e) => setFormData({ ...formData, patient_age: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('blood_group')}</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('units_needed')}</label>
              <input
                type="number"
                value={formData.units_needed}
                onChange={(e) => setFormData({ ...formData, units_needed: parseInt(e.target.value) })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('urgency')}</label>
              <select
                value={formData.urgency_level}
                onChange={(e) => setFormData({ ...formData, urgency_level: e.target.value as any })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                <option value="normal">{t('normal')}</option>
                <option value="urgent">{t('urgent')}</option>
                <option value="critical">{t('critical')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('status')}</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                <option value="active">{t('active')}</option>
                <option value="fulfilled">{t('fulfilled')}</option>
                <option value="expired">{t('expired')}</option>
                <option value="cancelled">{t('cancelled')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_name')}</label>
            <input
              type="text"
              value={formData.hospital_name}
              onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_address')}</label>
            <textarea
              value={formData.hospital_address}
              onChange={(e) => setFormData({ ...formData, hospital_address: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
            {request.lat != null && request.lng != null && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${request.lat},${request.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                {t('get_directions') || 'Get Directions'}
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('contact_number')}</label>
              <input
                type="text"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('alternative_number')}</label>
              <input
                type="text"
                value={formData.alternative_number}
                onChange={(e) => setFormData({ ...formData, alternative_number: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('reason')}</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              📢 {t('admin_notice') || 'Admin notice (shown on the public card)'}
            </label>
            <textarea
              value={formData.admin_notice}
              onChange={(e) => setFormData({ ...formData, admin_notice: e.target.value })}
              rows={2}
              placeholder={t('admin_notice_ph') || 'Important notice for visitors…'}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              🔬 {t('patient_hb_level') || 'Patient Hb Level (g/dL) — admin only'}
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="25"
              value={formData.patient_hb_level ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  patient_hb_level: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              placeholder="e.g. 10.2"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              {t('patient_hb_hint') ||
                'Internal tracking — not visible to donors or the public'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
