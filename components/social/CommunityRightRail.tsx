"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, HeartPulse, ShieldAlert, Trophy, UsersRound } from "lucide-react";

export default function CommunityRightRail() {
  const locale = useLocale();
  const t = useTranslations("social");

  return (
    <aside className="hidden xl:block xl:sticky xl:top-24 xl:self-start">
      <div className="space-y-3">
        <Link href={`/${locale}/request`} className="block rounded-3xl bg-gradient-to-br from-red-600 to-rose-700 p-4 text-white shadow-lg shadow-red-600/20 transition-transform hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-3">
            <ShieldAlert className="h-5 w-5 text-red-100" />
            <ArrowRight className="h-4 w-4 text-white/70" />
          </div>
          <p className="mt-5 text-sm font-black">{t("emergencyTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/75">{t("emergencyDescription")}</p>
        </Link>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <HeartPulse className="h-4 w-4 text-rose-600" />
            <h2 className="text-sm font-black">{t("discoverTitle")}</h2>
          </div>
          <div className="mt-3 space-y-2">
            <Link href={`/${locale}/requests`} className="flex items-center justify-between rounded-2xl bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100">
              {t("activeRequestsLink")}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href={`/${locale}/donors`} className="flex items-center justify-between rounded-2xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
              {t("findDonorsLink")}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href={`/${locale}/leaderboard`} className="flex items-center justify-between rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-100">
              <span className="flex items-center gap-2"><Trophy className="h-3.5 w-3.5" />{t("impactLink")}</span><ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-slate-950 p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 text-emerald-300"><UsersRound className="h-4 w-4" /><h2 className="text-sm font-black">{t("impactTitle")}</h2></div>
          <p className="mt-3 text-xs leading-relaxed text-white/65">{t("impactDescription")}</p>
        </div>
      </div>
    </aside>
  );
}
