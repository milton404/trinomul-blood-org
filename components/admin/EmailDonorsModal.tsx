'use client';

/**
 * Modal for sending a blood-request email to a hand-picked list of donors
 * from an admin request card. Pre-filters by the request's blood group,
 * supports active/inactive toggle, free-text search, multi-select with
 * checkboxes, an optional custom admin note, and SOS emergency styling.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';
import {
  serverAdminSearchEmailDonors,
  serverAdminSendRequestEmail,
  type AdminEmailDonor,
} from '@/lib/email/admin-actions';
import {
  Mail,
  Search,
  Loader2,
  X,
  Send,
  User,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';

interface EmailDonorsModalProps {
  request: {
    id: number;
    patient_name: string | null;
    blood_group: string;
    district: string | null;
    upazila: string | null;
    urgency_level: string | null;
  };
  onClose: () => void;
}

const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export default function EmailDonorsModal({ request, onClose }: EmailDonorsModalProps) {
  const locale = useLocale();
  const isBn = locale === 'bn';

  const [donors, setDonors] = useState<AdminEmailDonor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [search, setSearch] = useState('');
  const [bloodGroup, setBloodGroup] = useState(request.blood_group || '');
  const [activeStatus, setActiveStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [customNote, setCustomNote] = useState('');
  const [isSos, setIsSos] = useState(false);

  const fetchDonors = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await serverAdminSearchEmailDonors({
        bloodGroups: bloodGroup ? [bloodGroup] : [],
        activeStatus,
        search,
        limit: 300,
      });
      setDonors(rows);
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load donors');
    } finally {
      setIsLoading(false);
    }
  }, [bloodGroup, activeStatus, search]);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

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
    if (selected.size === 0) {
      toast.error(isBn ? 'কমপক্ষে একজন দাতা নির্বাচন করুন' : 'Select at least one donor');
      return;
    }
    setIsSending(true);
    try {
      const result = await serverAdminSendRequestEmail({
        requestId: request.id,
        donorIds: Array.from(selected),
        customNote: customNote || undefined,
        sos: isSos,
      });
      toast.success(
        isBn
          ? `${result.sent} জন দাতাকে ইমেইল পাঠানো হয়েছে${result.skipped ? ` (${result.skipped} বাদ)` : ''}`
          : `Email sent to ${result.sent} donor(s)${result.skipped ? ` (${result.skipped} skipped)` : ''}`,
      );
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-rose-600" />
              {isBn ? 'দাতাদের ইমেইল করুন' : 'Email Donors'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              #{request.id} • {request.patient_name} • {request.blood_group}
              {request.upazila ? ` • ${request.upazila}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700"
            >
              <option value="">{isBn ? 'সব রক্তের গ্রুপ' : 'All blood groups'}</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <select
              value={activeStatus}
              onChange={(e) => setActiveStatus(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700"
            >
              <option value="active">{isBn ? 'সক্রিয় দাতা' : 'Active donors'}</option>
              <option value="inactive">{isBn ? 'নিষ্ক্রিয় দাতা' : 'Inactive donors'}</option>
              <option value="all">{isBn ? 'সবাই' : 'All'}</option>
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

          {/* Donor list */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                disabled={donors.length === 0}
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
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                </div>
              ) : donors.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-10">
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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700" title="Opted out of alert emails — custom admin emails still send">
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

          {/* Custom note + SOS */}
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            rows={3}
            placeholder={
              isBn
                ? 'দাতাদের জন্য ঐচ্ছিক বার্তা (ইমেইলের শীর্ষে দেখাবে)…'
                : 'Optional message to donors (shown at the top of the email)…'
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 resize-y"
          />
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isSos}
              onChange={(e) => setIsSos(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <AlertTriangle className="w-4 h-4 text-red-600" />
            {isBn ? 'জরুরি (SOS) স্তরে পাঠান' : 'Send as EMERGENCY (SOS) level'}
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 sticky bottom-0 bg-white rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {isBn ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || selected.size === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isBn ? `${selected.size} জনকে পাঠান` : `Send to ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  );
}
