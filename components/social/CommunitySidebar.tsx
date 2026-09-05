"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { Compass, Droplets, HeartHandshake, Home, MapPinned, Users } from "lucide-react";

const LINKS = [
  { key: "feed", href: "/feed", icon: Home },
  { key: "findDonor", href: "/donors", icon: Users },
  { key: "requests", href: "/requests", icon: Droplets },
  { key: "map", href: "/map", icon: MapPinned },
  { key: "impact", href: "/leaderboard", icon: HeartHandshake },
] as const;

export default function CommunitySidebar() {
  const locale = useLocale();
  const t = useTranslations("social");

  return (
    <>
      {/* Mobile / tablet: horizontal scrollable nav */}
      <nav aria-label={t("communityNavigation")} className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 lg:hidden">
        {LINKS.map(({ key, href, icon: Icon }, index) => (
          <Link
            key={key}
            href={`/${locale}${href}`}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
              index === 0
                ? "bg-red-600 text-white shadow-md shadow-red-500/20"
                : "border border-slate-200 bg-white/90 text-slate-600 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t(`nav_${key}`)}
          </Link>
        ))}
      </nav>

      {/* Desktop: vertical sticky sidebar */}
      <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-sm">
          <p className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {t("communityNavigation")}
          </p>
          <nav aria-label={t("communityNavigation")} className="space-y-1">
            {LINKS.map(({ key, href, icon: Icon }, index) => (
              <Link
                key={key}
                href={`/${locale}${href}`}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors ${
                  index === 0
                    ? "bg-red-50 text-red-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(`nav_${key}`)}
              </Link>
            ))}
          </nav>
          <div className="mt-4 rounded-2xl bg-slate-950 p-3 text-white">
            <div className="mb-2 flex items-center gap-2 text-rose-300">
              <Compass className="h-4 w-4" />
              <span className="text-xs font-bold">{t("communityTipTitle")}</span>
            </div>
            <p className="text-xs leading-relaxed text-white/65">{t("communityTip")}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
