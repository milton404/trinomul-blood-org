'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { serverUpdateProfile, serverGetProfileByUserId } from '@/lib/db-actions';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import {
  Loader2,
  Heart,
  Save,
  Phone,
} from 'lucide-react';
import { RANGPUR_DISTRICTS, getUpazilasByDistrict } from '@/lib/constants/rangpur';

const patientSchema = z.object({
  fullNameBn: z.string().min(2, 'Name is required'),
  fullNameEn: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  sex: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  district: z.string().optional(),
  upazila: z.string().optional(),
  address: z.string().optional(),
  alternativePhone: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientCompleteFormProps {
  user: any;
  onComplete: () => void;
}

export default function PatientCompleteForm({ user, onComplete }: PatientCompleteFormProps) {
  const t = useTranslations('complete_profile');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullNameBn: (user as any)?.full_name_bn || (user as any)?.full_name_en || '',
      fullNameEn: (user as any)?.full_name_en || (user as any)?.full_name_bn || '',
      phone: (user as any)?.phone || '',
    },
  });

  // Pre-fill name/phone from the registration profile record.
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const profile = (await serverGetProfileByUserId(Number(user.id))) as any;
        if (!profile) return;
        if (!getValues('fullNameBn'))
          setValue('fullNameBn', profile.full_name_bn || profile.full_name_en || '');
        if (!getValues('fullNameEn'))
          setValue('fullNameEn', profile.full_name_en || profile.full_name_bn || '');
        if (!getValues('phone') && profile.phone) setValue('phone', profile.phone);
      } catch {
        // best-effort pre-fill only
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const availableUpazilas = selectedDistrict ? getUpazilasByDistrict(selectedDistrict) : [];

  const onSubmit = async (values: PatientFormValues) => {
    setIsLoading(true);

    try {
      await serverUpdateProfile(Number(user.id), {
        full_name_bn: values.fullNameBn,
        full_name_en: values.fullNameEn,
        phone: values.phone,
        sex: values.sex,
        date_of_birth: values.dateOfBirth || null,
        blood_group: values.bloodGroup || null,
        district: values.district || null,
        upazila: values.upazila || null,
        address: values.address || null,
        alternative_phone: values.alternativePhone || null,
        role: 'patient',
        lat: null,
        lng: null,
      });

      toast.success(t('profile_completed'));
      onComplete();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white">
          <Heart className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('patient_form_title')}</h2>
          <p className="text-slate-500">{t('patient_form_subtitle')}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-700">
          {t('patient_info')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('full_name_bn')} *
            </label>
            <input
              {...register('fullNameBn')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="রহিম উদ্দিন"
            />
            {errors.fullNameBn && (
              <p className="text-red-500 text-xs mt-1">{errors.fullNameBn.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('full_name_en')} *
            </label>
            <input
              {...register('fullNameEn')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Rahim Uddin"
            />
            {errors.fullNameEn && (
              <p className="text-red-500 text-xs mt-1">{errors.fullNameEn.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('sex')} *
            </label>
            <select
              {...register('sex')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">{t('select_sex')}</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
              <option value="other">{t('other')}</option>
            </select>
            {errors.sex && (
              <p className="text-red-500 text-xs mt-1">{errors.sex.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('date_of_birth')}
            </label>
            <input
              {...register('dateOfBirth')}
              type="date"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {tCommon('phone')} *
            </label>
            <input
              {...register('phone')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="017XXXXXXXX"
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('alternative_phone') || 'Alternative Phone'}
            </label>
            <input
              {...register('alternativePhone')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="018XXXXXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('blood_group')}
            </label>
            <select
              {...register('bloodGroup')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">{t('select_blood_group')}</option>
              {bloodGroups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('district')}
            </label>
            <select
              {...register('district')}
              onChange={(e) => {
                setValue('district', e.target.value);
                setSelectedDistrict(e.target.value);
                setValue('upazila', '');
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('upazila')}
            </label>
            <select
              {...register('upazila')}
              disabled={!selectedDistrict}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100"
            >
              <option value="">{t('select_upazila')}</option>
              {availableUpazilas.map((u) => (
                <option key={u.id} value={u.id}>
                  {locale === 'bn' ? u.name_bn : u.name_en}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('address')}
            </label>
            <textarea
              {...register('address')}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder={t('address_placeholder')}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {t('complete_profile')}
        </button>
      </form>
    </div>
  );
}
