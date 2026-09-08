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
      <main className="min-h-screen bg-slate-50 sm:bg-white">
        <div className="mx-auto w-full max-w-[680px]">
          {/* Instagram-style header — sticky, minimal */}
          <div className="sticky top-[56px] md:top-[60px] z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 sm:hidden">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-black tracking-tight text-slate-900">
                {t("community")}
              </p>
            </div>
          </div>

          <FeedList />
        </div>
      </main>
    </>
  );
}
