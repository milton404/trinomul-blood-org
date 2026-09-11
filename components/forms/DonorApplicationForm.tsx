"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { serverSubmitDonorApplication } from "@/lib/db-actions";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { RANGPUR_DISTRICTS, getUpazilasByDistrict, getUnionsByUpazila } from "@/lib/constants/rangpur";
import ImageAdjustPreview from "@/components/ui/ImageAdjustPreview";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const formSchema = z.object({
  fullNameEn: z.string().min(2),
  fullNameBn: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  whatsappNumber: z.string().optional(),
  bloodGroup: z.string().min(1),
  district: z.string().min(1),
  upazila: z.string().optional(),
  union: z.string().optional(),
  address: z.string().optional(),
  sex: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(1),
  weightKg: z.string().min(1),
  occupation: z.string().optional(),
  preferredContact: z.enum(["call", "whatsapp", "either"]).optional(),
  hbLevel: z.string().optional(),
  lastHbTestDate: z.string().optional(),
  lastDonationDate: z.string().optional(),
  hasChronicDisease: z.boolean().optional(),
  diseaseDetails: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function DonorApplicationForm() {
  const t = useTranslations("donor_application");
  const locale = useLocale();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedUpazila, setSelectedUpazila] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { sex: "male", preferredContact: "call", hasChronicDisease: false },
  });

  const hasChronic = watch("hasChronicDisease");
  const upazilas = selectedDistrict ? getUpazilasByDistrict(selectedDistrict) : [];
  const availableUnions = selectedUpazila ? getUnionsByUpazila(selectedUpazila) : [];

  const onSubmit = async (data: FormValues) => {
    try {
      setUploading(true);
      let avatarUrl: string | undefined;
      if (avatarFile) {
        const result = await uploadImageToCloudinary(avatarFile, function () {}, "avatar");
        avatarUrl = result.url;
      }
      await serverSubmitDonorApplication({
        email: data.email,
        fullNameEn: data.fullNameEn,
        fullNameBn: data.fullNameBn,
        phone: data.phone,
        whatsappNumber: data.whatsappNumber || undefined,
        bloodGroup: data.bloodGroup,
        district: data.district,
        upazila: data.upazila || undefined,
        union: data.union || undefined,
        address: data.address || undefined,
        sex: data.sex,
        dateOfBirth: data.dateOfBirth,
        weightKg: Number(data.weightKg),
        occupation: data.occupation || undefined,
        preferredContact: data.preferredContact || "call",
        hbLevel: data.hbLevel ? Number(data.hbLevel) : undefined,
        lastHbTestDate: data.lastHbTestDate || undefined,
        lastDonationDate: data.lastDonationDate || undefined,
        hasChronicDisease: !!data.hasChronicDisease,
        diseaseDetails: data.diseaseDetails || undefined,
        avatarUrl,
      });
      setSubmitted(true);
      toast.success(t("toast_success"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("toast_error");
      toast.error(message || t("toast_error"));
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <Send className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t("success_title")}</h2>
        <p className="text-slate-500 mb-6">{t("success_desc")}</p>
        <Link href="/" className="inline-block px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">
          {t("back_home")}
        </Link>
      </div>
    );
  }

  const imageLabels = {
    clickToUpload: t("image_click"),
    dragHint: t("image_drag"),
    removePhoto: t("image_remove"),
    zoomOut: t("image_zoom_out"),
    zoomIn: t("image_zoom_in"),
    rotate90: t("image_rotate"),
    moveUp: t("image_up"),
    moveLeft: t("image_left"),
    moveRight: t("image_right"),
    moveDown: t("image_down"),
    resetPosition: t("image_reset"),
  };
  const distLabel = (d: typeof RANGPUR_DISTRICTS[number]) => locale === "bn" ? d.name_bn : d.name_en;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
        <h2 className="text-xl font-bold text-slate-800">{t("form_title")}</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("full_name_en")} *</label>
              <input {...register("fullNameEn")} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("full_name_en_ph")} />
              {errors.fullNameEn && <p className="text-red-500 text-xs mt-1">{errors.fullNameEn.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("full_name_bn")} *</label>
              <input {...register("fullNameBn")} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("full_name_bn_ph")} />
              {errors.fullNameBn && <p className="text-red-500 text-xs mt-1">{errors.fullNameBn.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("email")} *</label>
              <input {...register("email")} type="email" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("email_ph")} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("phone")} *</label>
              <input {...register("phone")} type="tel" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("phone_ph")} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("whatsapp")}</label>
            <input {...register("whatsappNumber")} type="tel" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("phone_ph")} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("blood_group")} *</label>
            <select {...register("bloodGroup")} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition bg-white">
              <option value="">{t("select_blood_group")}</option>
              {bloodGroups.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
            </select>
            {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("district")} *</label>
              <select {...register("district")} onChange={(e) => { register("district").onChange(e); setSelectedDistrict(e.target.value); }} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition bg-white">
                <option value="">{t("select_district")}</option>
                {RANGPUR_DISTRICTS.map((d) => <option key={d.id} value={d.id}>{distLabel(d)}</option>)}
              </select>
              {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("upazila")}</label>
              <select {...register("upazila")} onChange={(e) => { register("upazila").onChange(e); setSelectedUpazila(e.target.value); setValue("union", ""); }} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition bg-white" disabled={!selectedDistrict}>
                <option value="">{t("select_upazila")}</option>
                {upazilas.map((u) => <option key={u.id} value={u.id}>{locale === "bn" ? u.name_bn : u.name_en}</option>)}
              </select>
            </div>
            {availableUnions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("union")}</label>
                <select {...register("union")} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition bg-white">
                  <option value="">{t("select_union")}</option>
                  {availableUnions.map((u) => <option key={u.id} value={u.id}>{locale === "bn" ? u.name_bn : u.name_en}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("address")}</label>
            <input {...register("address")} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("address_ph")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("sex")} *</label>
              <select {...register("sex")} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition bg-white">
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
                <option value="other">{t("other")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("date_of_birth")} *</label>
              <input {...register("dateOfBirth")} type="date" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" />
              {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("weight_kg")} *</label>
              <input {...register("weightKg")} type="number" step="0.1" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("weight_ph")} />
              {errors.weightKg && <p className="text-red-500 text-xs mt-1">{errors.weightKg.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("occupation")}</label>
            <input {...register("occupation")} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("occupation_ph")} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("preferred_contact")}</label>
            <select {...register("preferredContact")} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition bg-white">
              <option value="call">{t("contact_call")}</option>
              <option value="whatsapp">{t("contact_whatsapp")}</option>
              <option value="either">{t("contact_either")}</option>
            </select>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t("medical_info")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("hb_level")}</label>
                <input {...register("hbLevel")} type="number" step="0.1" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("hb_ph")} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("last_hb_date")}</label>
                <input {...register("lastHbTestDate")} type="date" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("last_donation_date")}</label>
            <input {...register("lastDonationDate")} type="date" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" />
          </div>

          <div className="flex items-start gap-3">
            <input {...register("hasChronicDisease")} type="checkbox" className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500 mt-0.5" />
            <div>
              <label className="text-sm font-medium text-slate-700">{t("chronic_disease")}</label>
              <p className="text-xs text-slate-400 mt-0.5">{t("chronic_disease_hint")}</p>
            </div>
          </div>

          {hasChronic && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("disease_details")}</label>
              <textarea {...register("diseaseDetails")} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition" placeholder={t("disease_ph")} />
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t("profile_photo")}</h3>
            <ImageAdjustPreview file={avatarFile} onFileChange={setAvatarFile} labels={imageLabels} />
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{t("terms_title")}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{t("terms_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h4 className="text-sm font-semibold text-green-800 mb-2">{t("terms_do_title")}</h4>
              <ul className="space-y-1.5 text-xs text-green-700">
                <li className="flex gap-1.5"><span className="text-green-500">✓</span><span>{t("terms_do_1")}</span></li>
                <li className="flex gap-1.5"><span className="text-green-500">✓</span><span>{t("terms_do_2")}</span></li>
                <li className="flex gap-1.5"><span className="text-green-500">✓</span><span>{t("terms_do_3")}</span></li>
                <li className="flex gap-1.5"><span className="text-green-500">✓</span><span>{t("terms_do_4")}</span></li>
              </ul>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2">{t("terms_dont_title")}</h4>
              <ul className="space-y-1.5 text-xs text-red-700">
                <li className="flex gap-1.5"><span className="text-red-500">✕</span><span>{t("terms_dont_1")}</span></li>
                <li className="flex gap-1.5"><span className="text-red-500">✕</span><span>{t("terms_dont_2")}</span></li>
                <li className="flex gap-1.5"><span className="text-red-500">✕</span><span>{t("terms_dont_3")}</span></li>
                <li className="flex gap-1.5"><span className="text-red-500">✕</span><span>{t("terms_dont_4")}</span></li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-2">{t("terms_eligibility_title")}</h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex gap-1.5"><span className="text-slate-400">•</span><span>{t("terms_eligibility_1")}</span></li>
                <li className="flex gap-1.5"><span className="text-slate-400">•</span><span>{t("terms_eligibility_2")}</span></li>
                <li className="flex gap-1.5"><span className="text-slate-400">•</span><span>{t("terms_eligibility_3")}</span></li>
                <li className="flex gap-1.5"><span className="text-slate-400">•</span><span>{t("terms_eligibility_4")}</span></li>
              </ul>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500 mt-0.5" />
            <span className="text-sm text-slate-700">{t("terms_agree_label")}</span>
          </label>
          {!termsAgreed && (
            <p className="text-xs text-amber-600">{t("terms_required")}</p>
          )}
        </div>

        <div className="pt-4">
          <button type="submit" disabled={isSubmitting || uploading || !termsAgreed} className="w-full py-3.5 rounded-xl bg-red-600 text-white font-semibold text-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {isSubmitting || uploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" />{t("submitting")}</>
            ) : (
              <><Send className="w-5 h-5" />{t("submit")}</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
