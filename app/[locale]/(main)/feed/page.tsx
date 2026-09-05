"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import CommunityHighlights from "@/components/social/CommunityHighlights";
import CommunityRightRail from "@/components/social/CommunityRightRail";
import CommunitySidebar from "@/components/social/CommunitySidebar";
import FeedList from "@/components/social/FeedList";

export default function FeedPage() {
  const t = useTranslations("social");
  const locale = useLocale();
  const [items, setItems] = useState<any[]>([]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#fff1f2_0,_#f8fafc_34rem,_#f8fafc_100%)]">
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[220px_minmax(0,680px)] lg:gap-6 lg:py-8 xl:grid-cols-[220px_minmax(0,680px)_280px] xl:px-8">
        <CommunitySidebar />

        <section className="min-w-0">
          <header className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-600">{t("title")}</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                <Users className="h-6 w-6 text-red-600 sm:h-7 sm:w-7" />
                {t("communityFeedHeading")}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">{t("subtitle")}</p>
            </div>
            <Link href={`/${locale}/request`} className="hidden shrink-0 items-center gap-1.5 rounded-2xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20 transition-colors hover:bg-red-700 sm:inline-flex">
              {t("requestBlood")}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </header>

          <div className="mb-4 flex sm:hidden">
            <Link href={`/${locale}/request`} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-red-500/20">
              {t("requestBlood")}<ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mb-4 sm:mb-5">
            <CommunityHighlights items={items} />
          </div>
          <FeedList onItemsChange={setItems} />
        </section>

        <CommunityRightRail />
      </div>
    </main>
  );
}
