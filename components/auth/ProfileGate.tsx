"use client";

import { useLocale, useTranslations } from "next-intl";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "@/store/authStore";
import { clearSession } from "@/components/providers/AuthProvider";
import LoginForm from "./LoginForm";
import ProfileForm from "./ProfileForm";
import ShareToCommunityButton from "@/components/social/ShareToCommunityButton";
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
      {/* Phone/PWA: no always-visible top nav logout, so surface one here.
          Desktop keeps using the logout in the top navbar (hidden below sm). */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex-1 min-w-0 flex justify-end">
          <ShareToCommunityButton />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 text-sm font-semibold transition-all active:scale-[0.97] shrink-0"
          aria-label={tCommon("logout")}
        >
          <LogOut className="w-4 h-4" />
          <span>{tCommon("logout")}</span>
        </button>
      </div>
      <ProfileForm />
      <ProfileSocialTabs />
    </>
  );
}
