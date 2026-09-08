"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Loader2,
  Users,
  Newspaper,
  Droplet,
  Megaphone,
  Flame,
} from "lucide-react";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/authStore";
import { serverGetFeed } from "@/lib/db-actions";
import FeedComposer from "./FeedComposer";
import FeedPostCard from "./FeedPostCard";
import FeedStories from "./FeedStories";
import RequestCard from "@/components/requests/RequestCard";

const TABS = [
  { key: "all", icon: Flame, labelKey: "tabs_all" },
  { key: "updates", icon: Newspaper, labelKey: "tabs_updates" },
  { key: "requests", icon: Droplet, labelKey: "tabs_requests" },
  { key: "announcements", icon: Megaphone, labelKey: "tabs_announcements" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type FeedListProps = {
  onItemsChange?: (items: any[]) => void;
};

export default function FeedList({ onItemsChange }: FeedListProps) {
  const t = useTranslations("social");
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === "admin" || role === "super_admin";
  const currentUser = user
    ? { id: Number(user.id), role: user.role || role || "" }
    : null;

  const [tab, setTab] = useState<TabKey>("all");
  const [items, setItems] = useState<any[]>([]);
  const itemsRef = useRef<any[]>([]);
  const onItemsChangeRef = useRef(onItemsChange);
  onItemsChangeRef.current = onItemsChange;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerMode, setComposerMode] = useState<"general" | "donation">(
    "general",
  );

  const PAGE = 15;

  const load = useCallback(
    async (nextOffset: number, replace: boolean, currentTab: TabKey) => {
      setLoadingMore(!replace);
      if (replace) setLoading(true);
      try {
        const res = await serverGetFeed({
          filter: currentTab,
          offset: nextOffset,
          limit: PAGE,
        });
        const nextItems = replace
          ? (res.items as any[])
          : [...itemsRef.current, ...(res.items as any[])];
        itemsRef.current = nextItems;
        setItems(nextItems);
        onItemsChangeRef.current?.(nextItems);
        setHasMore(res.hasMore);
        setOffset(nextOffset + PAGE);
      } catch {
        /* ignore */
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [],
  );

  useEffect(() => {
    load(0, true, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("share") === "donation") setComposerMode("donation");
  }, []);

  const handlePosted = () => {
    setComposerMode("general");
    load(0, true, tab);
  };

  const handleDeleted = (id: number) => {
    const nextItems = itemsRef.current.filter((it) => it.id !== id);
    itemsRef.current = nextItems;
    setItems(nextItems);
    onItemsChangeRef.current?.(nextItems);
  };

  // Build stories from unique post authors
  const stories = useMemo(() => {
    const seen = new Set<number>();
    const result: { id: string | number; name: string; avatarUrl: string | null; initials: string }[] = [];
    for (const it of items) {
      if (it.kind !== "post") continue;
      if (seen.has(it.authorId)) continue;
      seen.add(it.authorId);
      result.push({
        id: it.authorId,
        name: it.authorName,
        avatarUrl: it.authorAvatarUrl || null,
        initials: it.authorName
          ?.split(" ")
          .map((p: string) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase() || "U",
      });
    }
    return result;
  }, [items]);

  return (
    <div className="space-y-0">
      {/* Composer */}
      <FeedComposer
        currentUser={currentUser}
        onPosted={handlePosted}
        initialMode={composerMode}
      />

      {/* Stories row — Instagram-style, only on mobile */}
      <div className="md:hidden">
        <FeedStories stories={stories} />
      </div>

      {/* Instagram-style segmented tabs — sticky on mobile */}
      <div className="sticky top-[56px] md:top-[60px] z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center px-2 sm:px-0">
          {TABS.map(({ key, icon: Icon, labelKey }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
                  active
                    ? "text-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t(labelKey)}</span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-red-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed items */}
      {loading ? (
        <div className="space-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} lines={4} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-100 sm:border-transparent sm:shadow-sm rounded-2xl p-10 text-center text-slate-400 text-sm">
          {t("noPosts")}
        </div>
      ) : (
        <div className="space-y-0">
          {items.map((it) =>
            it.kind === "request" ? (
              <RequestCard
                key={it.id}
                request={{
                  id: it.requestId,
                  patient_name: it.authorName,
                  blood_group: it.bloodGroup,
                  hospital_name: it.hospitalName,
                  district: it.district,
                  upazila: it.upazila,
                  urgency_level: it.urgency,
                  when_needed: it.whenNeeded,
                  needed_date: it.neededDate,
                  needed_time: it.neededTime,
                  created_at: it.createdAt,
                  units_needed: it.units,
                  reason: it.reason,
                  contact_number: it.contactNumber,
                  is_last_chance: it.isLastChance,
                  status: it.status,
                  current_status: it.status,
                }}
              />
            ) : (
              <FeedPostCard
                key={it.id}
                post={it}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onDeleted={handleDeleted}
                onChanged={() => load(0, true, tab)}
              />
            ),
          )}

          {hasMore && (
            <button
              onClick={() => load(offset, false, tab)}
              disabled={loadingMore}
              className="w-full py-4 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                t("loadMore")
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
