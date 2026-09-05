"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Share2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

/**
 * Shown on a donor's profile page. Opens the community composer pre-filled
 * with the donor's donation progress (handled by the feed composer).
 */
export default function ShareToCommunityButton() {
  const t = useTranslations("social");
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);

  if (!user || (role !== "donor" && role !== "patient")) return null;

  return (
    <Link
      href="/feed?share=donation"
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold shadow-sm hover:from-red-700 hover:to-rose-700 transition-all"
    >
      <Share2 className="w-4 h-4" />
      {t("shareToCommunity")}
    </Link>
  );
}
