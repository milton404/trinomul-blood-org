"use client";

import NidVerificationSection from "@/components/donors/NidVerificationSection";
import DonorQrCard from "@/components/donors/DonorQrCard";
import MyRequests from "@/components/requests/MyRequests";

import { BloodDropLoading } from "@/components/ui/BloodDropLoading";
import ImageAdjustPreview from "@/components/ui/ImageAdjustPreview";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  serverGetProfileByUserId,
  serverUpdateProfile,
  serverCreateDonation,
  serverGetDonationsByDonorId,
  serverGetDonorAdvice,
  serverGetRequestsForDonor,
  serverGetSavedPatients,
  serverCreateSavedPatient,
  serverDeleteSavedPatient,
  serverGetProfilesByRole,
  serverGetTopDonors,
  serverGetMyRequests,
  serverGetRequestsByHospital,
  serverGetDonationsByHospital,
  serverGetHospitalStats,
} from "@/lib/db-actions";
import { Link } from "@/i18n/routing";
import { useAuthStore } from "@/store/authStore";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  Loader2,
  Save,
  User,
  Phone,
  MapPin,
  Droplets,

  Building2,
  Heart,
  Calendar,
  Clock,
  CheckCircle,
  X,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Pencil,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  Trophy,
  BellRing,
  HeartPulse,
  Plus,
  ScanLine,
} from "lucide-react";
import {
  RANGPUR_DISTRICTS,
  getUpazilasByDistrict,
  getUnionsByUpazila,
} from "@/lib/constants/rangpur";
import dynamic from "next/dynamic";

const DonorEligibilityChecker = dynamic(
  () => import("@/components/donors/DonorEligibilityChecker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
    ),
  },
);

const DonorQrScanner = dynamic(
  () => import("@/components/donors/DonorQrScanner"),
  { ssr: false },
);


const donorSchema = z.object({
  fullNameBn: z.string().min(2, "Name is required"),
  fullNameEn: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  bloodGroup: z.string().min(1, "Blood group is required"),
  sex: z.string().optional(),
  district: z.string().optional(),
  upazila: z.string().optional(),
  union: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  weight: z.string().optional(),
  hbLevel: z.string().optional(),
  lastHbTestDate: z.string().optional(),
  occupation: z.string().optional(),
  lastDonationDate: z.string().optional(),
  lastDonationType: z.string().optional(),
  alternativePhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  preferredContact: z.string().optional(),
  hasChronicDisease: z.boolean().optional(),
  diseaseDetails: z.string().optional(),
  isActive: z.boolean(),
});

const patientSchema = z.object({
  fullNameBn: z.string().min(2, "Name is required"),
  fullNameEn: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  bloodGroup: z.string().min(1, "Blood group is required"),
  district: z.string().min(1, "District is required"),
  upazila: z.string().optional(),
  union: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  alternativePhone: z.string().optional(),
});

