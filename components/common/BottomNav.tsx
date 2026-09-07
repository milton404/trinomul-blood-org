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
        className="bottom-nav fixed inset-x-0 bottom-0 z-50 md:hidden
          pb-[env(safe-area-inset-bottom)]"
        aria-label="Bottom navigation"
      >
        <div
          className="pointer-events-auto relative mx-auto mb-2 grid max-w-[26rem] grid-cols-6 items-end gap-1
            rounded-[28px] border border-white/60 bg-white/70 px-2 pt-2 pb-1.5
            backdrop-blur-2xl backdrop-saturate-150
            shadow-[0_-2px_24px_-6px_rgba(148,163,184,0.35),0_8px_32px_-12px_rgba(220,38,38,0.28),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-6px_12px_-8px_rgba(220,38,38,0.12)]"
        >
          {/* Liquid sheen along the top edge of the glass bar */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/90 to-transparent"
          />
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;

            const content = (
              <>
                <span
                  className={`relative flex h-9 w-14 items-center justify-center rounded-full transition-all duration-300 ${
                    active
                      ? "bg-gradient-to-b from-red-500 to-red-600 text-white ring-2 ring-white/70 shadow-[0_6px_20px_-4px_rgba(220,38,38,0.7),0_2px_8px_-2px_rgba(220,38,38,0.45),inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-5px_10px_-6px_rgba(127,29,29,0.65)] animate-[bottom-nav-pop_0.4s_ease-out_both]"
                      : "text-slate-400"
                  }`}
                >
                  <Icon
                    className="h-6 w-6 transition-all duration-300"
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 top-0 h-1/2 rounded-full bg-gradient-to-b from-white/50 to-transparent"
                    />
                  )}
                </span>
                <span
                  className={`text-[11px] leading-none transition-colors duration-300 ${
                    active ? "font-semibold text-red-600" : "font-medium text-slate-400"
                  }`}
                >
                  {tab.label}
                </span>
              </>
            );

            const itemClass =
              "flex flex-col items-center gap-1 pt-1 pb-0.5 select-none active:scale-90 transition-transform duration-200";
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
        </div>
      </nav>

      {isScanOpen && <QrScannerModal onClose={() => setIsScanOpen(false)} />}
    </>
  );
}