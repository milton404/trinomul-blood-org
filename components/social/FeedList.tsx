"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Users, Newspaper, Droplet, Megaphone } from "lucide-react";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/authStore";
import { serverGetFeed } from "@/lib/db-actions";
import FeedComposer from "./FeedComposer";
import FeedPostCard from "./FeedPostCard";
import RequestCard from "@/components/requests/RequestCard";

const TABS = [
  { key: "all", icon: Users },
  { key: "updates", icon: Newspaper },
  { key: "requests", icon: Droplet },
  { key: "announcements", icon: Megaphone },
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

  // Initial load + reload when tab changes.
  useEffect(() => {
    load(0, true, tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Open composer in donation mode when arriving from a profile "share".
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

  return (
    <div className="space-y-4">
      {/* Always-visible posting bar (FB-style).
          FeedComposer itself handles the logged-out case with a login prompt,
          and the logged-in case with the full composer + Cloudinary image upload. */}
      <FeedComposer
        currentUser={currentUser}
        onPosted={handlePosted}
        initialMode={composerMode}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === key
                ? "bg-red-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {t(`tabs_${key}`)}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} lines={4} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          {t("noPosts")}
        </div>
      ) : (
        <div className="space-y-4">
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
              className="w-full py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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
