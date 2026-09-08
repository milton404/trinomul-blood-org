"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { serverUpdateProfile } from "@/lib/db-actions";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Loader2, Building2, Save } from "lucide-react";
import {
  RANGPUR_DISTRICTS,
  getUpazilasByDistrict,
} from "@/lib/constants/rangpur";

const hospitalSchema = z.object({
  hospitalNameBn: z.string().min(2, "Hospital name is required"),
  hospitalNameEn: z.string().min(2, "Hospital name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  district: z.string().min(1, "District is required"),
  upazila: z.string().optional(),
  address: z.string().min(5, "Address is required"),
  licenseNumber: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type HospitalFormValues = z.infer<typeof hospitalSchema>;

interface HospitalCompleteFormProps {
  user: any;
  onComplete: () => void;
}

export default function HospitalCompleteForm({
  user,
  onComplete,
}: HospitalCompleteFormProps) {
  const t = useTranslations("complete_profile");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HospitalFormValues>({
    resolver: zodResolver(hospitalSchema),
    defaultValues: {
      phone: user?.user_metadata?.phone || "",
    },
  });

  const availableUpazilas = selectedDistrict
    ? getUpazilasByDistrict(selectedDistrict)
    : [];

  const onSubmit = async (values: HospitalFormValues) => {
    setIsLoading(true);

    try {
      await serverUpdateProfile(Number(user.id), {
        hospital_name_bn: values.hospitalNameBn,
        hospital_name_en: values.hospitalNameEn,
        phone: values.phone,
        district: values.district,
        upazila: values.upazila || null,
        address: values.address,
        license_number: values.licenseNumber || null,
        website: values.website || null,
        role: "hospital",
        lat: null,
        lng: null,
      });

      toast.success(t("profile_completed"));
      onComplete();
    } catch (error: any) {
      toast.error(error.message || t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {t("hospital_form_title")}
          </h2>
          <p className="text-slate-500">{t("hospital_form_subtitle")}</p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-green-700">{t("hospital_info")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("hospital_name_bn")} *
            </label>
            <input
              {...register("hospitalNameBn")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="রংপুর মেডিকেল কলেজ হাসপাতাল"
            />
            {errors.hospitalNameBn && (
              <p className="text-red-500 text-xs mt-1">
                {errors.hospitalNameBn.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("hospital_name_en")} *
            </label>
            <input
              {...register("hospitalNameEn")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Rangpur Medical College Hospital"
            />
            {errors.hospitalNameEn && (
              <p className="text-red-500 text-xs mt-1">
                {errors.hospitalNameEn.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {tCommon("phone")} *
            </label>
            <input
              {...register("phone")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="017XXXXXXXX"
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("license_number")}
            </label>
            <input
              {...register("licenseNumber")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="H-12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("district")} *
            </label>
            <select
              {...register("district")}
              onChange={(e) => {
                setValue("district", e.target.value);
                setSelectedDistrict(e.target.value);
                setValue("upazila", "");
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none bg-white"
            >
              <option value="">{t("select_district")}</option>
              {RANGPUR_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {locale === "bn" ? d.name_bn : d.name_en}
                </option>
              ))}
            </select>
            {errors.district && (
              <p className="text-red-500 text-xs mt-1">
                {errors.district.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("upazila")}
            </label>
            <select
              {...register("upazila")}
              disabled={!selectedDistrict}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-slate-100"
            >
              <option value="">{t("select_upazila")}</option>
              {availableUpazilas.map((u) => (
                <option key={u.id} value={u.id}>
                  {locale === "bn" ? u.name_bn : u.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("website")}
            </label>
            <input
              {...register("website")}
              type="url"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="https://example.com"
            />
            {errors.website && (
              <p className="text-red-500 text-xs mt-1">
                {errors.website.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("address")} *
            </label>
            <textarea
              {...register("address")}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-500 outline-none resize-none"
              placeholder={t("address_placeholder")}
            />
            {errors.address && (
              <p className="text-red-500 text-xs mt-1">
                {errors.address.message}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {t("complete_profile")}
        </button>
      </form>
    </div>
  );
}