const hospitalSchema = z.object({
  hospitalNameBn: z.string().min(2, "Hospital name is required"),
  hospitalNameEn: z.string().min(2, "Hospital name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  district: z.string().min(1, "District is required"),
  upazila: z.string().optional(),
  union: z.string().optional(),
  address: z.string().min(5, "Address is required"),
  licenseNumber: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

const adminSchema = z.object({
  fullNameBn: z.string().min(2, "Name is required"),
  fullNameEn: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required"),
});

type DonorFormValues = z.infer<typeof donorSchema>;
type PatientFormValues = z.infer<typeof patientSchema>;
type HospitalFormValues = z.infer<typeof hospitalSchema>;
type AdminFormValues = z.infer<typeof adminSchema>;

export default function ProfileForm() {
  const { user, role } = useAuthStore();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tAi = useTranslations("ai_assistant");
  const locale = useLocale();
  const isBn = locale === "bn";

  const adviceAutoLoadedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedUpazila, setSelectedUpazila] = useState("");
  const [donationHistory, setDonationHistory] = useState<any[]>([]);
  const [showRecordDonation, setShowRecordDonation] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [activeDonorTab, setActiveDonorTab] = useState<"overview" | "donations" | "requests" | "profile" | "verification">("overview");
  const [activePatientTab, setActivePatientTab] = useState<"overview" | "requests" | "profile" | "saved">("overview");
  const [activeHospitalTab, setActiveHospitalTab] = useState<"overview" | "requests" | "donations" | "profile">("overview");
  const [patientRequests, setPatientRequests] = useState<any[]>([]);

  const [hospitalRequests, setHospitalRequests] = useState<any[]>([]);
  const [hospitalDonations, setHospitalDonations] = useState<any[]>([]);
  const [hospitalStats, setHospitalStats] = useState<any>(null);
  const [isEditingHospital, setIsEditingHospital] = useState(false);
  const [recordingDonation, setRecordingDonation] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [recordForm, setRecordForm] = useState({
    donationDate: new Date().toISOString().split("T")[0],
    donationType: "whole_blood",
    hospitalName: "",
    units: "1",
  });
  const [advice, setAdvice] = useState<
    Awaited<ReturnType<typeof serverGetDonorAdvice>> | null
  >(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [savedPatients, setSavedPatients] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  // Meta used for the "Not Tested Yet" Hb reminder banner on the dashboard.
  const [currentProfile, setCurrentProfile] = useState<{
    role?: string;
    hb_level?: number | null;
  } | null>(null);
  const [newPatient, setNewPatient] = useState({
    name: "",
    age: "",
    bloodGroup: "",
    relation: "",
    conditionNote: "",
  });

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const donorForm = useForm<DonorFormValues>({
    resolver: zodResolver(donorSchema),
    defaultValues: { isActive: true },
  });

  const patientForm = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
  });

  const hospitalForm = useForm<HospitalFormValues>({
    resolver: zodResolver(hospitalSchema),
  });

  const adminForm = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
  });

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const watchedBloodGroup = donorForm.watch("bloodGroup");

  const fetchAdvice = async () => {
    const values = donorForm.getValues();
    if (!values.bloodGroup) {
      setAdvice(null);
      return;
    }
    setLoadingAdvice(true);
    try {
      const result = await serverGetDonorAdvice(
        {
          bloodGroup: values.bloodGroup,
          lastDonationDate: values.lastDonationDate,
          lastDonationType: values.lastDonationType,
          weightKg: values.weight ? parseFloat(values.weight) : undefined,
          district: values.district,
          dateOfBirth: values.dateOfBirth,
        },
        user ? Number(user.id) : undefined,
      );
      setAdvice(result);
    } catch (e) {
      console.error("Failed to load donor advice:", e);
      setAdvice(null);
    }
    setLoadingAdvice(false);
  };

  useEffect(() => {
    if (
      role === "donor" &&
      watchedBloodGroup &&
      !adviceAutoLoadedRef.current
    ) {
      adviceAutoLoadedRef.current = true;
      fetchAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedBloodGroup, role]);

  useEffect(() => {
    if (
      role === "donor" &&
      activeDonorTab === "overview" &&
      watchedBloodGroup &&
      adviceAutoLoadedRef.current
    ) {
      fetchAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDonorTab, role]);

  const fetchProfile = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const profile = (await serverGetProfileByUserId(Number(user.id))) as any;

      if (!profile) {
        setIsLoading(false);
        return;
      }

      setCurrentProfile({
        role: profile.role,
        hb_level: profile.hb_level ?? null,
      });

      if (profile.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }

      if (role === "donor") {
        donorForm.reset({
          fullNameBn: profile.full_name_bn || "",
          fullNameEn: profile.full_name_en || "",
          phone: profile.phone || "",
          bloodGroup: profile.blood_group || "",
          sex: profile.sex || "",
          district: profile.district || "",
          upazila: profile.upazila || "",
          union: profile.union_name || "",
          address: profile.address || "",
          dateOfBirth: profile.date_of_birth || "",
          weight: profile.weight_kg ? profile.weight_kg.toString() : "",
          hbLevel: profile.hb_level != null ? profile.hb_level.toString() : "",
          lastHbTestDate: profile.last_hb_test_date || "",
          occupation: profile.occupation || "",
          lastDonationDate: profile.last_donation_date || "",
          lastDonationType: profile.last_donation_type || "whole_blood",
          alternativePhone: profile.alternative_phone || "",
          whatsappNumber: profile.whatsapp_number || "",
          preferredContact: profile.preferred_contact || "call",
          hasChronicDisease: profile.has_chronic_disease === 1,
          diseaseDetails: profile.disease_details || "",
          isActive: profile.is_active ?? true,
        });
        setSelectedDistrict(profile.district || "");
        setSelectedUpazila(profile.upazila || "");
      } else if (role === "patient") {
        patientForm.reset({
          fullNameBn: profile.full_name_bn || "",
          fullNameEn: profile.full_name_en || "",
          phone: profile.phone || "",
          bloodGroup: profile.blood_group || "",
          district: profile.district || "",
          upazila: profile.upazila || "",
          union: profile.union_name || "",
          address: profile.address || "",
          dateOfBirth: profile.date_of_birth || "",
          alternativePhone: profile.alternative_phone || "",
        });
        setSelectedDistrict(profile.district || "");
        setSelectedUpazila(profile.upazila || "");
      } else if (role === "hospital") {
        hospitalForm.reset({
          hospitalNameBn: profile.hospital_name_bn || "",
          hospitalNameEn: profile.hospital_name_en || "",
          phone: profile.phone || "",
          district: profile.district || "",
          upazila: profile.upazila || "",
          union: profile.union_name || "",
          address: profile.address || "",
          licenseNumber: profile.license_number || "",
          website: profile.website || "",
        });
        setSelectedDistrict(profile.district || "");
        setSelectedUpazila(profile.upazila || "");
      } else if (role === "admin" || role === "super_admin") {
        adminForm.reset({
          fullNameBn: profile.full_name_bn || "",
          fullNameEn: profile.full_name_en || "",
          phone: profile.phone || "",
          email: profile.email || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }

    setIsLoading(false);

    if (role === "donor" && user) {
      try {
        const history = await serverGetDonationsByDonorId(Number(user.id), Date.now());
        setDonationHistory((history as any[]) || []);
      } catch (e) {}
      try {
        const matched = await serverGetRequestsForDonor(Number(user.id));
        setNearbyRequests((matched as any[]) || []);
      } catch (e) {}
      try {
        const top = await serverGetTopDonors(5);
        setTopDonors((top as any[]) || []);
      } catch (e) {}
    }

    if (role === "patient" && user) {
      try {
        const saved = await serverGetSavedPatients(Number(user.id));
        setSavedPatients((saved as any[]) || []);
      } catch (e) {}
      try {
        const hs = (await serverGetProfilesByRole("hospital")) as any[];
        const active = (hs || []).filter((h: any) => h.is_active !== 0);
        const myDistrict = (
          patientForm.getValues().district || ""
        ).toLowerCase();
        active.sort((a: any, b: any) => {
          const aSame = (a.district || "").toLowerCase() === myDistrict ? 0 : 1;
          const bSame = (b.district || "").toLowerCase() === myDistrict ? 0 : 1;
          return aSame - bSame;
        });
        setHospitals(active.slice(0, 6));
      } catch (e) {}
      try {
        const reqs = await serverGetMyRequests(Number(user.id));
        setPatientRequests((reqs as any[]) || []);
      } catch (e) {}
    }

    if (role === "hospital" && user) {
      const hnEn = hospitalForm.getValues().hospitalNameEn;
      const hnBn = hospitalForm.getValues().hospitalNameBn;
      if (hnEn) {
        try { const reqs = await serverGetRequestsByHospital(hnEn, hnBn || undefined); setHospitalRequests((reqs as any[]) || []); } catch (e) {}
        try { const dons = await serverGetDonationsByHospital(hnEn, hnBn || undefined); setHospitalDonations((dons as any[]) || []); } catch (e) {}
        try { const stats = await serverGetHospitalStats(hnEn, hnBn || undefined); setHospitalStats(stats); } catch (e) {}
      }
    }
  };

  const handleAddSavedPatient = async () => {
    if (!user || newPatient.name.trim().length < 2) return;
    setSavingPatient(true);
    try {
      await serverCreateSavedPatient({
        ownerId: Number(user.id),
        name: newPatient.name,
        age: newPatient.age ? Number(newPatient.age) : null,
        bloodGroup: newPatient.bloodGroup || null,
        relation: newPatient.relation || null,
        conditionNote: newPatient.conditionNote || null,
      });
      const saved = await serverGetSavedPatients(Number(user.id));
      setSavedPatients((saved as any[]) || []);
      setNewPatient({ name: "", age: "", bloodGroup: "", relation: "", conditionNote: "" });
      setShowAddPatient(false);
      toast.success(isBn ? "রোগীর প্রোফাইল সংরক্ষিত হয়েছে" : "Patient profile saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
    setSavingPatient(false);
  };

  const handleDeleteSavedPatient = async (id: number) => {
    if (!user) return;
    try {
      await serverDeleteSavedPatient(id, Number(user.id));
      setSavedPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const handleRecordDonation = async () => {
    if (!user || !recordForm.donationDate) return;
    setRecordingDonation(true);
    try {
      await serverCreateDonation({
        donorId: Number(user.id),
        requestId: null,
        bloodGroup: donorForm.getValues().bloodGroup,
        units: parseInt(recordForm.units) || 1,
        hospitalName: recordForm.hospitalName,
        donationDate: recordForm.donationDate,
        donationType: recordForm.donationType,
        recipientType: "Patient",
      });
      toast.success(
        t("donation_saved") ||
          "Donation recorded! Your eligibility has been updated.",
      );
      setShowRecordDonation(false);
      const newDonation = {
        id: `new-${Date.now()}`,
        donor_id: Number(user.id),
        blood_group: donorForm.getValues().bloodGroup,
        units: parseInt(recordForm.units) || 1,
        hospital_name: recordForm.hospitalName,
        donation_date: recordForm.donationDate,
        donation_type: recordForm.donationType,
        recipient_type: "Patient",
      };
      setDonationHistory((prev) => [newDonation, ...prev]);
      await fetchProfile();
      setDonationHistory((prev) => {
        const exists = prev.some(
          (d: any) =>
            d.donation_date === newDonation.donation_date &&
            d.donation_type === newDonation.donation_type,
        );
        return exists ? prev : [newDonation, ...prev];
      });
      // Refresh advice so eligibility status reflects the new donation
      await fetchAdvice();
      setActiveDonorTab("overview");
      setRecordForm({
        donationDate: new Date().toISOString().split("T")[0],
        donationType: "whole_blood",
        hospitalName: "",
        units: "1",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to record donation");
    }
    setRecordingDonation(false);
  };


  const handleAvatarFileChange = async (file: File | null) => {
    if (!file || !user) return;
    try {
      setUploading(true);
      const result = await uploadImageToCloudinary(file, (progress) => {
        setUploading(progress < 100);
      }, "avatar");
      await serverUpdateProfile(Number(user.id), { avatar_url: result.url });
      setAvatarUrl(result.url);
      setAvatarFile(null);
      toast.success(t("avatar_updated"));
    } catch (error) {
      toast.error(t("upload_failed"));
    } finally {
      setUploading(false);
    }
  };

  const onDonorSubmit = async (values: DonorFormValues) => {
    if (!user) return;
    setIsSaving(true);

    try {
      await serverUpdateProfile(Number(user.id), {
        full_name_bn: values.fullNameBn,
        full_name_en: values.fullNameEn,
        phone: values.phone,
        blood_group: values.bloodGroup,
        sex: values.sex,
        district: values.district,
        upazila: values.upazila,
        union_name: values.union || null,
        address: values.address,
        date_of_birth: values.dateOfBirth,
        weight_kg: values.weight ? parseFloat(values.weight) : null,
        hb_level: values.hbLevel ? parseFloat(values.hbLevel) : null,
        last_hb_test_date: values.lastHbTestDate || null,
        occupation: values.occupation,
        last_donation_date: values.lastDonationDate || null,
        last_donation_type: values.lastDonationType || null,
        alternative_phone: values.alternativePhone,
        whatsapp_number: values.whatsappNumber,
        preferred_contact: values.preferredContact,
        has_chronic_disease: values.hasChronicDisease ? 1 : 0,
        disease_details: values.diseaseDetails,
        is_active: values.isActive ? 1 : 0,
      });
      toast.success(t("profile_updated"));
      setIsEditingProfile(false);
      // Refresh advice since weight, DOB, blood group, etc. may have changed
      await fetchAdvice();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }

    setIsSaving(false);
  };

  const onPatientSubmit = async (values: PatientFormValues) => {
    if (!user) return;
    setIsSaving(true);

    try {
      await serverUpdateProfile(Number(user.id), {
        full_name_bn: values.fullNameBn,
        full_name_en: values.fullNameEn,
        phone: values.phone,
        blood_group: values.bloodGroup,
        district: values.district,
        upazila: values.upazila,
        union_name: values.union || null,
        address: values.address,
        date_of_birth: values.dateOfBirth,
        alternative_phone: values.alternativePhone || null,
      });
      toast.success(t("profile_updated"));
      setIsEditingProfile(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }

    setIsSaving(false);
  };

  const onHospitalSubmit = async (values: HospitalFormValues) => {
    if (!user) return;
    setIsSaving(true);

    try {
      await serverUpdateProfile(Number(user.id), {
        hospital_name_bn: values.hospitalNameBn,
        hospital_name_en: values.hospitalNameEn,
        phone: values.phone,
        district: values.district,
        upazila: values.upazila,
        union_name: values.union || null,
        address: values.address,
        license_number: values.licenseNumber,
        website: values.website || null,
      });
      toast.success(t("profile_updated"));
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }

    setIsSaving(false);
  };

  const onAdminSubmit = async (values: AdminFormValues) => {
    if (!user) return;
    setIsSaving(true);

    try {
      await serverUpdateProfile(Number(user.id), {
        full_name_bn: values.fullNameBn,
        full_name_en: values.fullNameEn,
        phone: values.phone,
        email: values.email,
      });
      toast.success(t("profile_updated"));
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <BloodDropLoading label={isBn ? "লোড হচ্ছে" : "Loading"} size={80} />
      </div>
    );
  }

  const availableUpazilas = selectedDistrict
    ? getUpazilasByDistrict(selectedDistrict)
    : [];

  const availableUnions = selectedUpazila
    ? getUnionsByUpazila(selectedUpazila)
    : [];

  const renderAvatar = () => (
    <div className="flex flex-col items-center mb-8">
      {uploading && (
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}
      <ImageAdjustPreview
        file={avatarFile}
        onFileChange={handleAvatarFileChange}
        initialUrl={avatarUrl}
        shape="circle"
        labels={{
          clickToUpload: t("click_to_upload"),
          changePhoto: t("image_change"),
          dragHint: t("image_drag"),
          removePhoto: t("image_remove"),
          zoomIn: t("image_zoom_in"),
          zoomOut: t("image_zoom_out"),
          rotate90: t("image_rotate"),
          moveUp: t("image_up"),
          moveLeft: t("image_left"),
          moveRight: t("image_right"),
          moveDown: t("image_down"),
          resetPosition: t("image_reset"),
        }}
      />
    </div>
  );

  const renderDonorForm = () => (
    <form
      onSubmit={donorForm.handleSubmit(onDonorSubmit)}
      className="space-y-6"
    >
      {renderAvatar()}

      {currentProfile?.role === "donor" &&
        currentProfile.hb_level == null && (
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800 text-sm">
                {t("hb_reminder_title") || "Hb Test Reminder"}
              </p>
              <p className="text-sm text-yellow-700 mt-0.5">
                {t("hb_reminder_body") ||
                  "Please get your hemoglobin level tested before your next donation, then update it in your profile."}
              </p>
            </div>
          </div>
        )}

      <div className="border-b border-slate-200 pb-4 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <User className="w-5 h-5 text-red-600" />
          {t("personal_info") || "Personal Information"}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("full_name_bn")} *
          </label>
          <input
            {...donorForm.register("fullNameBn")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="রহিম উদ্দিন"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("full_name_en")} *
          </label>
          <input
            {...donorForm.register("fullNameEn")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="Rahim Uddin"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {tCommon("phone")} *
          </label>
          <input
            {...donorForm.register("phone")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="017XXXXXXXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("blood_group")} *
          </label>
          <select
            {...donorForm.register("bloodGroup")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="">{t("select_blood_group")}</option>
            {bloodGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("sex") || "Gender"}
          </label>
          <select
            {...donorForm.register("sex")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="">{t("select_sex") || "Select Gender"}</option>
            <option value="male">{t("male") || "Male"}</option>
            <option value="female">{t("female") || "Female"}</option>
            <option value="other">{t("other") || "Other"}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("date_of_birth")}
          </label>
          <input
            {...donorForm.register("dateOfBirth")}
            type="date"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("occupation") || "Occupation"}
          </label>
          <input
            {...donorForm.register("occupation")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder={
              t("occupation_placeholder") || "e.g., Student, Teacher, Business"
            }
          />
        </div>
      </div>

      <div className="border-b border-slate-200 pb-4 mb-6 mt-8">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-600" />
          {t("health_info") || "Health Information"}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("weight_kg") || "Weight (kg)"}
          </label>
          <input
            {...donorForm.register("weight")}
            type="number"
            step="0.1"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="65"
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("weight_hint") || "Minimum 50 kg required for blood donation"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("hb_level") || "Hemoglobin Level (g/dL)"}
          </label>
          <input
            {...donorForm.register("hbLevel")}
            type="number"
            step="0.1"
            min="0"
            max="25"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="e.g. 13.5"
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("hb_hint") ||
              "Optional — below 12.5 (female) or 13.0 (male) temporarily defers you"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("last_hb_test_date") || "Last Hb Test Date"}
          </label>
          <input
            {...donorForm.register("lastHbTestDate")}
            type="date"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("last_donation_date") || "Last Donation Date"}
          </label>
          <input
            {...donorForm.register("lastDonationDate")}
            type="date"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("last_donation_hint") || "Leave empty if never donated"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("last_donation_type") || "Last Donation Type"}
          </label>
          <select
            {...donorForm.register("lastDonationType")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="whole_blood">
              {t("type_whole_blood") || "Whole Blood (3 months)"}
            </option>
            <option value="platelets">
              {t("type_platelets") || "Platelets (2 weeks)"}
            </option>
            <option value="plasma">
              {t("type_plasma") || "Plasma (1 month)"}
            </option>
          </select>
        </div>

        {(() => {
          const lastDonation = donorForm.watch("lastDonationDate");
          const donationType = donorForm.watch("lastDonationType");
          if (!lastDonation || !donationType) return null;
          const lastDate = new Date(lastDonation);
          const now = new Date();
          const diffDays = Math.floor(
            (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          const types = [
            {
              key: "whole_blood",
              cooldown: 90,
              icon: "🩸",
              label_en: "Whole Blood",
              label_bn: "সম্পূর্ণ রক্ত",
            },
            {
              key: "platelets",
              cooldown: 14,
              icon: "🔴",
              label_en: "Platelets",
              label_bn: "প্লাটিলেট",
            },
            {
              key: "plasma",
              cooldown: 30,
              icon: "💉",
              label_en: "Plasma",
              label_bn: "প্লাজমা",
            },
          ];
          return (
            <div className="md:col-span-2 space-y-2">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                {t("eligibility_status") || "Donation Eligibility Status"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {types.map((type) => {
                  const isEligible = diffDays >= type.cooldown;
                  const eligibleDate = new Date(
                    lastDate.getTime() + type.cooldown * 24 * 60 * 60 * 1000,
                  );
                  const remaining = type.cooldown - diffDays;
                  return (
                    <div
                      key={type.key}
                      className={`p-3 rounded-xl border flex items-center gap-2 ${
                        isEligible
                          ? "bg-green-50 border-green-200"
                          : "bg-amber-50 border-amber-200"
                      }`}
                    >
                      <span className="text-lg">{type.icon}</span>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold ${
                            isEligible ? "text-green-800" : "text-amber-800"
                          }`}
                        >
                          {isEligible
                            ? t("ready_to_donate") || "✓ Ready"
                            : t("cooling_down") || "⏳ Cooling down"}
                        </p>
                        <p
                          className={`text-[10px] truncate ${
                            isEligible ? "text-green-600" : "text-amber-600"
                          }`}
                        >
                          {locale === "bn" ? type.label_bn : type.label_en}
                          {isEligible
                            ? ` (${diffDays}d)`
                            : ` → ${eligibleDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })} (${remaining} ${t("days_until_ready") || "d left"})`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className="md:col-span-2 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              {...donorForm.register("hasChronicDisease")}
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-slate-700">
              {t("has_chronic_disease") ||
                "I have a chronic disease/medical condition"}
            </span>
          </label>

          {donorForm.watch("hasChronicDisease") && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("disease_details") || "Please specify your condition"}
              </label>
              <textarea
                {...donorForm.register("diseaseDetails")}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                placeholder={
                  t("disease_details_placeholder") ||
                  "e.g., Diabetes, High Blood Pressure, Heart Disease, etc."
                }
              />
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 pb-4 mb-6 mt-8">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Phone className="w-5 h-5 text-red-600" />
          {t("contact_info") || "Contact Information"}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("alternative_phone") || "Alternative Phone"}
          </label>
          <input
            {...donorForm.register("alternativePhone")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="018XXXXXXXX"
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("alternative_phone_hint") || "Emergency contact number"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("whatsapp_number") || "WhatsApp Number"}
          </label>
          <input
            {...donorForm.register("whatsappNumber")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="017XXXXXXXX"
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("whatsapp_number_hint") ||
              "Leave blank to use main phone number"}
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("preferred_contact") || "Preferred Contact Method"}
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...donorForm.register("preferredContact")}
                type="radio"
                value="call"
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-slate-700">
                {t("pref_call") || "Phone Call"}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...donorForm.register("preferredContact")}
                type="radio"
                value="whatsapp"
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-slate-700">
                {t("pref_whatsapp") || "WhatsApp"}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                {...donorForm.register("preferredContact")}
                type="radio"
                value="either"
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-slate-700">
                {t("pref_either") || "Either is fine"}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 pb-4 mb-6 mt-8">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-600" />
          {t("location_info") || "Location"}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("district")}
          </label>
          <select
            {...donorForm.register("district")}
            onChange={(e) => {
              donorForm.setValue("district", e.target.value);
              setSelectedDistrict(e.target.value);
              donorForm.setValue("upazila", "");
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="">{t("select_district")}</option>
            {RANGPUR_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {locale === "bn" ? d.name_bn : d.name_en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("upazila")}
          </label>
          <select
            {...donorForm.register("upazila")}
            onChange={(e) => { donorForm.setValue("upazila", e.target.value); setSelectedUpazila(e.target.value); donorForm.setValue("union", ""); }}
            disabled={!selectedDistrict}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white disabled:bg-slate-100"
          >
            <option value="">{t("select_upazila")}</option>
            {availableUpazilas.map((u) => (
              <option key={u.id} value={u.id}>
                {locale === "bn" ? u.name_bn : u.name_en}
              </option>
            ))}
          </select>
        </div>

        {availableUnions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("union")}
            </label>
            <select
              {...donorForm.register("union")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
            >
              <option value="">{t("select_union")}</option>
              {availableUnions.map((u) => (
                <option key={u.id} value={u.id}>
                  {locale === "bn" ? u.name_bn : u.name_en}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("address")}
          </label>
          <textarea
            {...donorForm.register("address")}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            placeholder={t("address_placeholder")}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
        <input
          {...donorForm.register("isActive")}
          type="checkbox"
          id="isActive"
          className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
        />
        <label
          htmlFor="isActive"
          className="text-sm font-medium text-slate-700 flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-green-600" />
          {t("available_for_donation")}
        </label>
      </div>

      {(() => {
        const isActive = donorForm.watch("isActive");
        const lastDate = donorForm.watch("lastDonationDate");
        if (!isActive || !lastDate) return null;
        const now = new Date();
        const diffDays = Math.floor(
          (now.getTime() - new Date(lastDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const minCooldown = 14;
        if (diffDays >= minCooldown) return null;
        const daysLeft = minCooldown - diffDays;
        return (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-800">
                {t("available_warning") || "⚠️ You're in cooling down period!"}
              </p>
              <p className="text-[10px] text-red-600 mt-0.5">
                {t("warning_detail") ||
                  "Your profile will be hidden from all searches until you become eligible for at least one donation type"}{" "}
                (in {daysLeft} {t("days_until_ready") || "days"}).
              </p>
            </div>
          </div>
        );
      })()}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
      >
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Save className="w-5 h-5" />
        )}
        {t("save_profile")}
      </button>
    </form>
  );

  const renderAdminForm = () => (
    <form
      onSubmit={adminForm.handleSubmit(onAdminSubmit)}
      className="space-y-6"
    >
      {renderAvatar()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("full_name_bn")}
          </label>
          <input
            {...adminForm.register("fullNameBn")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="রহিম উদ্দিন"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("full_name_en")}
          </label>
          <input
            {...adminForm.register("fullNameEn")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="Rahim Uddin"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("email")}
          </label>
          <input
            {...adminForm.register("email")}
            type="email"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="admin@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {tCommon("phone")}
          </label>
          <input
            {...adminForm.register("phone")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="017XXXXXXXX"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
      >
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Save className="w-5 h-5" />
        )}
        {t("save_profile")}
      </button>
    </form>
  );

  const renderPatientForm = () => (
    <form
      onSubmit={patientForm.handleSubmit(onPatientSubmit)}
      className="space-y-6"
    >
      {renderAvatar()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("full_name_bn")}
          </label>
          <input
            {...patientForm.register("fullNameBn")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="রহিম উদ্দিন"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("full_name_en")}
          </label>
          <input
            {...patientForm.register("fullNameEn")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="Rahim Uddin"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {tCommon("phone")}
          </label>
          <input
            {...patientForm.register("phone")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="017XXXXXXXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("emergency_contact") || "Emergency Contact"}
          </label>
          <input
            {...patientForm.register("alternativePhone")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="018XXXXXXXX"
          />
          <p className="text-xs text-slate-400 mt-1">
            {t("emergency_contact_hint") ||
              "Secondary contact person for critical situations"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("blood_group")}
          </label>
          <select
            {...patientForm.register("bloodGroup")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="">{t("select_blood_group")}</option>
            {bloodGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("date_of_birth")}
          </label>
          <input
            {...patientForm.register("dateOfBirth")}
            type="date"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("district")}
          </label>
          <select
            {...patientForm.register("district")}
            onChange={(e) => {
              patientForm.setValue("district", e.target.value);
              setSelectedDistrict(e.target.value);
              patientForm.setValue("upazila", "");
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="">{t("select_district")}</option>
            {RANGPUR_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {locale === "bn" ? d.name_bn : d.name_en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("upazila")}
          </label>
          <select
            {...patientForm.register("upazila")}
            onChange={(e) => { patientForm.setValue("upazila", e.target.value); setSelectedUpazila(e.target.value); patientForm.setValue("union", ""); }}
            disabled={!selectedDistrict}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white disabled:bg-slate-100"
          >
            <option value="">{t("select_upazila")}</option>
            {availableUpazilas.map((u) => (
              <option key={u.id} value={u.id}>
                {locale === "bn" ? u.name_bn : u.name_en}
              </option>
            ))}
          </select>
        </div>

        {availableUnions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("union")}
            </label>
            <select
              {...patientForm.register("union")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
            >
              <option value="">{t("select_union")}</option>
              {availableUnions.map((u) => (
                <option key={u.id} value={u.id}>
                  {locale === "bn" ? u.name_bn : u.name_en}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("address")}
          </label>
          <textarea
            {...patientForm.register("address")}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            placeholder={t("address_placeholder")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
      >
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Save className="w-5 h-5" />
        )}
        {t("save_profile")}
      </button>
    </form>
  );

  const renderHospitalOverview = () => {
    const v = hospitalForm.getValues();
    const districtObj = RANGPUR_DISTRICTS.find((d) => d.id === v.district);
    const upazilaObj = availableUpazilas.find((u) => u.id === v.upazila);
    const stats = hospitalStats || { totalRequests: 0, activeRequests: 0, fulfilledRequests: 0, totalDonations: 0, totalUnits: 0 };

    return (
      <div className="space-y-5 animate-[fadeSlideIn_0.2s_ease-out]">
        {/* Hospital info card */}
        <div className="rounded-2xl border border-teal-200 overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900 truncate">
                  {isBn ? v.hospitalNameBn || v.hospitalNameEn : v.hospitalNameEn || v.hospitalNameBn}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {[
                    districtObj ? (isBn ? districtObj.name_bn : districtObj.name_en) : v.district,
                    upazilaObj ? (isBn ? upazilaObj.name_bn : upazilaObj.name_en) : v.upazila,
                  ].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 bg-white grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-600" />
              <span className="text-slate-700 truncate">{v.phone || "-"}</span>
            </div>
            {v.website && (
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="text-slate-700 truncate">{v.website}</span>
              </div>
            )}
            {v.licenseNumber && (
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span className="text-slate-700 truncate">{v.licenseNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                {isBn ? "মোট রিকোয়েস্ট" : "Total Requests"}
              </span>
            </div>
            <p className="text-2xl font-black text-blue-900">{stats.totalRequests}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                {isBn ? "সক্রিয়" : "Active"}
              </span>
            </div>
            <p className="text-2xl font-black text-amber-900">{stats.activeRequests}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">
                {isBn ? "পূরণ হয়েছে" : "Fulfilled"}
              </span>
            </div>
            <p className="text-2xl font-black text-green-900">{stats.fulfilledRequests}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                {isBn ? "ইউনিট" : "Units Collected"}
              </span>
            </div>
            <p className="text-2xl font-black text-red-900">{stats.totalUnits}</p>
          </div>
        </div>

        {/* Quick action */}
        <Link
          href="/request"
          className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-bold hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-200 active:scale-[0.99]"
        >
          <HeartPulse className="w-5 h-5" />
          {isBn ? "🆘 এখনই রক্তের রিকোয়েস্ট করুন" : "🆘 Request Blood Now"}
        </Link>

        {/* Recent requests preview */}
        {hospitalRequests.length > 0 && (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" />
                {isBn ? "সাম্প্রতিক রিকোয়েস্ট" : "Recent Requests"}
              </h3>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {hospitalRequests.slice(0, 3).map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-3.5">
                  <div className={`shrink-0 w-2 h-2 rounded-full ${
                    r.status === "fulfilled" ? "bg-green-500" :
                    r.status === "active" ? "bg-amber-500" : "bg-slate-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm truncate">{r.patient_name || "-"}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {r.blood_group} · {r.units_needed || 1} {isBn ? "ইউনিট" : "unit(s)"}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.urgency_level === "critical" ? "bg-red-100 text-red-700" :
                    r.urgency_level === "urgent" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {r.urgency_level === "critical" ? (isBn ? "জরুরি" : "Critical") :
                     r.urgency_level === "urgent" ? (isBn ? "গুরুত্বপূর্ণ" : "Urgent") :
                     isBn ? "স্বাভাবিক" : "Normal"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHospitalView = () => {
    const v = hospitalForm.getValues();
    const districtObj = RANGPUR_DISTRICTS.find((d) => d.id === v.district);
    const upazilaObj = availableUpazilas.find((u) => u.id === v.upazila);
    const fields: { label: string; value: ReactNode }[] = [
      { label: t("hospital_name_bn") || "Name (BN)", value: v.hospitalNameBn || "-" },
      { label: t("hospital_name_en") || "Name (EN)", value: v.hospitalNameEn || "-" },
      { label: tCommon("phone") || "Phone", value: v.phone || "-" },
      { label: t("license_number") || "License", value: v.licenseNumber || "-" },
      { label: t("website") || "Website", value: v.website || "-" },
      {
        label: t("district") || "District",
        value: districtObj ? (isBn ? districtObj.name_bn : districtObj.name_en) : v.district || "-",
      },
      {
        label: t("upazila") || "Upazila",
        value: upazilaObj ? (isBn ? upazilaObj.name_bn : upazilaObj.name_en) : v.upazila || "-",
      },
      { label: t("address") || "Address", value: v.address || "-" },
    ];
    return (
      <div className="space-y-4">
        {renderAvatar()}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.label} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">{f.label}</p>
              <p className="font-semibold text-slate-900">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHospitalRequests = () => (
    <div className="animate-[fadeSlideIn_0.2s_ease-out]">
      {hospitalRequests.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Droplets className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{isBn ? "এই হাসপাতালের জন্য কোনো রিকোয়েস্ট নেই" : "No requests linked to this hospital yet"}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-teal-600" />
              {isBn ? `রিকোয়েস্ট (${hospitalRequests.length})` : `Requests (${hospitalRequests.length})`}
            </h3>
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            {hospitalRequests.map((r: any) => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm truncate">{r.patient_name || "-"}</p>
                    <p className="text-[11px] text-slate-500">
                      {r.blood_group} · {r.units_needed || 1} {isBn ? "ইউনিট" : "unit(s)"} · {r.contact_number || "-"}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.status === "fulfilled" ? "bg-green-100 text-green-700" :
                    r.status === "active" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {r.status === "fulfilled" ? (isBn ? "পূরণ" : "Fulfilled") :
                     r.status === "active" ? (isBn ? "সক্রিয়" : "Active") : r.status || "-"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString(isBn ? "bn-BD" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                  {r.tracking_code ? ` · ${r.tracking_code}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderHospitalDonations = () => (
    <div className="animate-[fadeSlideIn_0.2s_ease-out]">
      {hospitalDonations.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Heart className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{isBn ? "এই হাসপাতালে কোনো রক্তদান নেই" : "No donations recorded at this hospital yet"}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              {isBn ? `রক্তদান লেজার (${hospitalDonations.length})` : `Donation Ledger (${hospitalDonations.length})`}
            </h3>
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            {hospitalDonations.map((d: any) => (
              <div key={d.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm truncate">{d.donor_name || (isBn ? "অজানা দাতা" : "Unknown donor")}</p>
                    <p className="text-[11px] text-slate-500">
                      {d.blood_group} · {d.units || 1} {isBn ? "ইউনিট" : "unit(s)"}
                      {d.donor_phone ? ` · ${d.donor_phone}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                    {d.donation_type || "whole_blood"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {d.donation_date ? new Date(d.donation_date).toLocaleDateString(isBn ? "bn-BD" : "en-US", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderHospitalForm = () => (
    <form
      onSubmit={hospitalForm.handleSubmit(onHospitalSubmit)}
      className="space-y-6"
    >
      {renderAvatar()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("hospital_name_bn")}
          </label>
          <input
            {...hospitalForm.register("hospitalNameBn")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="রংপুর মেডিকেল কলেজ হাসপাতাল"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("hospital_name_en")}
          </label>
          <input
            {...hospitalForm.register("hospitalNameEn")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="Rangpur Medical College Hospital"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {tCommon("phone")}
          </label>
          <input
            {...hospitalForm.register("phone")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="017XXXXXXXX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("license_number")}
          </label>
          <input
            {...hospitalForm.register("licenseNumber")}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="H-12345"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("district")}
          </label>
          <select
            {...hospitalForm.register("district")}
            onChange={(e) => {
              hospitalForm.setValue("district", e.target.value);
              setSelectedDistrict(e.target.value);
              hospitalForm.setValue("upazila", "");
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            <option value="">{t("select_district")}</option>
            {RANGPUR_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {locale === "bn" ? d.name_bn : d.name_en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("upazila")}
          </label>
          <select
            {...hospitalForm.register("upazila")}
            onChange={(e) => { hospitalForm.setValue("upazila", e.target.value); setSelectedUpazila(e.target.value); hospitalForm.setValue("union", ""); }}
            disabled={!selectedDistrict}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white disabled:bg-slate-100"
          >
            <option value="">{t("select_upazila")}</option>
            {availableUpazilas.map((u) => (
              <option key={u.id} value={u.id}>
                {locale === "bn" ? u.name_bn : u.name_en}
              </option>
            ))}
          </select>
        </div>

        {availableUnions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("union")}
            </label>
            <select
              {...hospitalForm.register("union")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
            >
              <option value="">{t("select_union")}</option>
              {availableUnions.map((u) => (
                <option key={u.id} value={u.id}>
                  {locale === "bn" ? u.name_bn : u.name_en}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("website")}
          </label>
          <input
            {...hospitalForm.register("website")}
            type="url"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none"
            placeholder="https://example.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("address")}
          </label>
          <textarea
            {...hospitalForm.register("address")}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            placeholder={t("address_placeholder")}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
      >
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Save className="w-5 h-5" />
        )}
        {t("save_profile")}
      </button>
    </form>
  );

  const getRoleIcon = () => {
    switch (role) {
      case "donor":
        return <Droplets className="w-8 h-8" />;
      case "patient":
        return <Heart className="w-8 h-8" />;
      case "hospital":
        return <Building2 className="w-8 h-8" />;
      case "admin":
      case "super_admin":
        return <Shield className="w-8 h-8" />;
      default:
        return <User className="w-8 h-8" />;
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case "donor":
        return t("donor_profile");
      case "patient":
        return t("patient_profile");
      case "hospital":
        return t("hospital_profile");
      case "admin":
        return t("admin_profile");
      case "super_admin":
        return t("super_admin_profile");
      default:
        return t("edit_profile");
    }
  };

  // Check if profile is incomplete
  const isProfileIncomplete = () => {
    if (role === "donor") {
      const values = donorForm.getValues();
      return !values.bloodGroup || !values.sex || !values.district;
    } else if (role === "patient") {
      const values = patientForm.getValues();
      return !values.bloodGroup || !values.district;
    } else if (role === "hospital") {
      const values = hospitalForm.getValues();
      return !values.hospitalNameEn || !values.district || !values.address;
    }
    return false;
  };

  // Returns a list of missing essential fields for the checklist banner
  const getMissingFields = (): string[] => {
    const isBn = locale === "bn";
    if (role === "donor") {
      const v = donorForm.getValues();
      const missing: string[] = [];
      if (!v.bloodGroup) missing.push(isBn ? "রক্তের গ্রুপ" : "Blood group");
      if (!v.sex) missing.push(isBn ? "লিঙ্গ" : "Gender");
      if (!v.district) missing.push(isBn ? "জেলা" : "District");
      if (!v.fullNameEn && !v.fullNameBn) missing.push(isBn ? "নাম" : "Full name");
      if (!v.phone) missing.push(isBn ? "ফোন নম্বর" : "Phone number");
      return missing;
    } else if (role === "patient") {
      const v = patientForm.getValues();
      const missing: string[] = [];
      if (!v.bloodGroup) missing.push(isBn ? "রক্তের গ্রুপ" : "Blood group");
      if (!v.district) missing.push(isBn ? "জেলা" : "District");
      return missing;
    } else if (role === "hospital") {
      const v = hospitalForm.getValues();
      const missing: string[] = [];
      if (!v.hospitalNameEn) missing.push(isBn ? "হাসপাতালের নাম" : "Hospital name");
      if (!v.district) missing.push(isBn ? "জেলা" : "District");
      if (!v.address) missing.push(isBn ? "ঠিকানা" : "Address");
      return missing;
    }
    return [];
  };

  const renderDonorAdvisor = () => {
    const bloodGroup = donorForm.watch("bloodGroup");
    if (!bloodGroup) return null;

    const weight = donorForm.watch("weight");
    const dateOfBirth = donorForm.watch("dateOfBirth");

    const donationTypes = [
      {
        key: "whole_blood",
        icon: "🩸",
        label_en: "Whole Blood",
        label_bn: "সম্পূর্ণ রক্ত",
      },
      {
        key: "platelets",
        icon: "🔴",
        label_en: "Platelets",
        label_bn: "প্লাটিলেট",
      },
      {
        key: "plasma",
        icon: "💉",
        label_en: "Plasma",
        label_bn: "প্লাজমা",
      },
    ];

    const cooldowns: Record<string, number> = {
      whole_blood: 90,
      plasma: 30,
      platelets: 14,
    };

    const now = new Date();
    const perTypeLastDate: Record<string, Date | null> = {
      whole_blood: null,
      plasma: null,
      platelets: null,
    };
    for (const h of donationHistory) {
      const type = h.donation_type || "whole_blood";
      if (!(type in perTypeLastDate)) continue;
      const d = new Date(h.donation_date);
      if (isNaN(d.getTime())) continue;
      if (!perTypeLastDate[type] || d > perTypeLastDate[type]!) {
        perTypeLastDate[type] = d;
      }
    }

    const weightNum = weight ? parseFloat(weight) : undefined;
    const underweight = weightNum !== undefined && weightNum < 50;
    let ageDisqualified = false;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      if (!isNaN(dob.getTime())) {
        const age = Math.floor(
          (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
        );
        if (age < 18 || age > 60) ageDisqualified = true;
      }
    }
    const disqualified = underweight || ageDisqualified;

    const typeEligibility: Record<
      string,
      { eligible: boolean; nextDate?: string }
    > = {};
    let nextEligibleDate: string | undefined;
    for (const [type, cooldown] of Object.entries(cooldowns)) {
      const lastDateForType = perTypeLastDate[type];
      if (!lastDateForType) {
        typeEligibility[type] = { eligible: !disqualified };
      } else {
        const daysSince = Math.floor(
          (now.getTime() - lastDateForType.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSince >= cooldown) {
          typeEligibility[type] = { eligible: !disqualified };
        } else {
          const nextDate = new Date(lastDateForType);
          nextDate.setDate(nextDate.getDate() + cooldown);
          const nextStr = nextDate.toISOString().split("T")[0];
          if (!nextEligibleDate || nextStr < nextEligibleDate) {
            nextEligibleDate = nextStr;
          }
          typeEligibility[type] = { eligible: false, nextDate: nextStr };
        }
      }
    }

    return (
      <div className="mb-6 rounded-2xl border border-red-100 shadow-lg backdrop-blur bg-white/80 overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 bg-gradient-to-r from-red-50/80 to-pink-50/80 border-b border-red-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white flex-shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 truncate">
              {t("eligibility_status")}
            </h3>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-500" />
              {tAi("eligible_now")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {donationTypes.map((type) => {
                const info = typeEligibility[type.key];
                const isEligible = info?.eligible ?? false;
                const dateToShow = isEligible
                  ? new Date()
                  : info?.nextDate
                    ? new Date(info.nextDate)
                    : null;
                return (
                  <div
                    key={type.key}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      isEligible
                        ? "bg-green-50 border-green-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <span className="text-base flex-shrink-0">
                      {type.icon}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isEligible ? "text-green-800" : "text-slate-600"
                        }`}
                      >
                        {isBn ? type.label_bn : type.label_en}
                      </p>
                      <p
                        className={`text-[10px] flex items-center gap-1 ${
                          isEligible ? "text-green-600" : "text-slate-400"
                        }`}
                      >
                        {isEligible ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            {tAi("eligible_now")}
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            {tAi("next_eligible")}
                          </>
                        )}
                      </p>
                      {dateToShow && (
                        <p
                          className={`text-[10px] mt-0.5 ${
                            isEligible ? "text-green-600" : "text-slate-500"
                          }`}
                        >
                          {dateToShow.toLocaleDateString(
                            isBn ? "bn-BD" : "en-US",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {nextEligibleDate &&
            new Date(nextEligibleDate).getTime() > new Date().getTime() && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-blue-800">
                    {tAi("next_eligible")}
                  </p>
                  <p className="text-sm text-blue-700">
                    {new Date(nextEligibleDate).toLocaleDateString(
                      isBn ? "bn-BD" : "en-US",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </p>
                </div>
              </div>
            )}

          {advice?.localNeed && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-800">
                  {tAi("local_need")}
                </p>
                <p className="text-sm text-red-700 mt-0.5">
                  {advice.localNeed}
                </p>
              </div>
            </div>
          )}

          {advice?.personalizedTip && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-800">
                  {tAi("tip")}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  {advice.personalizedTip}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Donor impact stats derived from donation history
  const totalUnits = donationHistory.reduce(
    (sum: number, d: any) => sum + (d.units || 0),
    0,
  );
  const livesSaved = totalUnits * 3; // 1 unit can help up to 3 patients
  const donorBadges = [
    { min: 1, en: "First Drop", bn: "প্রথম রক্তদান", icon: "🩸" },
    { min: 3, en: "Regular Donor", bn: "নিয়মিত দাতা", icon: "💪" },
    { min: 5, en: "Life Saver", bn: "জীবন রক্ষাকারী", icon: "🏅" },
    { min: 10, en: "Blood Hero", bn: "রক্ত বীর", icon: "🦸" },
    { min: 25, en: "Legend", bn: "কিংবদন্তি", icon: "👑" },
  ];

  const renderDonorImpact = () => {
    if (donationHistory.length === 0) return null;
    return (
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-red-50 border border-amber-200">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-amber-500" />
          {isBn ? "আপনার অবদান" : "Your Impact"}
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-red-100 p-3 text-center">
            <p className="text-2xl font-black text-red-600">
              {donationHistory.length}
            </p>
            <p className="text-[10px] font-semibold text-slate-500">
              {isBn ? "রক্তদান" : "Donations"}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 p-3 text-center">
            <p className="text-2xl font-black text-red-600">{totalUnits}</p>
            <p className="text-[10px] font-semibold text-slate-500">
              {isBn ? "ইউনিট" : "Units"}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-3 text-center">
            <p className="text-2xl font-black text-emerald-600">{livesSaved}</p>
            <p className="text-[10px] font-semibold text-slate-500">
              {isBn ? "জীবন বাঁচানো" : "Lives Saved"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {donorBadges.map((b) => {
            const earned = donationHistory.length >= b.min;
            return (
              <span
                key={b.min}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  earned
                    ? "bg-amber-100 border-amber-300 text-amber-800"
                    : "bg-slate-50 border-slate-200 text-slate-400 grayscale"
                }`}
                title={
                  earned
                    ? isBn
                      ? "অর্জিত!"
                      : "Earned!"
                    : `${b.min} ${isBn ? "রক্তদানে আনলক হবে" : "donations to unlock"}`
                }
              >
                <span>{b.icon}</span>
                {isBn ? b.bn : b.en}
                {!earned && <span className="text-[9px]">🔒</span>}
              </span>
            );
          })}
          {donationStreak >= 2 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-orange-100 border-orange-300 text-orange-800">
              🔥 {donationStreak} {isBn ? "ধারাবাহিক রক্তদান" : "donation streak"}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderNearbyRequests = () => {
    if (nearbyRequests.length === 0) return null;
    return (
      <div className="mb-6 rounded-2xl border border-blue-100 overflow-hidden">
        <div className="flex items-center justify-between gap-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-blue-600" />
            {isBn ? "কাছাকাছি ম্যাচিং রিকোয়েস্ট" : "Nearby Matching Requests"}
          </h3>
          <Link
            href="/requests"
            className="text-xs font-bold text-blue-700 hover:underline shrink-0"
          >
            {isBn ? "সব দেখুন →" : "View all →"}
          </Link>
        </div>
        <div className="divide-y divide-slate-100 bg-white">
          {nearbyRequests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3.5">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                <span className="text-xs font-black text-red-600">
                  {r.blood_group}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {r.patient_name}
                  </p>
                  {r.urgency_level === "critical" && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">
                      {isBn ? "জরুরি" : "CRITICAL"}
                    </span>
                  )}
                  {r.urgency_level === "urgent" && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                      {isBn ? "আর্জেন্ট" : "URGENT"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {r.hospital_name || "-"} ·{" "}
                  {[r.upazila, r.district].filter(Boolean).join(", ")} ·{" "}
                  {r.units_needed || 1} {isBn ? "ইউনিট" : "unit(s)"}
                </p>
              </div>
              <Link
                href="/requests"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 transition-colors"
              >
                {isBn ? "সাহায্য করুন" : "Help"}
              </Link>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPatientOverview = () => {
    const total = patientRequests.length;
    const active = patientRequests.filter((r: any) => r.status === "active" && r.current_status !== "fulfilled").length;
    const fulfilled = patientRequests.filter((r: any) => r.status === "fulfilled" || r.current_status === "fulfilled").length;
    const urgent = patientRequests.filter((r: any) => r.urgency_level === "critical" || r.urgency_level === "urgent").length;

    return (
      <div className="space-y-5 animate-[fadeSlideIn_0.2s_ease-out]">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                {isBn ? "মোট রিকোয়েস্ট" : "Total Requests"}
              </span>
            </div>
            <p className="text-2xl font-black text-blue-900">{total}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">
                {isBn ? "পূরণ হয়েছে" : "Fulfilled"}
              </span>
            </div>
            <p className="text-2xl font-black text-green-900">{fulfilled}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                {isBn ? "সক্রিয়" : "Active"}
              </span>
            </div>
            <p className="text-2xl font-black text-amber-900">{active}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                {isBn ? "জরুরি" : "Urgent"}
              </span>
            </div>
            <p className="text-2xl font-black text-red-900">{urgent}</p>
          </div>
        </div>

        {/* Quick action */}
        <Link
          href="/request"
          className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-bold hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-200 active:scale-[0.99]"
        >
          <HeartPulse className="w-5 h-5" />
          {isBn ? "🆘 এখনই রক্তের রিকোয়েস্ট করুন" : "🆘 Request Blood Now"}
        </Link>

        {/* Recent requests preview */}
        {patientRequests.length > 0 && (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" />
                {isBn ? "সাম্প্রতিক রিকোয়েস্ট" : "Recent Requests"}
              </h3>
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {patientRequests.slice(0, 3).map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-3.5">
                  <div className={`shrink-0 w-2 h-2 rounded-full ${
                    r.status === "fulfilled" || r.current_status === "fulfilled" ? "bg-green-500" :
                    r.current_status === "searching" ? "bg-amber-500" :
                    "bg-blue-500"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {r.patient_name || "-"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {r.blood_group} · {r.hospital_name || "-"} · {r.units_needed || 1} {isBn ? "ইউনিট" : "unit(s)"}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.urgency_level === "critical" ? "bg-red-100 text-red-700" :
                    r.urgency_level === "urgent" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {r.urgency_level === "critical" ? (isBn ? "জরুরি" : "Critical") :
                     r.urgency_level === "urgent" ? (isBn ? "গুরুত্বপূর্ণ" : "Urgent") :
                     isBn ? "স্বাভাবিক" : "Normal"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hospital directory */}
        {renderHospitalDirectory()}
      </div>
    );
  };

  const renderPatientView = () => {
    const v = patientForm.getValues();
    const districtObj = RANGPUR_DISTRICTS.find((d) => d.id === v.district);
    const upazilaObj = availableUpazilas.find((u) => u.id === v.upazila);
    const fields: { label: string; value: ReactNode }[] = [
      { label: t("full_name_bn") || "Name (BN)", value: v.fullNameBn || "-" },
      { label: t("full_name_en") || "Name (EN)", value: v.fullNameEn || "-" },
      { label: tCommon("phone") || "Phone", value: v.phone || "-" },
      {
        label: t("emergency_contact") || "Emergency Contact",
        value: v.alternativePhone || "-",
      },
      {
        label: t("blood_group") || "Blood Group",
        value: v.bloodGroup ? (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
            {v.bloodGroup}
          </span>
        ) : (
          "-"
        ),
      },
      {
        label: t("district") || "District",
        value: districtObj
          ? locale === "bn"
            ? districtObj.name_bn
            : districtObj.name_en
          : v.district || "-",
      },
      {
        label: t("upazila") || "Upazila",
        value: upazilaObj
          ? locale === "bn"
            ? upazilaObj.name_bn
            : upazilaObj.name_en
          : v.upazila || "-",
      },
      { label: t("address") || "Address", value: v.address || "-" },
      {
        label: t("date_of_birth") || "Date of Birth",
        value: v.dateOfBirth
          ? new Date(v.dateOfBirth).toLocaleDateString(
              locale === "bn" ? "bn-BD" : "en-US",
              { day: "numeric", month: "short", year: "numeric" },
            )
          : "-",
      },
    ];
    return (
      <div className="space-y-4">
        {renderAvatar()}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div
              key={f.label}
              className="bg-slate-50 rounded-xl p-4 border border-slate-200"
            >
              <p className="text-xs text-slate-500 mb-1">{f.label}</p>
              <p className="font-semibold text-slate-900">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Donation streak: consecutive donations spaced ≤ 120 days apart
  const donationStreak = (() => {
    const dates = donationHistory
      .map((d: any) => new Date(d.donation_date).getTime())
      .filter((n: number) => !Number.isNaN(n))
      .sort((a: number, b: number) => b - a);
    if (dates.length === 0) return 0;
    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const gapDays = (dates[i] - dates[i + 1]) / 86400000;
      if (gapDays <= 120) streak++;
      else break;
    }
    return streak;
  })();

  const renderDonorLeaderboard = () => {
    if (topDonors.length === 0) return null;
    const myId = user ? Number(user.id) : null;
    const medals = ["🥇", "🥈", "🥉"];
    return (
      <div className="mb-6 rounded-2xl border border-amber-200 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {isBn ? "শীর্ষ রক্তদাতা" : "Top Donors"}
          </h3>
        </div>
        <div className="divide-y divide-slate-100 bg-white">
          {topDonors.map((d: any, i: number) => {
            const isMe = myId !== null && d.id === myId;
            return (
              <div
                key={d.id}
                className={`flex items-center gap-3 p-3 ${isMe ? "bg-red-50/60" : ""}`}
              >
                <span className="w-7 text-center text-sm font-black text-slate-500">
                  {medals[i] || `#${i + 1}`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-sm truncate">
                    {isBn
                      ? d.full_name_bn || d.full_name_en
                      : d.full_name_en || d.full_name_bn}
                    {isMe && (
                      <span className="ml-1.5 text-[10px] font-bold text-red-600">
                        {isBn ? "(আপনি)" : "(You)"}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {d.district || "-"}
                  </p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black">
                  {d.blood_group}
                </span>
                <span className="shrink-0 text-xs font-bold text-slate-700">
                  {d.total_donations} {isBn ? "বার" : "×"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEligibilityQuiz = () => (
    <div className="mb-6 rounded-2xl border border-green-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setShowQuiz((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-colors"
      >
        <span className="flex items-center gap-2 font-bold text-slate-800 text-base">
          <Shield className="w-5 h-5 text-green-600" />
          {isBn ? "স্বাস্থ্য যোগ্যতা কুইজ" : "Health Eligibility Quiz"}
        </span>
        <span className="text-xs font-semibold text-green-700">
          {showQuiz ? (isBn ? "বন্ধ করুন" : "Close") : isBn ? "শুরু করুন →" : "Start →"}
        </span>
      </button>
      {showQuiz && (
        <div className="p-4 bg-white">
          <DonorEligibilityChecker
            onComplete={() => setShowQuiz(false)}
          />
        </div>
      )}
    </div>
  );

  const renderSavedPatients = () => (
    <div className="mb-6 rounded-2xl border border-blue-100 overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-4 bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Heart className="w-5 h-5 text-blue-600" />
          {isBn ? "সংরক্ষিত রোগীর প্রোফাইল" : "Saved Patient Profiles"}
        </h3>
        <button
          type="button"
          onClick={() => setShowAddPatient((v) => !v)}
          className="text-xs font-bold text-blue-700 hover:underline"
        >
          {showAddPatient
            ? isBn
              ? "বাতিল"
              : "Cancel"
            : isBn
              ? "+ যোগ করুন"
              : "+ Add"}
        </button>
      </div>

      <div className="p-4 bg-white space-y-3">
        {savedPatients.length === 0 && !showAddPatient && (
          <p className="text-xs text-slate-500">
            {isBn
              ? "পরিবারের সদস্যদের (সন্তান, পিতামাতা, স্বামী/স্ত্রী) প্রোফাইল সংরক্ষণ করুন — নতুন রিকোয়েস্টে এক-ক্লিকে তথ্য পূরণ হবে।"
              : "Save family members (child, parent, spouse) — new requests get pre-filled in one click."}
          </p>
        )}

        {savedPatients.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
          >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 text-sm truncate">
                {p.name}
                {p.relation && (
                  <span className="ml-1.5 text-[10px] font-semibold text-slate-400 capitalize">
                    ({p.relation})
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {[
                  p.age != null ? `${p.age} ${isBn ? "বছর" : "yrs"}` : null,
                  p.condition_note,
                ]
                  .filter(Boolean)
                  .join(" · ") || "-"}
              </p>
            </div>
            {p.blood_group && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black">
                {p.blood_group}
              </span>
            )}
            <Link
              href="/request"
              onClick={() => {
                try {
                  sessionStorage.setItem("request_template", JSON.stringify({
                    patientName: p.name,
                    patientAge: p.age ?? null,
                    bloodGroup: p.blood_group ?? null,
                  }));
                } catch {}
              }}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition-colors"
            >
              <Droplets className="w-3 h-3" />
              {isBn ? "রিকোয়েস্ট" : "Request"}
            </Link>
            <button
              type="button"
              onClick={() => handleDeleteSavedPatient(p.id)}
              className="shrink-0 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title={isBn ? "মুছুন" : "Delete"}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {showAddPatient && (
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2.5">
            <input
              value={newPatient.name}
              onChange={(e) =>
                setNewPatient({ ...newPatient, name: e.target.value })
              }
              placeholder={isBn ? "রোগীর নাম *" : "Patient name *"}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={0}
                max={120}
                value={newPatient.age}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, age: e.target.value })
                }
                placeholder={isBn ? "বয়স" : "Age"}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <select
                value={newPatient.bloodGroup}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, bloodGroup: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
              >
                <option value="">{isBn ? "রক্তের গ্রুপ" : "Blood group"}</option>
                {bloodGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <select
                value={newPatient.relation}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, relation: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
              >
                <option value="">{isBn ? "সম্পর্ক" : "Relation"}</option>
                <option value="self">{isBn ? "নিজ" : "Self"}</option>
                <option value="child">{isBn ? "সন্তান" : "Child"}</option>
                <option value="parent">{isBn ? "পিতা/মাতা" : "Parent"}</option>
                <option value="spouse">{isBn ? "স্বামী/স্ত্রী" : "Spouse"}</option>
                <option value="relative">{isBn ? "আত্মীয়" : "Relative"}</option>
                <option value="other">{isBn ? "অন্যান্য" : "Other"}</option>
              </select>
            </div>
            <input
              value={newPatient.conditionNote}
              onChange={(e) =>
                setNewPatient({ ...newPatient, conditionNote: e.target.value })
              }
              placeholder={
                isBn
                  ? "রোগ/অবস্থা (যেমন: থ্যালাসেমিয়া)"
                  : "Condition (e.g., Thalassemia)"
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            <button
              type="button"
              onClick={handleAddSavedPatient}
              disabled={savingPatient || newPatient.name.trim().length < 2}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingPatient ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isBn ? "সংরক্ষণ করুন" : "Save Patient"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderHospitalDirectory = () => {
    if (hospitals.length === 0) return null;
    return (
      <div className="mb-6 rounded-2xl border border-teal-100 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            {isBn ? "নিবন্ধিত হাসপাতাল ও ব্লাড ব্যাংক" : "Registered Hospitals & Blood Banks"}
          </h3>
        </div>
        <div className="divide-y divide-slate-100 bg-white">
          {hospitals.map((h: any) => (
            <div key={h.id} className="flex items-center gap-3 p-3.5">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 text-sm truncate">
                  {isBn
                    ? h.hospital_name_bn || h.hospital_name_en
                    : h.hospital_name_en || h.hospital_name_bn}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {[h.upazila, h.district].filter(Boolean).join(", ") || "-"}
                </p>
              </div>
              {h.phone && (
                <a
                  href={`tel:${h.phone}`}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-[11px] font-bold hover:bg-teal-700 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {isBn ? "ব্লাড ব্যাংক" : "Blood Bank"}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Reactive donor profile view — uses watch() so the display updates
  // immediately when the form changes (save, record donation, etc.)
  const DonorProfileView = () => {
    const fullNameBn = donorForm.watch("fullNameBn");
    const fullNameEn = donorForm.watch("fullNameEn");
    const phone = donorForm.watch("phone");
    const bloodGroup = donorForm.watch("bloodGroup");
    const sex = donorForm.watch("sex");
    const occupation = donorForm.watch("occupation");
    const weight = donorForm.watch("weight");
    const lastDonationDate = donorForm.watch("lastDonationDate");
    const preferredContact = donorForm.watch("preferredContact");
    const isActive = donorForm.watch("isActive");
    const address = donorForm.watch("address");
    const district = donorForm.watch("district");
    const upazila = donorForm.watch("upazila");

    return (
      <div className="space-y-4">
        {renderAvatar()}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-[10px] text-slate-500 mb-0.5">{t("full_name_bn") || "Name (BN)"}</p>
            <p className="font-semibold text-slate-900 text-sm">{fullNameBn || "-"}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-[10px] text-slate-500 mb-0.5">{t("full_name_en") || "Name (EN)"}</p>
            <p className="font-semibold text-slate-900 text-sm">{fullNameEn || "-"}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-[10px] text-slate-500 mb-0.5">{tCommon("phone") || "Phone"}</p>
            <p className="font-semibold text-slate-900 text-sm">{phone || "-"}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 border border-red-200">
            <p className="text-[10px] text-red-500 mb-0.5">{t("blood_group") || "Blood"}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-red-100 text-red-700">{bloodGroup || "-"}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-[10px] text-slate-500 mb-0.5">{t("sex") || "Gender"}</p>
            <p className="font-semibold text-slate-900 text-sm capitalize">{sex || "-"}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-[10px] text-slate-500 mb-0.5">{t("occupation") || "Occupation"}</p>
            <p className="font-semibold text-slate-900 text-sm">{occupation || "-"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
            <p className="text-[10px] text-blue-600 mb-0.5">{t("weight_kg") || "Weight"}</p>
            <p className="text-sm font-bold text-blue-900">{weight ? `${weight} kg` : "-"}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
            <p className="text-[10px] text-purple-600 mb-0.5">{t("last_donation_date") || "Last Donation"}</p>
            <p className="text-sm font-bold text-purple-900">
              {lastDonationDate
                ? new Date(lastDonationDate).toLocaleDateString(
                    locale === "bn" ? "bn-BD" : "en-US",
                    { day: "numeric", month: "short", year: "numeric" },
                  )
                : "Never"}
            </p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
            <p className="text-[10px] text-orange-600 mb-0.5">{t("preferred_contact") || "Contact Via"}</p>
            <p className="text-sm font-bold text-orange-900 capitalize">{preferredContact || "-"}</p>
          </div>
          <div className={`rounded-xl p-3 border ${isActive ? "bg-green-50 border-green-200" : "bg-slate-100 border-slate-200"}`}>
            <p className={`text-[10px] mb-0.5 ${isActive ? "text-green-600" : "text-slate-500"}`}>{t("status") || "Status"}</p>
            <p className={`text-sm font-bold ${isActive ? "text-green-900" : "text-slate-600"}`}>
              {isActive ? "✓ Available" : "Unavailable"}
            </p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <p className="text-[10px] text-slate-500 mb-0.5">{t("address") || "Address"}</p>
          <p className="font-semibold text-slate-900 text-sm">{address || "-"}</p>
          <p className="text-xs text-slate-500 mt-1">
            {district
              ? RANGPUR_DISTRICTS.find((d) => d.id === district)
                ? locale === "bn"
                  ? RANGPUR_DISTRICTS.find((d) => d.id === district)?.name_bn
                  : RANGPUR_DISTRICTS.find((d) => d.id === district)?.name_en
                : district
              : "-"}
            {upazila
              ? `, ${availableUpazilas.find((u) => u.id === upazila)
                  ? locale === "bn"
                    ? availableUpazilas.find((u) => u.id === upazila)?.name_bn
                    : availableUpazilas.find((u) => u.id === upazila)?.name_en
                  : upazila}`
              : ""}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-xl border border-slate-100">
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white">
          {getRoleIcon()}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {getRoleTitle()}
          </h2>
          <p className="text-slate-500 text-sm sm:text-base">{t("keep_updated")}</p>
        </div>
      </div>

      {isProfileIncomplete() && (() => {
        const missing = getMissingFields();
        const isBn = locale === "bn";
        return (
          <div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-amber-900 text-base">
                  {role === "donor"
                    ? isBn ? "⚠ আপনার ডোনার প্রোফাইল সম্পূর্ণ করুন" : "⚠ Complete Your Donor Profile"
                    : role === "patient"
                      ? isBn ? "⚠ আপনার পেশেন্ট প্রোফাইল সম্পূর্ণ করুন" : "⚠ Complete Your Patient Profile"
                      : isBn ? "⚠ আপনার হাসপাতাল প্রোফাইল সম্পূর্ণ করুন" : "⚠ Complete Your Hospital Profile"}
                </h4>
                <p className="text-sm text-amber-800 mt-1 font-medium">
                  {role === "donor"
                    ? isBn
                      ? "নিচের তথ্য পূরণ না করলে আপনি ডোনার তালিকায় দেখা যাবেন না এবং কেউ আপনার সাথে যোগাযোগ করতে পারবে না:"
                      : "Until you fill in the fields below, you will NOT appear in the donor list and cannot be contacted by anyone:"
                    : isBn
                      ? "নিচের তথ্য পূরণ না করলে আপনি সম্পূর্ণভাবে কাজ করতে পারবেন না:"
                      : "Until you fill in the fields below, your profile will not be fully functional:"}
                </p>
                {missing.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {missing.map((field) => (
                      <li key={field} className="text-sm text-amber-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <span className="font-medium">{field}</span>
                        <span className="text-amber-400">— {isBn ? "অসম্পূর্ণ" : "missing"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {role === "donor" && (
        <>
          {/* ── Sticky tab bar ── */}
          <div className="sticky top-[60px] z-20 mb-5 -mx-1 px-1">
            <div className="flex gap-1 p-1 bg-white rounded-2xl shadow-md border border-slate-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([
                { key: "overview", label: isBn ? "ওভারভিউ" : "Overview", icon: Sparkles },
                { key: "donations", label: isBn ? "রক্তদান" : "Donations", icon: Droplets },
                { key: "requests", label: isBn ? "রিকোয়েস্ট" : "Requests", icon: HeartPulse },
                { key: "profile", label: isBn ? "প্রোফাইল" : "Profile", icon: User },
                { key: "verification", label: isBn ? "যাচাই" : "Verify", icon: ShieldCheck },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const active = activeDonorTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveDonorTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      active
                        ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─────────────── Overview Tab ─────────────── */}
          {activeDonorTab === "overview" && (
            <div className="space-y-0 animate-[fadeSlideIn_0.2s_ease-out]">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={() => {
                    setActiveDonorTab("donations");
                    setShowRecordDonation(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all active:scale-[0.98] text-xs"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  {isBn ? "রেকর্ড ডোনেশন" : "Record Donation"}
                  <Plus className="w-3 h-3 opacity-60" />
                </button>
                <button
                  onClick={() => setShowQrScanner(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all active:scale-[0.98] text-xs"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  {isBn ? "QR স্ক্যান" : "Scan QR"}
                </button>
              </div>
              {renderDonorImpact()}
              {renderDonorAdvisor()}
              {renderNearbyRequests()}
              {renderDonorLeaderboard()}
            </div>
          )}

          {/* ─────────────── Donations Tab ─────────────── */}
          {activeDonorTab === "donations" && (
            <div className="space-y-0 animate-[fadeSlideIn_0.2s_ease-out]">
              {/* Record donation — collapsed button */}
              {!showRecordDonation && (
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <button
                    onClick={() => setShowRecordDonation(true)}
                    className="w-full sm:w-auto sm:inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all active:scale-[0.98]"
                  >
                    <Droplets className="w-4 h-4" />
                    <span className="text-sm">
                      {t("record_my_donation") || "📝 Record My Last Donation"}
                    </span>
                    <Plus className="w-4 h-4 opacity-60" />
                  </button>
                  <button
                    onClick={() => setShowQrScanner(true)}
                    className="w-full sm:w-auto sm:inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all active:scale-[0.98]"
                  >
                    <ScanLine className="w-4 h-4" />
                    <span className="text-sm">
                      {isBn ? "QR স্ক্যান করে ডোনেশন" : "Scan Request QR"}
                    </span>
                  </button>
                </div>
              )}

              {/* Record donation — expanded form */}
              {showRecordDonation && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-dashed border-red-200 rounded-2xl mb-5 animate-[fadeSlideIn_0.25s_ease-out]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-red-800 text-sm flex items-center gap-2">
                        <Droplets className="w-4 h-4" />
                        {t("record_my_donation") || "Record Donation"}
                      </h4>
                      <button
                        onClick={() => setShowRecordDonation(false)}
                        className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    <p className="text-xs text-red-600">
                      {t("record_donation_hint") ||
                        "Just donated? Log it here to update your eligibility status"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={recordForm.donationDate}
                          onChange={(e) => setRecordForm({ ...recordForm, donationDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                        <select
                          value={recordForm.donationType}
                          onChange={(e) => setRecordForm({ ...recordForm, donationType: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                        >
                          <option value="whole_blood">Whole Blood</option>
                          <option value="platelets">Platelets</option>
                          <option value="plasma">Plasma</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Hospital Name</label>
                        <input
                          type="text"
                          value={recordForm.hospitalName}
                          onChange={(e) => setRecordForm({ ...recordForm, hospitalName: e.target.value })}
                          placeholder="Where did you donate?"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Units</label>
                        <input
                          type="number"
                          value={recordForm.units}
                          onChange={(e) => setRecordForm({ ...recordForm, units: e.target.value })}
                          min={1}
                          max={5}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleRecordDonation}
                        disabled={recordingDonation}
                        className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold text-sm hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {recordingDonation ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {t("confirm_record") || "✓ Confirm & Record"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRecordDonation(false)}
                        className="px-3 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Donation history */}
              {donationHistory.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <Droplets className="w-5 h-5 text-red-600" />
                    {t("donation_history") || "Donation History"}
                    <span className="text-sm font-normal text-slate-500">
                      ({donationHistory.length}{" "}
                      {t("donations_lower") || "donations"},{" "}
                      {donationHistory.reduce((sum: number, d: any) => sum + (d.units || 0), 0)}{" "}
                      {t("units_lower") || "units"})
                    </span>
                  </h3>
                  <div className="space-y-2.5">
                    {donationHistory.map((d: any) => (
                      <div key={d.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-xl">🩸</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900">
                            {(d.donation_type || "Whole Blood").replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            <span className="text-slate-400 font-normal"> - {d.units || 1} unit{(d.units || 1) > 1 ? "s" : ""}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {d.hospital_name || "-"} • {d.donation_date ? new Date(d.donation_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          +{d.units || 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {renderEligibilityQuiz()}
            </div>
          )}

          {/* ─────────────── Requests Tab ─────────────── */}
          {activeDonorTab === "requests" && (
            <div className="animate-[fadeSlideIn_0.2s_ease-out]">
              <MyRequests />
            </div>
          )}

          {/* ─────────────── Profile Tab ─────────────── */}
          {activeDonorTab === "profile" && (
            <div className="animate-[fadeSlideIn_0.2s_ease-out]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-red-600" />
                  {t("personal_info") || "Personal Information"}
                </h3>
                {!isEditingProfile ? (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t("edit_profile") || "Edit"}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("cancel") || "Cancel"}
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={donorForm.handleSubmit(onDonorSubmit)} className="space-y-6">
                  {/* Personal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("full_name_bn")} *</label>
                      <input {...donorForm.register("fullNameBn")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="রহিম উদ্দিন" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("full_name_en")} *</label>
                      <input {...donorForm.register("fullNameEn")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="Rahim Uddin" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{tCommon("phone")} *</label>
                      <input {...donorForm.register("phone")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="017XXXXXXXX" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("blood_group")} *</label>
                      <select {...donorForm.register("bloodGroup")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white">
                        <option value="">{t("select_blood_group")}</option>
                        {bloodGroups.map((group) => (<option key={group} value={group}>{group}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("sex") || "Gender"}</label>
                      <select {...donorForm.register("sex")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white">
                        <option value="">{t("select_sex") || "Select Gender"}</option>
                        <option value="male">{t("male") || "Male"}</option>
                        <option value="female">{t("female") || "Female"}</option>
                        <option value="other">{t("other") || "Other"}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("date_of_birth")}</label>
                      <input {...donorForm.register("dateOfBirth")} type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t("occupation") || "Occupation"}</label>
                      <input {...donorForm.register("occupation")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder={t("occupation_placeholder") || "e.g., Student, Teacher, Business"} />
                    </div>
                  </div>

                  {/* Health */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                      <Heart className="w-4 h-4 text-red-500" />
                      {t("health_info") || "Health Information"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("weight_kg") || "Weight (kg)"}</label>
                        <input {...donorForm.register("weight")} type="number" step="0.1" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="65" />
                        <p className="text-xs text-slate-400 mt-1">{t("weight_hint") || "Minimum 50 kg required"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("hb_level") || "Hemoglobin (g/dL)"}</label>
                        <input {...donorForm.register("hbLevel")} type="number" step="0.1" min="0" max="25" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="e.g. 13.5" />
                        <p className="text-xs text-slate-400 mt-1">{t("hb_hint") || "Optional"}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("last_hb_test_date") || "Last Hb Test"}</label>
                        <input {...donorForm.register("lastHbTestDate")} type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("last_donation_date") || "Last Donation"}</label>
                        <input {...donorForm.register("lastDonationDate")} type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("last_donation_type") || "Donation Type"}</label>
                        <select {...donorForm.register("lastDonationType")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white">
                          <option value="whole_blood">{t("type_whole_blood") || "Whole Blood"}</option>
                          <option value="platelets">{t("type_platelets") || "Platelets"}</option>
                          <option value="plasma">{t("type_plasma") || "Plasma"}</option>
                        </select>
                      </div>
                    </div>

                    {(() => {
                      const lastDonation = donorForm.watch("lastDonationDate");
                      const donationType = donorForm.watch("lastDonationType");
                      if (!lastDonation || !donationType) return null;
                      const lastDate = new Date(lastDonation);
                      const now = new Date();
                      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                      const types = [
                        { key: "whole_blood", cooldown: 90, icon: "🩸", label_en: "Whole Blood", label_bn: "সম্পূর্ণ রক্ত" },
                        { key: "platelets", cooldown: 14, icon: "🔴", label_en: "Platelets", label_bn: "প্লাটিলেট" },
                        { key: "plasma", cooldown: 30, icon: "💉", label_en: "Plasma", label_bn: "প্লাজমা" },
                      ];
                      return (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-semibold text-slate-700">{t("eligibility_status") || "Eligibility Status"}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {types.map((type) => {
                              const isEligible = diffDays >= type.cooldown;
                              const eligibleDate = new Date(lastDate.getTime() + type.cooldown * 86400000);
                              const remaining = type.cooldown - diffDays;
                              return (
                                <div key={type.key} className={`p-3 rounded-xl border flex items-center gap-2 ${isEligible ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                                  <span className="text-lg">{type.icon}</span>
                                  <div className="min-w-0">
                                    <p className={`text-xs font-semibold ${isEligible ? "text-green-800" : "text-amber-800"}`}>
                                      {isEligible ? t("ready_to_donate") || "✓ Ready" : t("cooling_down") || "⏳ Cooling down"}
                                    </p>
                                    <p className={`text-[10px] truncate ${isEligible ? "text-green-600" : "text-amber-600"}`}>
                                      {locale === "bn" ? type.label_bn : type.label_en}
                                      {isEligible ? ` (${diffDays}d)` : ` → ${eligibleDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })} (${remaining}d)`}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input {...donorForm.register("hasChronicDisease")} type="checkbox" className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                        <span className="text-sm font-medium text-slate-700">{t("has_chronic_disease") || "I have a chronic disease/medical condition"}</span>
                      </label>
                      {donorForm.watch("hasChronicDisease") && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t("disease_details") || "Details"}</label>
                          <textarea {...donorForm.register("diseaseDetails")} rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none" placeholder={t("disease_details_placeholder") || "e.g., Diabetes, High BP..."} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                      <Phone className="w-4 h-4 text-red-500" />
                      {t("contact_info") || "Contact Information"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("alternative_phone") || "Alt. Phone"}</label>
                        <input {...donorForm.register("alternativePhone")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="018XXXXXXXX" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("whatsapp_number") || "WhatsApp"}</label>
                        <input {...donorForm.register("whatsappNumber")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none" placeholder="017XXXXXXXX" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("preferred_contact") || "Preferred Contact"}</label>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input {...donorForm.register("preferredContact")} type="radio" value="call" className="w-4 h-4 text-red-600 focus:ring-red-500" />
                            <span className="text-sm text-slate-700">{t("pref_call") || "Call"}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input {...donorForm.register("preferredContact")} type="radio" value="whatsapp" className="w-4 h-4 text-red-600 focus:ring-red-500" />
                            <span className="text-sm text-slate-700">{t("pref_whatsapp") || "WhatsApp"}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input {...donorForm.register("preferredContact")} type="radio" value="either" className="w-4 h-4 text-red-600 focus:ring-red-500" />
                            <span className="text-sm text-slate-700">{t("pref_either") || "Either"}</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-red-500" />
                      {t("location_info") || "Location"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("district")}</label>
                        <select
                          {...donorForm.register("district")}
                          onChange={(e) => { donorForm.setValue("district", e.target.value); setSelectedDistrict(e.target.value); donorForm.setValue("upazila", ""); }}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white"
                        >
                          <option value="">{t("select_district")}</option>
                          {RANGPUR_DISTRICTS.map((d) => (<option key={d.id} value={d.id}>{locale === "bn" ? d.name_bn : d.name_en}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("upazila")}</label>
                        <select {...donorForm.register("upazila")} onChange={(e) => { donorForm.setValue("upazila", e.target.value); setSelectedUpazila(e.target.value); donorForm.setValue("union", ""); }} disabled={!selectedDistrict} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white disabled:bg-slate-100">
                          <option value="">{t("select_upazila")}</option>
                          {availableUpazilas.map((u) => (<option key={u.id} value={u.id}>{locale === "bn" ? u.name_bn : u.name_en}</option>))}
                        </select>
                      </div>
                      {availableUnions.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">{t("union")}</label>
                          <select {...donorForm.register("union")} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none bg-white">
                            <option value="">{t("select_union")}</option>
                            {availableUnions.map((u) => (<option key={u.id} value={u.id}>{locale === "bn" ? u.name_bn : u.name_en}</option>))}
                          </select>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("address")}</label>
                        <textarea {...donorForm.register("address")} rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-500 outline-none resize-none" placeholder={t("address_placeholder")} />
                      </div>
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                    <input {...donorForm.register("isActive")} type="checkbox" id="isActiveEdit" className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500" />
                    <label htmlFor="isActiveEdit" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {t("available_for_donation")}
                    </label>
                  </div>

                  {(() => {
                    const isActive = donorForm.watch("isActive");
                    const lastDate = donorForm.watch("lastDonationDate");
                    if (!isActive || !lastDate) return null;
                    const now = new Date();
                    const diffDays = Math.floor((now.getTime() - new Date(lastDate).getTime()) / 86400000);
                    const minCooldown = 14;
                    if (diffDays >= minCooldown) return null;
                    const daysLeft = minCooldown - diffDays;
                    return (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-red-800">{t("available_warning") || "⚠️ Cooling down!"}</p>
                          <p className="text-[10px] text-red-600 mt-0.5">{t("warning_detail") || "Profile hidden until eligible"} (in {daysLeft}d).</p>
                        </div>
                      </div>
                    );
                  })()}

                  <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {t("save_profile")}
                  </button>
                </form>
              ) : (
                <DonorProfileView />
              )}
            </div>
          )}

          {/* ─────────────── Verification Tab (NID upload) ─────────────── */}
          {activeDonorTab === "verification" && (
            <div className="animate-[fadeSlideIn_0.2s_ease-out]">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-5">
                <ShieldCheck className="w-5 h-5 text-red-600" />
                {isBn ? "পরিচয় যাচাই" : "Identity Verification"}
              </h3>
              <NidVerificationSection />

              {/* Donor QR card — donor can download and share */}
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
                <h4 className="text-sm font-semibold text-slate-700 self-start">
                  {isBn ? "আপনার QR কার্ড" : "Your QR Card"}
                </h4>
                <DonorQrCard
                  donorId={Number(user?.id)}
                  bloodGroup={donorForm.watch("bloodGroup") || ""}
                  district={donorForm.watch("district") || ""}
                  donorName={donorForm.watch("fullNameEn") || donorForm.watch("fullNameBn")}
                />
              </div>
            </div>
          )}
        </>
      )}
      {role === "patient" && (
        <>
          {/* ── Sticky tab bar ── */}
          <div className="sticky top-[60px] z-20 mb-5 -mx-1 px-1">
            <div className="flex gap-1 p-1 bg-white rounded-2xl shadow-md border border-slate-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([
                { key: "overview", label: isBn ? "ওভারভিউ" : "Overview", icon: Sparkles },
                { key: "requests", label: isBn ? "রিকোয়েস্ট" : "Requests", icon: Droplets },
                { key: "profile", label: isBn ? "প্রোফাইল" : "Profile", icon: User },
                { key: "saved", label: isBn ? "সংরক্ষিত" : "Saved", icon: Heart },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const active = activePatientTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActivePatientTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      active
                        ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Overview Tab ── */}
          {activePatientTab === "overview" && renderPatientOverview()}

          {/* ── Requests Tab ── */}
          {activePatientTab === "requests" && (
            <div className="animate-[fadeSlideIn_0.2s_ease-out]">
              <MyRequests />
            </div>
          )}

          {/* ── Profile Tab ── */}
          {activePatientTab === "profile" && (
            <div className="animate-[fadeSlideIn_0.2s_ease-out]">
              <div className="border-t-2 border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    {t("personal_info") || "Personal Information"}
                  </h3>
                  {!isEditingProfile ? (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t("edit_profile") || "Edit"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      {t("cancel") || "Cancel"}
                    </button>
                  )}
                </div>
                {isEditingProfile ? renderPatientForm() : renderPatientView()}
              </div>
            </div>
          )}

          {/* ── Saved Tab ── */}
          {activePatientTab === "saved" && (
            <div className="space-y-0 animate-[fadeSlideIn_0.2s_ease-out]">
              {renderSavedPatients()}
              {renderHospitalDirectory()}
            </div>
          )}
        </>
      )}
      {role === "hospital" && (
        <>
          {/* ── Sticky tab bar ── */}
          <div className="sticky top-[60px] z-20 mb-5 -mx-1 px-1">
            <div className="flex gap-1 p-1 bg-white rounded-2xl shadow-md border border-slate-200 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {([
                { key: "overview", label: isBn ? "ওভারভিউ" : "Overview", icon: Sparkles },
                { key: "requests", label: isBn ? "রিকোয়েস্ট" : "Requests", icon: Droplets },
                { key: "donations", label: isBn ? "রক্তদান" : "Donations", icon: Heart },
                { key: "profile", label: isBn ? "প্রোফাইল" : "Profile", icon: Building2 },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const active = activeHospitalTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveHospitalTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      active
                        ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Overview Tab ── */}
          {activeHospitalTab === "overview" && renderHospitalOverview()}

          {/* ── Requests Tab ── */}
          {activeHospitalTab === "requests" && renderHospitalRequests()}

          {/* ── Donations Tab ── */}
          {activeHospitalTab === "donations" && renderHospitalDonations()}

          {/* ── Profile Tab ── */}
          {activeHospitalTab === "profile" && (
            <div className="animate-[fadeSlideIn_0.2s_ease-out]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  {t("hospital_profile") || "Hospital Profile"}
                </h3>
                {!isEditingHospital ? (
                  <button
                    onClick={() => setIsEditingHospital(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t("edit_profile") || "Edit"}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingHospital(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("cancel") || "Cancel"}
                  </button>
                )}
              </div>
              {isEditingHospital ? renderHospitalForm() : renderHospitalView()}
            </div>
          )}
        </>
      )}
      {(role === "admin" || role === "super_admin") && renderAdminForm()}
      {!role && (
        <div className="text-center py-10 text-slate-500">
          {t("please_login")}
        </div>
      )}

      {showQrScanner && role === "donor" && (
        <DonorQrScanner onClose={() => setShowQrScanner(false)} />
      )}
    </div>
  );
}
