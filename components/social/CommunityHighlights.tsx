"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowUpRight, Droplet, Megaphone, Sparkles } from "lucide-react";

type HighlightItem = {
  id: number;
  kind?: string;
  authorName?: string;
  authorRole?: string;
  postType?: string;
  content?: string;
  bloodGroup?: string;
  urgency?: string;
};

export default function CommunityHighlights({ items }: { items: HighlightItem[] }) {
  const locale = useLocale();
  const t = useTranslations("social");
  const highlights = items
    .filter((item) => item.kind === "post" || item.kind === "request")
    .slice(0, 6);

  return (
    <section aria-labelledby="community-highlights" className="rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">{t("highlightsEyebrow")}</p>
          <h2 id="community-highlights" className="mt-1 text-sm font-black text-slate-900">{t("highlightsTitle")}</h2>
        </div>
        <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1" role="list">
        {highlights.length === 0 ? (
          <p className="px-1 py-4 text-xs text-slate-400">{t("noHighlights")}</p>
        ) : (
          highlights.map((item) => {
            const isRequest = item.kind === "request";
            const isAnnouncement = item.postType === "admin_announcement";
            return (
              <Link
                key={item.id}
                href={isRequest ? `/${locale}/requests` : `/${locale}/feed`}
                className="group min-w-[148px] flex-1 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-3 text-white shadow-sm transition-transform hover:-translate-y-0.5"
                role="listitem"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/12">
                    {isRequest ? <Droplet className="h-4 w-4 text-rose-300" /> : isAnnouncement ? <Megaphone className="h-4 w-4 text-amber-300" /> : <Sparkles className="h-4 w-4 text-emerald-300" />}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/45 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <p className="mt-4 line-clamp-2 text-xs font-bold leading-relaxed">
                  {isRequest ? `${item.bloodGroup || ""} ${t("bloodNeeded")}` : item.content || t("communityUpdate")}
                </p>
                <p className="mt-2 truncate text-[10px] text-white/55">{item.authorName || t("communityMember")}</p>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
