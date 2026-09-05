"use client";

import { usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Menu, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import NotificationPanel from "./NotificationPanel";
import LanguageSwitcher from "../common/LanguageSwitcher";

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "dashboard_overview",
  "/admin/users": "users_management",
  "/admin/hospitals": "hospitals",
  "/admin/blood-requests": "requests_management",
  "/admin/donations": "donations_management",
  "/admin/donor-matches": "nav_donor_matches",
  "/admin/organizations": "nav_organizations",
  "/admin/analytics": "analytics",
  "/admin/ai-insights": "ai_insights",
  "/admin/activity-log": "activity_log",
  "/admin/manage-admins": "manage_admins",
  "/admin/settings": "settings",
};

export default function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const cleanPath = pathname.replace(/^\/(en|bn)/, "");
  const titleKey = pageTitles[cleanPath] || "dashboard_overview";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left: menu toggle + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label={t("nav_mobile_menu")}
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-slate-400 hidden sm:inline">{t("nav_admin_panel")}</span>
          <ChevronRight className="w-4 h-4 text-slate-300 hidden sm:inline" />
          <span className="font-semibold text-slate-900">{t(titleKey)}</span>
        </div>
      </div>

      {/* Right: language + notifications + profile */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher className="shrink-0" />
        <NotificationPanel />

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 pr-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">A</span>
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:inline">
              {t("admin")}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">{t("admin")}</p>
                <p className="text-xs text-slate-400">{t("nav_administrator")}</p>
              </div>
              <div className="p-1.5">
                <a
                  href="/admin/settings"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  {t("settings")}
                </a>
                <a
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  {t("nav_back_to_site")}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
