"use client";

import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import Navbar from "@/components/common/Navbar";
import FeedList from "@/components/social/FeedList";

export default function FeedPage() {
  const t = useTranslations("social");

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#fff1f2_0,_#f8fafc_34rem,_#f8fafc_100%)]">
        <div className="mx-auto w-full max-w-[680px] px-3 py-5 sm:px-5 lg:py-8">
          <header className="mb-4 sm:mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-600">
              {t("title")}
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              <Users className="h-6 w-6 text-red-600 sm:h-7 sm:w-7" />
              {t("communityFeedHeading")}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">{t("subtitle")}</p>
          </header>

          {/* Facebook-style centered feed: composer + filter tabs + posts & requests */}
          <FeedList />
        </div>
      </main>
    </>
  );
}
