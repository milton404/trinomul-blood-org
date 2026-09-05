'use client';

import { useState, useEffect } from 'react';
import { serverSearchProfiles, serverCreateDonation, serverUpdateDonation, serverSearchReferrerCandidates } from '@/lib/db-actions';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { X, Save, Loader2, Search, User, Handshake } from 'lucide-react';
import QuickAddDonor from './QuickAddDonor';

interface AddDonationModalProps {
  donation?: any | null; // when provided → edit mode
  onClose: () => void;
  onSave: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const DONATION_TYPES = [
  { value: 'whole_blood', label: 'Whole Blood' },
  { value: 'platelets', label: 'Platelets' },
  { value: 'plasma', label: 'Plasma' },
];
const RECIPIENT_TYPES = ['Patient', 'Hospital', 'Blood Bank', 'Other'];

export default function AddDonationModal({ donation, onClose, onSave }: AddDonationModalProps) {
  const t = useTranslations('admin');
  const isEdit = !!donation;

  const [isLoading, setIsLoading] = useState(false);
  const [donorSearch, setDonorSearch] = useState('');
  const [donorResults, setDonorResults] = useState<any[]>([]);
  const [showDonorResults, setShowDonorResults] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<any>(
    donation
      ? {
          id: donation.donor_id,
          full_name_en: donation.donor_name || 'Unknown',
          phone: donation.donor_phone || '',
          blood_group: donation.blood_group,
        }
      : null,
  );

  const [formData, setFormData] = useState({
    donor_id: donation?.donor_id || null as number | null,
    request_id: donation?.request_id || null,
    blood_group: donation?.blood_group || 'A+',
    units: donation?.units || 1,
    hospital_name: donation?.hospital_name || '',
    donation_date: donation?.donation_date
      ? new Date(donation.donation_date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    donation_type: donation?.donation_type || 'whole_blood',
    recipient_type: donation?.recipient_type || 'Patient',
    notes: donation?.notes || '',
  });

  // Referrer (the person who helped find the donor)
  const [refMode, setRefMode] = useState<'none' | 'user' | 'text'>(
    donation?.referrer_profile_id ? 'user' : donation?.referrer_name ? 'text' : 'none',
  );
  const [refSearch, setRefSearch] = useState('');
  const [refCandidates, setRefCandidates] = useState<any[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<any>(
    donation?.referrer_profile_id
      ? {
          id: donation.referrer_profile_id,
          full_name_en: donation.referrer_profile_name || donation.referrer_name || 'Unknown',
          phone: donation.referrer_phone || '',
        }
      : null,
  );
  const [refName, setRefName] = useState(donation?.referrer_profile_id ? '' : donation?.referrer_name || '');
  const [refPhone, setRefPhone] = useState(donation?.referrer_phone || '');

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

  const searchDonors = async (query: string) => {
    setDonorSearch(query);
    if (query.length < 2) {
      setDonorResults([]);
      setShowDonorResults(false);
      return;
    }
    try {
      const result = await serverSearchProfiles({
        role: 'donor',
        search: query,
        limit: 8,
      });
      setDonorResults(result.rows || []);
      setShowDonorResults(true);
    } catch (err) {
      console.error('Donor search failed:', err);
    }
  };

  const selectDonor = (donor: any) => {
    setSelectedDonor(donor);
    setFormData({
      ...formData,
      donor_id: donor.id,
      blood_group: donor.blood_group || formData.blood_group,
    });
    setShowDonorResults(false);
    setDonorSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.donor_id) {
      toast.error(t('donation_select_donor'));
      return;
    }
    setIsLoading(true);
    try {
      const referrerProfileId = refMode === 'user' && selectedReferrer ? selectedReferrer.id : null;
      const referrerName = refMode === 'text' && refName.trim() ? refName.trim() : null;
      const referrerPhone =
        (refMode === 'text' && refPhone.trim()) || (refMode === 'user' && selectedReferrer?.phone)
          ? (refMode === 'user' ? selectedReferrer.phone : refPhone.trim())
          : null;
      const payload = {
        ...formData,
        donorId: formData.donor_id,
        requestId: formData.request_id,
        bloodGroup: formData.blood_group,
        hospitalName: formData.hospital_name,
        donationDate: formData.donation_date,
        donationType: formData.donation_type,
        recipientType: formData.recipient_type,
        referrerProfileId,
        referrerName,
        referrerPhone,
      };
      if (isEdit) {
        await serverUpdateDonation(donation.id, {
          donor_id: payload.donorId,
          request_id: payload.requestId,
          blood_group: payload.bloodGroup,
          units: payload.units,
          hospital_name: payload.hospitalName,
          donation_date: payload.donationDate,
          donation_type: payload.donationType,
          recipient_type: payload.recipientType,
          notes: payload.notes,
          referrer_profile_id: referrerProfileId,
          referrer_name: referrerName,
          referrer_phone: referrerPhone,
        });
        toast.success(t('donation_updated'));
      } else {
        await serverCreateDonation(payload);
        toast.success(t('donation_created'));
      }
      onSave();
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
          <h2 className="text-xl font-bold text-slate-900">
            {isEdit ? t('edit_donation') : t('record_donation')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Donor search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('donor')} *
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
                  onClick={() => {
                    setSelectedDonor(null);
                    setFormData({ ...formData, donor_id: null });
                  }}
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
                  onChange={(e) => searchDonors(e.target.value)}
                  placeholder={t('search_donors_placeholder') || 'Search donor by name or phone...'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
                />
                {showDonorResults && donorResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {donorResults.map((donor) => (
                      <button
                        key={donor.id}
                        type="button"
                        onClick={() => selectDonor(donor)}
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
                  defaultBloodGroup={formData.blood_group}
                  onCreated={(donor) => selectDonor(donor)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('blood_group')}</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('units')}</label>
              <input
                type="number"
                min="1"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('donation_type')}</label>
              <select
                value={formData.donation_type}
                onChange={(e) => setFormData({ ...formData, donation_type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                {DONATION_TYPES.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('recipient_type')}</label>
              <select
                value={formData.recipient_type}
                onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
              >
                {RECIPIENT_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('donation_date')}</label>
              <input
                type="date"
                value={formData.donation_date}
                onChange={(e) => setFormData({ ...formData, donation_date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_name_optional') || t('hospital') }</label>
              <input
                type="text"
                value={formData.hospital_name}
                onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>

          {/* Referrer — who helped find the donor? */}
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('notes_optional') || 'Notes (optional)'}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
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
              className="px-6 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? t('save') : t('record')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
