"use client";

import { useLocale, useTranslations } from "next-intl";
import { Loader2, Award, Gift } from "lucide-react";
import { useRouter, Link } from "@/i18n/routing";
import { useAuthStore } from "@/store/authStore";
import { clearSession } from "@/components/providers/AuthProvider";
import LoginForm from "./LoginForm";
import ProfileForm from "./ProfileForm";
import ProfileSocialTabs from "@/components/social/ProfileSocialTabs";

/**
 * Gating wrapper for the /profile route (also the Profile tab in phone/PWA).
 *
 * - While auth is still being restored → loader.
 * - Logged in  → the user's account dashboard (ProfileForm).
 * - Logged out → the login page so users can sign in first.
 */
export default function ProfileGate() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isBn = locale === "bn";
  const router = useRouter();
  const { user, isLoading, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearSession();
    clearAuth();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            {isBn ? "আপনার প্রোফাইল" : "Your Profile"}
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {t("please_login")}
          </p>
        </div>
        <LoginForm />
      </div>
    );
  }

  return (
    <>
      <ProfileForm />

      {user.role === "donor" && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/certificates"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <Award className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 text-sm">
                {isBn ? "রক্তদান সনদপত্র" : "Donation Certificates"}
              </div>
              <div className="text-xs text-slate-500">
                {isBn ? "ডাউনলোড করুন" : "Download your certificates"}
              </div>
            </div>
          </Link>
          <Link
            href="/rewards"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <Gift className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900 text-sm">
                {isBn ? "পুরস্কার ও পয়েন্ট" : "Rewards & Points"}
              </div>
              <div className="text-xs text-slate-500">
                {isBn ? "পয়েন্ট দেখুন ও রিডিম করুন" : "View points & redeem"}
              </div>
            </div>
          </Link>
        </div>
      )}

      <ProfileSocialTabs />
    </>
  );
}
