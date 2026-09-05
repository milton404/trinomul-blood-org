"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Loader2, Droplets, Heart, Building2, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import RoleSelection from "@/components/auth/RoleSelection";
import DonorCompleteForm from "@/components/auth/DonorCompleteForm";
import PatientCompleteForm from "@/components/auth/PatientCompleteForm";
import HospitalCompleteForm from "@/components/auth/HospitalCompleteForm";

export default function CompleteProfilePage() {
  const t = useTranslations("complete_profile");
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const demoUser = user || {
    id: 0,
    email: "demo@donor.com",
    role: "donor",
  };

  useEffect(() => {
    if (!user) return;
  }, [user]);

  const effectiveUser = user || demoUser;
  // The auth user may carry full_name_en/full_name_bn from the server action.
  const userName = (effectiveUser as any)?.full_name_en ?? (effectiveUser as any)?.full_name_bn ?? undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-green-50 p-4">
      <div className="w-full max-w-2xl">
        {!selectedRole ? (
          <RoleSelection
            onSelect={setSelectedRole}
            userEmail={effectiveUser?.email}
            userName={userName}
          />
        ) : selectedRole === "donor" ? (
          <DonorCompleteForm
            user={effectiveUser}
            onComplete={() => router.push("/profile")}
          />
        ) : selectedRole === "patient" ? (
          <PatientCompleteForm
            user={effectiveUser}
            onComplete={() => router.push("/profile")}
          />
        ) : (
          <HospitalCompleteForm
            user={effectiveUser}
            onComplete={() => router.push("/profile")}
          />
        )}
      </div>
    </div>
  );
}
