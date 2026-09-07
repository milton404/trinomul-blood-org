"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  Heart,
  Users,
  AlertCircle,
  ScanLine,
  MessageCircle,
  User,
  type LucideIcon,
} from "lucide-react";
import QrScannerModal from "./QrScannerModal";

type BottomTab = {
  key: string;
  href: string | null;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export default function BottomNav() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [isScanOpen, setIsScanOpen] = useState(false);

  const tabs: BottomTab[] = [
    { key: "home", href: "/", label: t("home"), icon: Heart, exact: true },
    { key: "donors", href: "/donors", label: t("donors"), icon: Users },
    { key: "requests", href: "/requests", label: t("requests"), icon: AlertCircle },
    { key: "scan", href: null, label: t("scan"), icon: ScanLine },
    { key: "community", href: "/feed", label: t("community"), icon: MessageCircle },
    { key: "profile", href: "/profile", label: t("profile"), icon: User },
  ];

  const isActive = (tab: BottomTab) => {
    if (!tab.href) return false;
    if (tab.exact) return pathname === tab.href;
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  };

  return (
    <>
      <nav
        className="bottom-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 md:hidden
          bg-white/65 backdrop-blur-2xl backdrop-saturate-150
          border-t border-white/60
          shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.25),0_-2px_10px_-4px_rgba(220,38,38,0.12)]
          pb-[env(safe-area-inset-bottom)]"
        aria-label="Bottom navigation"
      >
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;

          const content = (
            <>
              <span
                className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 ${
                  active ? "bg-red-500/10" : ""
                }`}
              >
                <Icon
                  className={`h-[22px] w-[22px] transition-colors ${
                    active ? "text-red-600" : "text-slate-400"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              <span
                className={`text-[10px] leading-none font-medium transition-colors ${
                  active ? "text-red-600" : "text-slate-400"
                }`}
              >
                {tab.label}
              </span>
            </>
          );

          const itemClass =
            "flex flex-col items-center gap-1 pt-2 pb-1.5 select-none active:scale-95 transition-transform";
          const ariaCurrent = active ? ("page" as const) : undefined;

          if (tab.href) {
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={itemClass}
                aria-current={ariaCurrent}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setIsScanOpen(true)}
              className={itemClass}
              aria-label={tab.label}
            >
              {content}
            </button>
          );
        })}
      </nav>

      {isScanOpen && <QrScannerModal onClose={() => setIsScanOpen(false)} />}
    </>
  );
}