'use client';

import { useState } from 'react';
import { UserPlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { serverQuickCreateDonor } from '@/lib/db-actions';

interface QuickAddDonorProps {
  /** Default blood group to pre-fill (e.g. from the request being fulfilled) */
  defaultBloodGroup?: string;
  /** Called with the newly created (or existing) donor profile */
  onCreated: (donor: {
    id: number;
    full_name_en: string;
    full_name_bn: string | null;
    phone: string;
    blood_group: string;
  }) => void;
  /** Optional: locale for bilingual labels */
  locale?: string;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Inline "Add new donor" form shown when the searched donor is not found.
 * Creates a minimal `profiles` row with role='donor' via serverQuickCreateDonor,
 * then calls onCreated so the parent modal can select the new donor.
 */
export default function QuickAddDonor({
  defaultBloodGroup = 'A+',
  onCreated,
  locale = 'en',
}: QuickAddDonorProps) {
  const isBn = locale === 'bn';
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState(defaultBloodGroup);
  const [password, setPassword] = useState('');

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm';

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(isBn ? 'নাম আবশ্যক' : 'Name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error(isBn ? 'ফোন নম্বর আবশ্যক' : 'Phone is required');
      return;
    }
    if (!password.trim() || password.length < 6) {
      toast.error(isBn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর' : 'Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      const donor = await serverQuickCreateDonor({
        fullName: name.trim(),
        phone: phone.trim(),
        bloodGroup,
        password: password.trim(),
      });
      toast.success(
        isBn ? `ডোনার যোগ হয়েছে: ${donor.full_name_en}` : `Donor added: ${donor.full_name_en}`,
      );
      onCreated(donor);
      setExpanded(false);
      setName('');
      setPhone('');
      setPassword('');
    } catch (e: any) {
      toast.error(e.message || (isBn ? 'ব্যর্থ' : 'Failed to create donor'));
    }
    setSaving(false);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full mt-2 py-2 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        {isBn ? 'নতুন ডোনার যোগ করুন' : 'Add new donor'}
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5" />
          {isBn ? 'নতুন ডোনার' : 'New Donor'}
        </p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="p-1 hover:bg-slate-100 rounded-lg"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isBn ? 'পুরো নাম' : 'Full name'}
          className={inputCls}
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={isBn ? 'ফোন নম্বর' : 'Phone number'}
          className={inputCls}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
          {isBn ? 'রক্তের গ্রুপ' : 'Blood group'}
        </label>
        <select
          value={bloodGroup}
          onChange={(e) => setBloodGroup(e.target.value)}
          className={`${inputCls} bg-white flex-1`}
        >
          {BLOOD_GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={isBn ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min 6 chars)'}
        className={inputCls}
      />
      <button
        type="button"
        onClick={handleCreate}
        disabled={saving}
        className="w-full py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        {isBn ? 'ডোনার তৈরি করুন' : 'Create donor'}
      </button>
    </div>
  );
}