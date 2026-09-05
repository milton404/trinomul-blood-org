'use client';

/**
 * Admin Email Center:
 *  - Compose tab: send a custom email to any group of donors (multi-select,
 *    active/inactive, blood group / district / upazila filters, search).
 *  - Logs tab: audit trail of every outbound email with status.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';
import {
  serverAdminSearchEmailDonors,
  serverAdminSendCustomEmail,
  serverAdminGetEmailLog,
  serverAdminGetEmailStats,
  type AdminEmailDonor,
  type AdminEmailLogRow,
  type AdminEmailStats,
} from '@/lib/email/admin-actions';
import {
  Mail,
  Send,
  Search,
  Loader2,
  CheckSquare,
  Square,
  ScrollText,
  PenLine,
  Users,
  MailCheck,
  MailX,
  UserCheck,
} from 'lucide-react';

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export default function AdminEmailPage() {
  const locale = useLocale();
  const isBn = locale === 'bn';
  const [tab, setTab] = useState<'compose' | 'logs'>('compose');

  // ── Compose state ──
  const [donors, setDonors] = useState<AdminEmailDonor[]>([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState(true);
  const [search, setSearch] = useState('');
  const [bloodGroups, setBloodGroups] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // ── Stats + logs state ──
  const [stats, setStats] = useState<AdminEmailStats | null>(null);
  const [logs, setLogs] = useState<AdminEmailLogRow[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const itemsPerPage = 20;

  const fetchDonors = useCallback(async () => {
    setIsLoadingDonors(true);
    try {
      const rows = await serverAdminSearchEmailDonors({
        bloodGroups,
        activeStatus,
        search,
        limit: 400,
      });
      setDonors(rows);
      // Keep only selections still visible in the filtered list.
      setSelected((prev) => {
        const ids = new Set(rows.map((r) => r.id));
        return new Set(Array.from(prev).filter((id) => ids.has(id)));
      });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load donors');
    } finally {
      setIsLoadingDonors(false);
    }
  }, [bloodGroups, activeStatus, search]);

  const fetchStats = useCallback(async () => {
    try {
      setStats(await serverAdminGetEmailStats());
    } catch {
      /* non-fatal */
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const { rows, total } = await serverAdminGetEmailLog({
        limit: itemsPerPage,
        offset: (logPage - 1) * itemsPerPage,
      });
      setLogs(rows);
      setLogTotal(total);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load email logs');
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logPage]);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    if (tab === 'logs') fetchLogs();
  }, [tab, fetchLogs]);

  const toggleGroup = (bg: string) => {
    setBloodGroups((prev) =>
      prev.includes(bg) ? prev.filter((x) => x !== bg) : [...prev, bg],
    );
  };
  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === donors.length) setSelected(new Set());
    else setSelected(new Set(donors.map((d) => d.id)));
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error(
        isBn ? 'বিষয় এবং বার্তা দুটোই প্রয়োজন' : 'Subject and message are both required',
      );
      return;
    }
    if (selected.size === 0) {
      toast.error(isBn ? 'কমপক্ষে একজন প্রাপক নির্বাচন করুন' : 'Select at least one recipient');
      return;
    }
    if (
      !window.confirm(
        isBn
          ? `${selected.size} জনকে ইমেইল পাঠাতে চান?`
          : `Send email to ${selected.size} recipient(s)?`,
      )
    )
      return;

    setIsSending(true);
    try {
      const result = await serverAdminSendCustomEmail({
        recipientIds: Array.from(selected),
        subject,
        message,
      });
      toast.success(
        isBn
          ? `${result.sent} টি ইমেইল পাঠানো হয়েছে${result.skipped ? ` (${result.skipped} বাদ)` : ''}`
          : `${result.sent} email(s) sent${result.skipped ? ` (${result.skipped} skipped)` : ''}`,
      );
      setSubject('');
      setMessage('');
      setSelected(new Set());
      fetchStats();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(logTotal / itemsPerPage));

  const statusBadge = (status: string) => {
    if (status === 'sent')
      return 'bg-green-100 text-green-700';
    if (status === 'failed')
      return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-rose-600" />
            {isBn ? 'ইমেইল সেন্টার' : 'Email Center'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isBn
              ? 'দাতাদের কাস্টম ইমেইল পাঠান এবং সব ইমেইলের লগ দেখুন'
              : 'Send custom emails to donors and monitor every outbound email'}
          </p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            onClick={() => setTab('compose')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'compose' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PenLine className="w-4 h-4" />
            {isBn ? 'লেখুন' : 'Compose'}
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'logs' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            {isBn ? 'লগ' : 'Logs'}
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { icon: MailCheck, label: isBn ? 'আজ পাঠানো' : 'Sent today', value: stats.sentToday, color: 'text-green-600 bg-green-100' },
            { icon: Mail, label: isBn ? 'মোট পাঠানো' : 'Sent total', value: stats.sentTotal, color: 'text-blue-600 bg-blue-100' },
            { icon: MailX, label: isBn ? 'ব্যর্থ' : 'Failed', value: stats.failedTotal, color: 'text-red-600 bg-red-100' },
            { icon: MailX, label: isBn ? 'বাদ দেওয়া' : 'Skipped', value: stats.skippedTotal, color: 'text-slate-600 bg-slate-100' },
            { icon: Users, label: isBn ? 'দাতা (ইমেইলসহ)' : 'Donors w/ email', value: stats.donorCount, color: 'text-purple-600 bg-purple-100' },
            { icon: UserCheck, label: isBn ? 'অপ্ট-ইন' : 'Opted in', value: stats.optedInCount, color: 'text-emerald-600 bg-emerald-100' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-900 leading-tight">{s.value}</p>
                <p className="text-[11px] text-slate-500 truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Compose tab ── */}
      {tab === 'compose' && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Recipient picker */}
          <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {BLOOD_GROUPS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => toggleGroup(bg)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      bloodGroups.includes(bg)
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={activeStatus}
                  onChange={(e) => setActiveStatus(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700"
                >
                  <option value="all">{isBn ? 'সব দাতা' : 'All donors'}</option>
                  <option value="active">{isBn ? 'সক্রিয়' : 'Active only'}</option>
                  <option value="inactive">{isBn ? 'নিষ্ক্রিয়' : 'Inactive only'}</option>
                </select>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={isBn ? 'নাম / ইমেইল / ফোন' : 'Name / email / phone'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleAll}
                  disabled={donors.length === 0}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  {selected.size === donors.length && donors.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  {isBn ? 'সব নির্বাচন' : 'Select all'}
                </button>
                <span className="text-xs text-slate-500">
                  {isBn
                    ? `${selected.size} / ${donors.length} নির্বাচিত`
                    : `${selected.size} / ${donors.length} selected`}
                </span>
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
              {isLoadingDonors ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                </div>
              ) : donors.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-12">
                  {isBn ? 'কোনো দাতা পাওয়া যায়নি' : 'No donors found'}
                </p>
              ) : (
                donors.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggle(d.id)}
                      className="w-4 h-4 accent-rose-600"
                    />
                    <span className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {d.blood_group || '?'}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {d.full_name_en || d.full_name_bn || '—'}
                        </span>
                        {d.is_active !== 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-200 text-slate-600">
                            {isBn ? 'নিষ্ক্রিয়' : 'inactive'}
                          </span>
                        )}
                        {d.email_opt_in !== 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">
                            {isBn ? 'অপ্ট-আউট' : 'opt-out'}
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-slate-400 truncate">
                        {d.email}
                        {d.upazila ? ` • ${d.upazila}` : ''}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-4 space-y-3 h-fit">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PenLine className="w-4 h-4 text-rose-600" />
              {isBn ? 'ইমেইল লিখুন' : 'Compose email'}
            </h2>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={isBn ? 'বিষয়…' : 'Subject…'}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 font-medium"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              placeholder={
                isBn
                  ? 'আপনার বার্তা লিখুন… (Trinomul ব্র্যান্ডেড টেমপ্লেটে মোড়ানো হবে)'
                  : 'Write your message… (wrapped in the branded Trinomul template)'
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 resize-y"
            />
            <button
              onClick={handleSend}
              disabled={isSending || selected.size === 0 || !subject.trim() || !message.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isBn
                ? `${selected.size} জনকে পাঠান`
                : `Send to ${selected.size} recipient(s)`}
            </button>
            <p className="text-[11px] text-slate-400">
              {isBn
                ? 'কাস্টম ইমেইল অপ্ট-আউট সেটিং উপেক্ষা করে এবং দৈনিক সীমা মেনে চলে।'
                : 'Custom emails bypass the opt-out setting but respect the daily send cap.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Logs tab ── */}
      {tab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{isBn ? 'ধরন' : 'Type'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{isBn ? 'প্রাপক' : 'Recipient'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{isBn ? 'রিকোয়েস্ট' : 'Request'}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{isBn ? 'সময়' : 'Time'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-600 inline-block" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-slate-400 py-12">
                      {isBn ? 'এখনও কোনো ইমেইল পাঠানো হয়নি' : 'No emails sent yet'}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 font-mono">
                          {log.type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 max-w-[220px] truncate">
                        {log.to_email}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(log.status)}`}>
                          {log.status}
                        </span>
                        {log.error && (
                          <span className="block text-[10px] text-red-500 mt-0.5 max-w-[200px] truncate" title={log.error}>
                            {log.error}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {log.request_id ? `#${log.request_id}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at.replace(' ', 'T') + 'Z').toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {isBn ? `পৃষ্ঠা ${logPage} / ${totalPages}` : `Page ${logPage} of ${totalPages}`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  disabled={logPage === 1}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  {isBn ? 'আগের' : 'Prev'}
                </button>
                <button
                  onClick={() => setLogPage((p) => Math.min(totalPages, p + 1))}
                  disabled={logPage === totalPages}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                >
                  {isBn ? 'পরের' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
