'use client';

import { useState } from 'react';
import { serverRegister } from '@/lib/auth/actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { X, Save, Loader2 } from 'lucide-react';
import { RANGPUR_DISTRICTS, getUpazilasByDistrict } from '@/lib/constants/rangpur';

interface AddHospitalModalProps {
  onClose: () => void;
  onSave: () => void;
}

export default function AddHospitalModal({ onClose, onSave }: AddHospitalModalProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    hospital_name_en: '',
    hospital_name_bn: '',
    email: '',
    phone: '',
    password: '',
    license_number: '',
    website: '',
    district: '',
    upazila: '',
    address: '',
  });

  const availableUpazilas = formData.district ? getUpazilasByDistrict(formData.district) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error(t('email_password_required'));
      return;
    }
    if (formData.password.length < 6) {
      toast.error(t('password_min_length'));
      return;
    }
    setIsLoading(true);
    try {
      // serverRegister properly hashes the password with bcrypt.
      await serverRegister({
        email: formData.email,
        password: formData.password,
        fullName: formData.hospital_name_en || formData.hospital_name_bn,
        phone: formData.phone,
        role: 'hospital',
        hospitalNameEn: formData.hospital_name_en,
        hospitalNameBn: formData.hospital_name_bn,
        licenseNumber: formData.license_number,
        website: formData.website,
        district: formData.district,
        upazila: formData.upazila,
        address: formData.address,
      });
      toast.success(t('hospital_created'));
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
          <h2 className="text-xl font-bold text-slate-900">{t('add_hospital')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_name_en')}</label>
              <input
                type="text"
                value={formData.hospital_name_en}
                onChange={(e) => setFormData({ ...formData, hospital_name_en: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('hospital_name_bn')}</label>
              <input
                type="text"
                value={formData.hospital_name_bn}
                onChange={(e) => setFormData({ ...formData, hospital_name_bn: e.target.value })}
                dir="rtl"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')} *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('phone')}</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('password')} *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('license_number')}</label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('district')}</label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value, upazila: '' })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none bg-white"
              >
                <option value="">{t('select_district')}</option>
                {RANGPUR_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {locale === 'bn' ? d.name_bn : d.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('upazila')}</label>
              <select
                value={formData.upazila}
                onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                disabled={!formData.district}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100"
              >
                <option value="">{t('select_upazila')}</option>
                {availableUpazilas.map((u) => (
                  <option key={u.id} value={u.id}>
                    {locale === 'bn' ? u.name_bn : u.name_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('website')}</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
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
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
