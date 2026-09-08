'use client';

import { useState, useEffect } from 'react';
import { TableSkeleton } from "@/components/ui/Skeleton";
import { serverGetActivityLog } from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import {
  Activity, Loader2, Clock, Filter, ChevronLeft, ChevronRight,
  User, Database, ShieldCheck, Settings as SettingsIcon, Droplets,
  Building2, HeartPulse, Handshake, Crown, Search
} from 'lucide-react';

interface LogEntry {
  id: number;
  actor_id: number | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_META: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  // User / hospital / admin
  user_created: { icon: User, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  user_updated: { icon: User, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  user_deleted: { icon: User, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  hospital_created: { icon: Building2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  hospital_updated: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  hospital_deleted: { icon: Building2, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  admin_created: { icon: Crown, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  admin_updated: { icon: Crown, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  admin_deleted: { icon: Crown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  // Requests
  request_created: { icon: HeartPulse, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  request_updated: { icon: HeartPulse, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  request_status_changed: { icon: HeartPulse, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  request_deleted: { icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  // Donations
  donation_created: { icon: Droplets, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  donation_updated: { icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  donation_deleted: { icon: Droplets, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  // Organizations
  organization_created: { icon: Building2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  organization_updated: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  organization_deactivated: { icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  // Matches
  donor_match_created: { icon: Handshake, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  donor_match_updated: { icon: Handshake, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  // System
  settings_updated: { icon: SettingsIcon, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  login: { icon: ShieldCheck, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  logout: { icon: ShieldCheck, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
};

const DEFAULT_META = { icon: Database, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };

const ACTION_FILTERS = [
  { value: 'all', label_key: 'all_activities' },
  { value: 'user', label_key: 'users_management' },
  { value: 'hospital', label_key: 'hospitals' },
  { value: 'admin', label_key: 'manage_admins' },
  { value: 'request', label_key: 'requests_management' },
  { value: 'donation', label_key: 'donations_management' },
  { value: 'organization', label_key: 'nav_organizations' },
  { value: 'settings', label_key: 'settings' },
];

export default function AdminActivityLogPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const itemsPerPage = 20;

  useEffect(() => {
    fetchActivityLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, actionFilter]);

  const fetchActivityLog = async () => {
    setIsLoading(true);
    try {
      const result = await serverGetActivityLog({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      }) as { rows: LogEntry[]; total: number };
      setLogs(result.rows || []);
      setTotalCount(result.total || 0);
      setTotalPages(Math.max(1, Math.ceil((result.total || 0) / itemsPerPage)));
    } catch (error) {
      console.error('Error fetching activity log:', error);
      setLogs([]);
      setTotalCount(0);
      setTotalPages(1);
    }
    setIsLoading(false);
  };

  const filteredLogs = searchQuery
    ? logs.filter((l) =>
        (l.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.actor_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.action || '').toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : logs;

  const formatDate = (ts: string | Date) => {
    try {
      return new Date(ts).toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts instanceof Date ? ts.toISOString() : String(ts ?? '');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('activity_log')}</h1>
            <p className="text-sm text-slate-500">
              {t('activity_log_desc')} • {totalCount} {t('total_entries') || 'entries'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search') || 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-56"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-8 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
            >
              {ACTION_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{t(f.label_key)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('no_recent_activity')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredLogs.map((log) => {
              const meta = ACTION_META[log.action] || DEFAULT_META;
              const Icon = meta.icon;
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-4 p-4 md:p-5 hover:bg-slate-50/50 transition-colors border-l-4 ${meta.border} ${meta.bg}/30`}
                >
                  <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-slate-200 text-slate-600 capitalize">
                        {(log.action || '').replace(/_/g, ' ')}
                      </span>
                      {log.entity_type && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                          {log.entity_type}
                          {log.entity_id ? ` #${log.entity_id}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{log.details || '—'}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.actor_email || (log.actor_id ? `User #${log.actor_id}` : 'System')}
                      </span>
                      {log.ip_address && (
                        <span className="text-xs text-slate-400 font-mono">{log.ip_address}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0 whitespace-nowrap ml-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(log.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              {t('page')} {currentPage} {t('of')} {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
