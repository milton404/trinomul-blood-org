'use client';

import { useState } from 'react';
import {
  serverCreateOrganization,
  serverUpdateOrganization,
} from '@/lib/db-actions';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { X, Save, Loader2 } from 'lucide-react';
import { RANGPUR_DISTRICTS } from '@/lib/constants/rangpur';

interface AddOrganizationModalProps {
  organization?: any | null; // when provided → edit mode
  onClose: () => void;
  onSave: () => void;
}

export default function AddOrganizationModal({
  organization,
  onClose,
  onSave,
}: AddOrganizationModalProps) {
  const t = useTranslations('admin');
  const locale = useTranslations();
  const isEdit = !!organization;
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name_en: organization?.name_en || '',
    name_bn: organization?.name_bn || '',
    description: organization?.description || '',
    contact_phone: organization?.contact_phone || '',
    contact_email: organization?.contact_email || '',
    district: organization?.district || '',
    is_active: organization?.is_active ?? 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_en.trim()) {
      toast.error(t('organization_name_required'));
      return;
    }
    setIsLoading(true);
    try {
      if (isEdit) {
        await serverUpdateOrganization(organization.id, formData);
        toast.success(t('organization_updated'));
      } else {
        await serverCreateOrganization(formData);
        toast.success(t('organization_created'));
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
            {isEdit ? t('edit_organization') : t('add_organization')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('name_en')} *
              </label>
              <input
                type="text"
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('name_bn')}
              </label>
              <input
                type="text"
                value={formData.name_bn}
                onChange={(e) => setFormData({ ...formData, name_bn: e.target.value })}
                dir="rtl"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('contact_phone')}
              </label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('contact_email')}
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('district')}
            </label>
            <select
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">{t('select_district')}</option>
              {RANGPUR_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name_en} ({d.name_bn})
                </option>
              ))}
            </select>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active === 1}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })
                }
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-slate-700">{t('active')}</span>
            </label>
          )}

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
              className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? t('save') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
