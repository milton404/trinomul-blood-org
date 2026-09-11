'use client';

import { useState, useMemo, createElement, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { serverUpdateProfile, serverGetProfileByUserId } from '@/lib/db-actions';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import ImageAdjustPreview from '@/components/ui/ImageAdjustPreview';
import {
  Loader2,
  Droplets,
  Save,
  CheckCircle,
  AlertTriangle,

  Calendar,
  Scale,
  Phone,
  MessageCircle,
  User,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { RANGPUR_DISTRICTS, getUpazilasByDistrict, getUnionsByUpazila } from '@/lib/constants/rangpur';

// SSR-safe map picker — Leaflet requires browser APIs
const LocationPickerMap = dynamic(
  () => import('@/components/map/LocationPickerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full rounded-xl bg-slate-100 animate-pulse flex items-center justify-center">
        <MapPin className="w-6 h-6 text-slate-300" />
      </div>
    ),
  },
);

const donorSchema = z.object({
  fullNameBn: z.string().min(2, 'Name is required'),
  fullNameEn: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  bloodGroup: z.string().min(1, 'Blood group is required'),
  sex: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  weightKg: z.string().optional(),
  hbLevel: z.string().optional(),
  lastHbTestDate: z.string().optional(),
  district: z.string().min(1, 'District is required'),
  upazila: z.string().optional(),
  union: z.string().optional(),
  address: z.string().optional(),
  alternativePhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  preferredContact: z.enum(['call', 'whatsapp', 'either']),
  occupation: z.string().optional(),
  hasChronicDisease: z.boolean(),
  diseaseDetails: z.string().optional(),
  lastDonationDate: z.string().optional(),
  isActive: z.boolean(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  agreeTerms: z.literal(true),
});

type DonorFormValues = z.infer<typeof donorSchema>;

interface DonorCompleteFormProps {
  user: any;
  onComplete: () => void;
}

export default function DonorCompleteForm({ user, onComplete }: DonorCompleteFormProps) {
  const t = useTranslations('complete_profile');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLng, setPickedLng] = useState<number | null>(null);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DonorFormValues>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      fullNameBn: (user as any)?.full_name_bn || (user as any)?.full_name_en || '',
      fullNameEn: (user as any)?.full_name_en || (user as any)?.full_name_bn || '',
      phone: (user as any)?.phone || '',
      preferredContact: 'call',
      hasChronicDisease: false,
      isActive: true,
      lat: undefined,
      lng: undefined,
    },
  });

  // Pre-fill name/phone from the registration profile record (the auth
  // user object doesn't carry phone, so fetch the profile once).
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
        // Pre-fill previously saved map coordinates so the picker shows the
        // existing pin instead of starting blank (which would otherwise wipe
        // the stored location on save).
        if (typeof profile.lat === 'number' && typeof profile.lng === 'number') {
          setPickedLat(profile.lat);
          setPickedLng(profile.lng);
        }
      } catch {
        // best-effort pre-fill only
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const district = watch('district');
  const dob = watch('dateOfBirth');
  const lastDonation = watch('lastDonationDate');
  const hasChronicDisease = watch('hasChronicDisease');
  const availableUpazilas = selectedDistrict ? getUpazilasByDistrict(selectedDistrict) : [];
  const selectedUpazila = watch('upazila');
  const availableUnions = selectedUpazila ? getUnionsByUpazila(selectedUpazila) : [];

  // Pre-fill weight from the donor eligibility onboarding (if the user
  // took it on the register page). Age from onboarding is informational
  // only — the real age is derived from dateOfBirth below.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('donor_eligibility_onboarding');
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        eligible: boolean;
        answers: Record<string, any>;
      };
      const weight = parsed.answers?.weight;
      if (weight && !Number.isNaN(Number(weight))) {
        setValue('weightKg', String(weight));
      }
    } catch {
      // ignore parse / storage errors
    }
  }, [setValue]);

  const ageInfo = useMemo(() => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      years--;
    }
    if (years < 0) return null;
    if (years < 18) return { age: years, status: 'under' as const };
    if (years > 60) return { age: years, status: 'over' as const };
    return { age: years, status: 'eligible' as const };
  }, [dob]);

  const nextEligibleDate = useMemo(() => {
    if (!lastDonation) return null;
    const last = new Date(lastDonation);
    const next = new Date(last);
    next.setDate(next.getDate() + 90);
    return next.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [lastDonation, locale]);

  const steps = [
    { key: 'personal', label: t('step_personal'), icon: User },
    { key: 'location', label: t('step_location'), icon: Droplets },
    { key: 'medical', label: t('step_medical'), icon: ShieldCheck },
    { key: 'confirm', label: t('step_confirm'), icon: CheckCircle },
  ];

  const onSubmit = async (values: DonorFormValues) => {
    setIsLoading(true);

    try {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const result = await uploadImageToCloudinary(avatarFile, () => {}, 'avatar');
        avatarUrl = result.url;
      }

      await serverUpdateProfile(Number(user.id), {
        full_name_bn: values.fullNameBn,
        full_name_en: values.fullNameEn,
        phone: values.phone,
        blood_group: values.bloodGroup,
        sex: values.sex,
        date_of_birth: values.dateOfBirth,
        weight_kg: values.weightKg,
        district: values.district,
        upazila: values.upazila,
        union_name: values.union || null,
        address: values.address,
        alternative_phone: values.alternativePhone || null,
        whatsapp_number: values.whatsappNumber || null,
        preferred_contact: values.preferredContact,
        occupation: values.occupation || null,
        has_chronic_disease: values.hasChronicDisease ? 1 : 0,
        disease_details: values.hasChronicDisease ? (values.diseaseDetails || null) : null,
        hb_level: values.hbLevel ? parseFloat(values.hbLevel) : null,
        last_hb_test_date: values.lastHbTestDate || null,
        role: 'donor',
        is_active: values.isActive ? 1 : 0,
        last_donation_date: values.lastDonationDate || null,
        lat: pickedLat ?? null,
        lng: pickedLng ?? null,
        avatar_url: avatarUrl,
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
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white flex-shrink-0">
          <Droplets className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{t('donor_form_title')}</h2>
          <p className="text-xs sm:text-sm text-slate-500">{t('donor_form_subtitle')}</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 px-1">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setActiveStep(i)}
              className={`flex flex-col items-center gap-1 flex-1 transition-all ${
                i <= activeStep ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < activeStep
                    ? 'bg-green-500 text-white'
                    : i === activeStep
                      ? 'bg-green-800 text-white ring-4 ring-green-100'
                      : 'bg-slate-200 text-slate-400'
                }`}
              >
                {i < activeStep ? (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </div>
              <span className={`text-[10px] sm:text-xs font-medium hidden sm:block ${i === activeStep ? 'text-green-800' : 'text-slate-500'}`}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">

        {/* STEP 1: Personal Info */}
        {activeStep === 0 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('photo_upload')}
              </label>
              <p className="text-xs text-slate-400 mb-2">{t('photo_upload_hint')}</p>
              <ImageAdjustPreview
                file={avatarFile}
                onFileChange={setAvatarFile}
                labels={{
                  clickToUpload: t('image_click'),
                  changePhoto: t('image_change'),
                  dragHint: t('image_drag'),
                  removePhoto: t('image_remove'),
                  zoomIn: t('image_zoom_in'),
                  zoomOut: t('image_zoom_out'),
                  rotate90: t('image_rotate'),
                  moveUp: t('image_up'),
                  moveLeft: t('image_left'),
                  moveRight: t('image_right'),
                  moveDown: t('image_down'),
                  resetPosition: t('image_reset'),
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('full_name_en')} *
                </label>
                <input {...register('fullNameEn')} className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="Rahim Uddin" />
                {errors.fullNameEn && <p className="text-red-500 text-xs mt-1">{errors.fullNameEn.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('full_name_bn')} *
                </label>
                <input {...register('fullNameBn')} className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="রহিম উদ্দিন" />
                {errors.fullNameBn && <p className="text-red-500 text-xs mt-1">{errors.fullNameBn.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {tCommon('phone')} *
                </label>
                <input {...register('phone')} className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder="017XXXXXXXX" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('blood_group')} *
                </label>
                <select {...register('bloodGroup')} className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white text-sm">
                  <option value="">{t('select_blood_group')}</option>
                  {bloodGroups.map((group) => (<option key={group} value={group}>{group}</option>))}
                </select>
                {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('sex')} *
                </label>
                <select {...register('sex')} className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white text-sm">
                  <option value="">{t('select_sex')}</option>
                  <option value="male">{t('male')}</option>
                  <option value="female">{t('female')}</option>
                  <option value="other">{t('other')}</option>
                </select>
                {errors.sex && <p className="text-red-500 text-xs mt-1">{errors.sex.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('date_of_birth')} *
                </label>
                <input {...register('dateOfBirth')} type="date" className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('weight_kg')} * <Scale className="w-3 h-3 inline text-slate-400" />
                </label>
                <input {...register('weightKg', { valueAsNumber: true })} type="number" className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder={t('weight_placeholder')} />
                <p className="text-[10px] sm:text-xs text-amber-600 mt-0.5">{t('weight_hint')}</p>
                {errors.weightKg && <p className="text-red-500 text-xs mt-0.5">{errors.weightKg.message}</p>}
              </div>
            </div>

            {ageInfo && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm ${
                ageInfo.status === 'eligible' ? 'bg-green-50 text-green-700' :
                ageInfo.status === 'under' ? 'bg-amber-50 text-amber-700' :
                'bg-orange-50 text-orange-700'
              }`} suppressHydrationWarning>
                {ageInfo.status === 'eligible' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{t('auto_age')} <strong>{ageInfo.age}</strong> — {
                  ageInfo.status === 'eligible' ? t('age_eligible') :
                  ageInfo.status === 'under' ? t('age_under_18') : t('age_over_60')
                }</span>
              </div>
            )}

            <button type="button" onClick={() => setActiveStep(1)} className="w-full bg-green-800 text-white py-3 rounded-xl font-semibold hover:bg-green-900 transition-all">
              Next: {t('step_location')} →
            </button>
          </div>
        )}

        {/* STEP 2: Location & Contact */}
        {activeStep === 1 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('district')} *
                </label>
                <select
                  {...register('district')}
                  onChange={(e) => { setValue('district', e.target.value); setSelectedDistrict(e.target.value); setValue('upazila', ''); }}
                  className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white text-sm"
                >
                  <option value="">{t('select_district')}</option>
                  {RANGPUR_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>{locale === 'bn' ? d.name_bn : d.name_en}</option>
                  ))}
                </select>
                {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('upazila')}</label>
                <select {...register('upazila')} disabled={!selectedDistrict}
                  onChange={(e) => { setValue('upazila', e.target.value); setValue('union', ''); }}
                  className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white disabled:bg-slate-100 text-sm"
                >
                  <option value="">{t('select_upazila')}</option>
                  {availableUpazilas.map((u) => (
                    <option key={u.id} value={u.id}>{locale === 'bn' ? u.name_bn : u.name_en}</option>
                  ))}
                </select>
              </div>

              {availableUnions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('union')}</label>
                  <select {...register('union')}
                    className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white text-sm"
                  >
                    <option value="">{t('select_union')}</option>
                    {availableUnions.map((u) => (
                      <option key={u.id} value={u.id}>{locale === 'bn' ? u.name_bn : u.name_en}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('address')}</label>
                <textarea {...register('address')} rows={2}
                  className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none text-sm"
                  placeholder={t('address_placeholder')}
                />
              </div>
            </div>

            {/* Map Location Picker */}
            <div className="border-t border-slate-100 pt-4 sm:pt-5">
              <LocationPickerMap
                label={t('pick_location') || 'Pick Your Location on Map'}
                hint={t('pick_location_hint') || 'Click on the map to mark your approximate location. This helps responders find you faster.'}
                height={260}
                initialLat={pickedLat}
                initialLng={pickedLng}
                onLocationChange={(lat, lng) => {
                  // The picker emits (0,0) when the pin is removed — treat
                  // that as "clear" rather than a real coordinate.
                  if (lat === 0 && lng === 0) {
                    setPickedLat(null);
                    setPickedLng(null);
                    return;
                  }
                  setPickedLat(lat);
                  setPickedLng(lng);
                }}
              />
            </div>

            <div className="border-t border-slate-100 pt-4 sm:pt-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">Contact Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-blue-500" />{t('alternative_phone')}
                  </label>
                  <input {...register('alternativePhone')} className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder={t('alternative_phone_hint')} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <MessageCircle className="w-3.5 h-3.5 inline mr-1 text-green-500" />{t('whatsapp_number')}
                  </label>
                  <input {...register('whatsappNumber')} className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder={t('whatsapp_number_hint')} />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('preferred_contact')}</label>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {[
                      { val: 'call' as const, labelKey: 'pref_call', icon: Phone },
                      { val: 'whatsapp' as const, labelKey: 'pref_whatsapp', icon: MessageCircle },
                      { val: 'either' as const, labelKey: 'pref_either' },
                    ].map((opt) => (
                      <label key={opt.val} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm ${
                        watch('preferredContact') === opt.val ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                        <input type="radio" value={opt.val} {...register('preferredContact')} className="sr-only" />
                        {'icon' in opt ? createElement(opt.icon as any, { className: "w-3.5 h-3.5" }) : null}
                        {t(opt.labelKey)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <User className="w-3.5 h-3.5 inline mr-1 text-purple-500" />{t('occupation')}
                  </label>
                  <input {...register('occupation')} className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" placeholder={t('occupation_placeholder')} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setActiveStep(0)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all">
                ← Back
              </button>
              <button type="button" onClick={() => setActiveStep(2)} className="flex-1 bg-green-800 text-white py-3 rounded-xl font-semibold hover:bg-green-900 transition-all">
                Next: {t('step_medical')} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Medical Info */}
        {activeStep === 2 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />{t('last_donation_date')}
                </label>
                <input {...register('lastDonationDate')} type="date" className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{t('last_donation_hint')}</p>
                {nextEligibleDate && (
                  <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{t('next_eligible_date')} <strong>{nextEligibleDate}</strong>
                  </p>
                )}
              </div>

              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 p-3 sm:p-4 bg-green-50 rounded-xl border border-green-200 cursor-pointer flex-1">
                  <input type="checkbox" id="isActive" {...register('isActive')} className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer">
                    <CheckCircle className="w-4 h-4 text-green-600" />{t('available_for_donation')}
                  </label>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 sm:pt-5">
              <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-red-500" />{t('hb_level')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t('hb_level')}
                  </label>
                  <input
                    {...register('hbLevel')}
                    type="number"
                    step="0.1"
                    min="0"
                    max="25"
                    className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                    placeholder={t('hb_placeholder') || 'e.g. 13.5'}
                  />
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{t('hb_hint')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />{t('last_hb_test_date')}
                  </label>
                  <input {...register('lastHbTestDate')} type="date" className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 sm:pt-5">
              <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-red-500" />Health Declaration
              </p>

              <p className="text-sm font-medium text-slate-700 mb-2">{t('has_chronic_disease')}</p>
              <div className="flex gap-3 mb-3">
                <label className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border cursor-pointer text-sm transition-all ${
                  !hasChronicDisease ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" value="false" checked={!hasChronicDisease} onChange={() => setValue('hasChronicDisease', false)} className="sr-only" />
                  {t('chronic_disease_no')}
                </label>
                <label className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border cursor-pointer text-sm transition-all ${
                  hasChronicDisease ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input type="radio" value="true" checked={hasChronicDisease} onChange={() => setValue('hasChronicDisease', true)} className="sr-only" />
                  {t('chronic_disease_yes')}
                </label>
              </div>

              {hasChronicDisease && (
                <textarea
                  {...register('diseaseDetails')}
                  rows={2}
                  className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-500 outline-none resize-none text-sm bg-amber-50/30"
                  placeholder={t('disease_details_placeholder')}
                />
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setActiveStep(1)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all">
                ← Back
              </button>
              <button type="button" onClick={() => setActiveStep(3)} className="flex-1 bg-green-800 text-white py-3 rounded-xl font-semibold hover:bg-green-900 transition-all">
                Next: {t('step_confirm')} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm */}
        {activeStep === 3 && (
          <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
            <div className="bg-slate-50 rounded-xl p-4 sm:p-5 space-y-2 sm:space-y-3 text-sm">
              <h3 className="font-bold text-slate-800 text-base mb-2">Review Your Information</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div><span className="text-slate-400">Name:</span> <strong>{watch('fullNameEn')}</strong></div>
                <div><span className="text-slate-400">Blood:</span> <strong className="text-red-600">{watch('bloodGroup')}</strong></div>
                <div><span className="text-slate-400">Sex:</span> <strong>{watch('sex')}</strong></div>
                <div><span className="text-slate-400">Weight:</span> <strong>{watch('weightKg')} kg</strong></div>
                <div><span className="text-slate-400">District:</span> <strong>{watch('district')}</strong></div>
                <div><span className="text-slate-400">Available:</span> <strong>{watch('isActive') ? 'Yes' : 'No'}</strong></div>
                {ageInfo && <div className="col-span-2" suppressHydrationWarning><span className="text-slate-400">Age:</span> <strong>{ageInfo.age} years</strong></div>}
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-200 cursor-pointer">
              <input type="checkbox" {...register('agreeTerms')} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t('terms_agree')}{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">{t('terms_link')}</a>
              </span>
            </label>
            {errors.agreeTerms && <p className="text-red-500 text-xs ml-1">{errors.agreeTerms.message}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={() => setActiveStep(2)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all">
                ← Back
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-green-800 to-green-700 text-white py-3 sm:py-4 rounded-xl font-semibold hover:from-green-900 hover:to-green-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {t('complete_profile')}
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
