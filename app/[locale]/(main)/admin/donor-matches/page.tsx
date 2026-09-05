'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import { serverGetAllDonorMatches } from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import {
  Handshake,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Link } from '@/i18n/routing';

interface DonorMatch {
  id: number;
  request_id: number;
  donor_id: number;
  match_rank: number;
  match_score: number;
  notification_method: string;
  response_status: string;
  responded_at: string | null;
  created_at: string;
  patient_name: string | null;
  blood_group: string | null;
  urgency_level: string | null;
  district: string | null;
  request_status: string | null;
  donor_name: string | null;
  donor_name_bn: string | null;
  donor_phone: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  pending: {
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    label: 'Pending',
  },
  accepted: {
    color: 'text-green-700',
    bg: 'bg-green-100',
    label: 'Accepted',
  },
  declined: {
    color: 'text-red-700',
    bg: 'bg-red-100',
    label: 'Declined',
  },
  no_response: {
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    label: 'No Response',
  },
};

const URGENCY_CONFIG: Record<string, { color: string; bg: string }> = {
  normal: { color: 'text-blue-700', bg: 'bg-blue-100' },
  urgent: { color: 'text-amber-700', bg: 'bg-amber-100' },
  critical: { color: 'text-red-700', bg: 'bg-red-100' },
};

export default function AdminDonorMatchesPage() {
  const t = useTranslations('admin');
  const locale = useLocale();

  const [matches, setMatches] = useState<DonorMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchMatches();
  }, [currentPage, statusFilter]);

  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const result = (await serverGetAllDonorMatches({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      })) as { rows: DonorMatch[]; total: number };
      setMatches(result.rows || []);
      setTotalCount(result.total || 0);
      setTotalPages(Math.max(1, Math.ceil((result.total || 0) / itemsPerPage)));
    } catch (error) {
      console.error('Error fetching donor matches:', error);
      setMatches([]);
      setTotalCount(0);
      setTotalPages(1);
    }
    setIsLoading(false);
  };

  const filteredMatches = matches.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.donor_name || '').toLowerCase().includes(q) ||
      (m.donor_name_bn || '').toLowerCase().includes(q) ||
      (m.donor_phone || '').toLowerCase().includes(q) ||
      (m.patient_name || '').toLowerCase().includes(q) ||
      String(m.request_id).includes(q)
    );
  });

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Request ID',
      'Patient Name',
      'Blood Group',
      'Urgency',
      'District',
      'Donor Name',
      'Donor Phone',
      'Match Rank',
      'Match Score',
      'Status',
      'Notification Method',
      'Notified At',
      'Responded At',
    ];
    const rows = filteredMatches.map((m) => [
      m.id,
      m.request_id,
      m.patient_name || '',
      m.blood_group || '',
      m.urgency_level || '',
      m.district || '',
      m.donor_name || m.donor_name_bn || '',
      m.donor_phone || '',
      m.match_rank,
      m.match_score,
      m.response_status,
      m.notification_method,
      new Date(m.created_at).toISOString(),
      m.responded_at ? new Date(m.responded_at).toISOString() : '',
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `donor-matches-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t('export_csv'));
  };

  // Stats
  const acceptedCount = matches.filter(
    (m) => m.response_status === 'accepted',
  ).length;
  const declinedCount = matches.filter(
    (m) => m.response_status === 'declined',
  ).length;
  const pendingCount = matches.filter(
    (m) => m.response_status === 'pending',
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('nav_donor_matches')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('donor_matches_desc', { count: totalCount })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_donor_matches')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none w-full sm:w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
          >
            <option value="all">{t('all_status')}</option>
            <option value="pending">{t('match_pending') || 'Pending'}</option>
            <option value="accepted">
              {t('match_accepted') || 'Accepted'}
            </option>
            <option value="declined">
              {t('match_declined') || 'Declined'}
            </option>
            <option value="no_response">
              {t('match_no_response') || 'No Response'}
            </option>
          </select>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            title={t('export_csv')}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('export_csv')}</span>
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <div className="text-2xl font-bold text-amber-600">
            {pendingCount}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {t('match_pending') || 'Pending'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <div className="text-2xl font-bold text-green-600">
            {acceptedCount}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {t('match_accepted') || 'Accepted'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <div className="text-2xl font-bold text-red-600">
            {declinedCount}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {t('match_declined') || 'Declined'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Handshake className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_donor_matches_found') || 'No donor matches found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('request_id')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('patient_name')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('donor') || 'Donor'}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('blood_group')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('urgency')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('status')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                    {t('match_notified_at') || 'Notified'}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMatches.map((match) => {
                  const statusMeta =
                    STATUS_CONFIG[match.response_status] ||
                    STATUS_CONFIG.pending;
                  const urgencyMeta =
                    URGENCY_CONFIG[match.urgency_level || 'normal'] ||
                    URGENCY_CONFIG.normal;
                  return (
                    <tr
                      key={match.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-slate-900">
                          #{match.request_id}
                        </span>
                        {match.match_rank > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded">
                            #{match.match_rank}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 text-sm">
                          {match.patient_name || '-'}
                        </p>
                        {match.district && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {match.district}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">
                              {locale === 'bn'
                                ? match.donor_name_bn || match.donor_name || '-'
                                : match.donor_name || match.donor_name_bn || '-'}
                            </p>
                            {match.donor_phone && (
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {match.donor_phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {match.blood_group && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-full text-sm">
                            {match.blood_group}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {match.urgency_level && (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${urgencyMeta.bg} ${urgencyMeta.color}`}
                          >
                            {t(match.urgency_level) || match.urgency_level}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusMeta.bg} ${statusMeta.color}`}
                        >
                          {t(`match_${match.response_status}`) ||
                            statusMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(match.created_at).toLocaleString()}
                        </div>
                        {match.responded_at && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {t('match_responded') || 'Responded'}:{' '}
                            {new Date(match.responded_at).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/blood-requests?requestId=${match.request_id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {t('view_request') || 'View'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {t('page')} {currentPage} {t('of')} {totalPages}{' '}
              <span className="text-slate-400">
                ({totalCount} {t('requests').toLowerCase()})
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
