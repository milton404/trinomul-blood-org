'use client';

import { useState, useEffect } from 'react';
import {
  serverSearchProfiles,
  serverMarkRequestFulfilled,
  serverSearchReferrerCandidates,
} from '@/lib/db-actions';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { X, Loader2, Search, User, CheckCircle, Handshake } from 'lucide-react';
import QuickAddDonor from './QuickAddDonor';

interface FulfillRequestModalProps {
  request: {
    id: number;
    patient_name: string;
    blood_group: string;
    units_needed: number;
    hospital_name?: string;
  };
  onClose: () => void;
  onDone: () => void;
}

const DONATION_TYPES = [
  { value: 'whole_blood', label: 'Whole Blood' },
  { value: 'platelets', label: 'Platelets' },
  { value: 'plasma', label: 'Plasma' },
];

/**
 * Mark a blood request fulfilled: pick the donor, record the donation,
 * optionally credit a referrer (registered user or free-text), toggle the
 * public "Completed" seal, and attach an admin notice to the card.
 */
export default function FulfillRequestModal({ request, onClose, onDone }: FulfillRequestModalProps) {
  const t = useTranslations('admin');
  const [isLoading, setIsLoading] = useState(false);

  // Donor picker
  const [donorSearch, setDonorSearch] = useState('');
  const [donorResults, setDonorResults] = useState<any[]>([]);
  const [showDonorResults, setShowDonorResults] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<any>(null);

  // Donation details
  const [donationType, setDonationType] = useState('whole_blood');
  const [units, setUnits] = useState<number>(request.units_needed || 1);
  const [showBadge, setShowBadge] = useState(true);
  const [adminNotice, setAdminNotice] = useState('');

  // Referrer (the person who helped find the donor)
  const [refMode, setRefMode] = useState<'none' | 'user' | 'text'>('none');
  const [refSearch, setRefSearch] = useState('');
  const [refCandidates, setRefCandidates] = useState<any[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<any>(null);
  const [refName, setRefName] = useState('');
  const [refPhone, setRefPhone] = useState('');

  // Debounced donor search
  useEffect(() => {
    if (donorSearch.trim().length < 2) {
      setDonorResults([]);
      setShowDonorResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const result = await serverSearchProfiles({
          role: 'donor',
          search: donorSearch.trim(),
          limit: 8,
        });
        setDonorResults(result.rows || []);
        setShowDonorResults(true);
      } catch (err) {
        console.error('Donor search failed:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [donorSearch]);

  // Debounced referrer (registered user) search
  useEffect(() => {
    if (refMode !== 'user' || !refSearch.trim()) {
      setRefCandidates([]);
      return;
    }
    const timer = setTimeout(() => {
      serverSearchReferrerCandidates(refSearch.trim())
        .then((rows: any) => setRefCandidates(rows || []))
        .catch(() => setRefCandidates([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [refMode, refSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonor) {
      toast.error(t('donation_select_donor'));
      return;
    }
    setIsLoading(true);
    try {
      await serverMarkRequestFulfilled({
        requestId: request.id,
        donorId: selectedDonor.id,
        donationType,
        units: units || 1,
        showBadge,
        adminNotice: adminNotice.trim() || null,
        referrerProfileId: refMode === 'user' && selectedReferrer ? selectedReferrer.id : null,
        referrerName: refMode === 'text' && refName.trim() ? refName.trim() : null,
        referrerPhone: refMode === 'text' && refPhone.trim() ? refPhone.trim() : null,
        actorEmail: 'admin',
      });
      toast.success(t('request_fulfilled') || 'Request marked as fulfilled');
      onDone();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t('fulfill_request') || 'Mark Request Fulfilled'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {request.patient_name} • {request.blood_group}
              {request.hospital_name ? ` • ${request.hospital_name}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Donor picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('who_donated') || 'Who donated?'} *
            </label>
            {selectedDonor ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {selectedDonor.full_name_en || selectedDonor.full_name_bn}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedDonor.phone} • {selectedDonor.blood_group}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDonor(null)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={donorSearch}
                  onChange={(e) => setDonorSearch(e.target.value)}
                  placeholder={t('search_donors_placeholder') || 'Search donor by name or phone...'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                />
                {showDonorResults && donorResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {donorResults.map((donor) => (
                      <button
                        key={donor.id}
                        type="button"
                        onClick={() => {
                          setSelectedDonor(donor);
                          setShowDonorResults(false);
                          setDonorSearch('');
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            {donor.full_name_en || donor.full_name_bn}
                          </p>
                          <p className="text-xs text-slate-500">{donor.phone} • {donor.blood_group}</p>
                        </div>
                        <span className="text-xs text-slate-400">#{donor.id}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showDonorResults && donorResults.length === 0 && donorSearch.trim().length >= 2 && (
                  <p className="text-xs text-slate-400 mt-1 ml-1">
                    {t('no_donor_found') || 'No donor found. Add a new one below.'}
                  </p>
                )}
                <QuickAddDonor
                  defaultBloodGroup={request.blood_group}
                  onCreated={(donor) => {
                    setSelectedDonor(donor);
                    setShowDonorResults(false);
                    setDonorSearch('');
                  }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('donation_type')}</label>
              <select
                value={donationType}
                onChange={(e) => setDonationType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                {DONATION_TYPES.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('units')}</label>
              <input
                type="number"
                min="1"
                value={units}
                onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          {/* Referrer */}
          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Handshake className="w-4 h-4 text-indigo-500" />
              {t('who_referred') || 'Who referred the donor? (optional)'}
            </label>
            <select
              value={refMode}
              onChange={(e) => {
                setRefMode(e.target.value as 'none' | 'user' | 'text');
                setSelectedReferrer(null);
                setRefSearch('');
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
            >
              <option value="none">{t('referrer_none') || 'No one / Skip'}</option>
              <option value="user">{t('referrer_user') || 'A registered user'}</option>
              <option value="text">{t('referrer_other') || 'Someone else (name + phone)'}</option>
            </select>

            {refMode === 'user' && (
              <div className="relative">
                {selectedReferrer ? (
                  <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="font-semibold text-slate-900 text-sm">
                      ✓ {selectedReferrer.full_name_en || selectedReferrer.full_name_bn}
                      <span className="text-xs text-slate-500 font-normal"> • {selectedReferrer.phone}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedReferrer(null)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={refSearch}
                      onChange={(e) => setRefSearch(e.target.value)}
                      placeholder={t('referrer_search_ph') || 'Search user by name or phone...'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                    />
                    {refCandidates.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {refCandidates.map((u: any) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedReferrer(u);
                              setRefCandidates([]);
                              setRefSearch('');
                            }}
                            className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                          >
                            <p className="font-medium text-slate-900 text-sm">
                              {u.full_name_en || u.full_name_bn}
                            </p>
                            <p className="text-xs text-slate-500">{u.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {refMode === 'text' && (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={refName}
                  onChange={(e) => setRefName(e.target.value)}
                  placeholder={t('referrer_name_ph') || 'Referrer name'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                />
                <input
                  type="text"
                  value={refPhone}
                  onChange={(e) => setRefPhone(e.target.value)}
                  placeholder={t('referrer_phone_ph') || 'Phone (optional)'}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Completed seal toggle */}
          <label className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 cursor-pointer">
            <input
              type="checkbox"
              checked={showBadge}
              onChange={(e) => setShowBadge(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-600"
            />
            <span className="text-sm text-slate-700">
              <span className="font-semibold block">{t('show_completed_seal') || "Show 'Completed' seal on the public card"}</span>
              <span className="text-xs text-slate-500">
                {t('show_completed_seal_desc') || 'The card stays visible with a green seal until end of tomorrow.'}
              </span>
            </span>
          </label>

          {/* Admin notice */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              📢 {t('admin_notice') || 'Admin notice (shown on the public card)'}
            </label>
            <textarea
              value={adminNotice}
              onChange={(e) => setAdminNotice(e.target.value)}
              rows={2}
              placeholder={t('admin_notice_ph') || 'Important notice for visitors…'}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white">
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
              className="px-6 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {t('mark_fulfilled')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
