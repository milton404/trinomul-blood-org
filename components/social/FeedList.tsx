"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect, useCallback, useRef } from "react";
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
import { serverGetFeed, serverGetStories, serverGetMyAvatarInfo } from "@/lib/db-actions";
import FeedComposer from "./FeedComposer";
import FeedPostCard from "./FeedPostCard";
import FeedStories from "./FeedStories";
import FeedStoryViewer, {
  type FeedStory,
} from "./FeedStoryViewer";
import FeedStoryComposer from "./FeedStoryComposer";
import NotificationSubscribeButton from "./NotificationSubscribeButton";
import RequestCard from "@/components/requests/RequestCard";

const TABS = [
  { key: "all", icon: Flame, labelKey: "tabs_all" },
  { key: "updates", icon: Newspaper, labelKey: "tabs_updates" },
  { key: "requests", icon: Droplet, labelKey: "tabs_requests" },
  { key: "announcements", icon: Megaphone, labelKey: "tabs_announcements" },
] as const;

type TabKey = (typeof TABS)[number]["key"];


function initialsOf(name: string): string {
  return (
    (name || "")
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}


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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStoryIdx, setViewerStoryIdx] = useState(0);
  const [stories, setStories] = useState<FeedStory[]>([]);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [myAvatar, setMyAvatar] = useState<{ avatarUrl: string | null; name: string } | null>(null);

  const PAGE = 15;

  useEffect(() => {
    if (!user) return;
    serverGetMyAvatarInfo()
      .then((info) => setMyAvatar(info as any))
      .catch(() => {});
  }, [user]);

  const loadStories = useCallback(async () => {
    try {
      const rows = (await serverGetStories()) as any[];
      const byAuthor = new Map<number, FeedStory>();
      for (const r of rows) {
        const authorId = Number(r.author_id);
        let st = byAuthor.get(authorId);
        if (!st) {
          st = {
            id: authorId,
            name: r.author_name || "User",
            avatarUrl: r.author_avatar_url || null,
            initials: initialsOf(r.author_name || ""),
            slides: [],
          };
          byAuthor.set(authorId, st);
        }
        st.slides.push({
          id: String(r.id),
          imageUrl: r.image_url || null,
          content: r.content || "",
          createdAt: r.created_at,
        });
      }
      setStories(Array.from(byAuthor.values()).filter((s) => s.slides.length > 0));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

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

  const handleStoryPosted = () => {
    loadStories();
  };

  const goLogin = () => {
    window.location.href = `/${locale}/login?redirect=/${locale}/feed`;
  };

  const myHasStory = currentUser ? stories.some((s) => s.id === Number(user?.id)) : false;
  const lowResAvatar = (url: string | null | undefined): string | null => {
    if (!url) return null;
    return url.replace(/\/image\/upload\//, "/image/upload/w_64,h_64,c_fill,q_auto,f_auto/");
  };
  const myInitials = myAvatar?.name
    ? myAvatar.name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
    : "U";

  const youStory = {
    onClick: currentUser ? () => setStoryComposerOpen(true) : goLogin,
    avatarUrl: currentUser ? lowResAvatar(myAvatar?.avatarUrl) : null,
    initials: currentUser ? myInitials : "You",
    hasStory: myHasStory,
    label: t("yourStory"),
  };

  const storyAuthorIds = new Set(stories.map((s) => Number(s.id)));

  return (
    <div className="space-y-0">
      {/* Composer */}
      <FeedComposer
        currentUser={currentUser}
        onPosted={handlePosted}
        initialMode={composerMode}
      />

      {/* Notifications + Stories row — Instagram-style */}
      <div className="md:hidden">
        <div className="flex items-center justify-end px-3 sm:px-4 pt-2">
          <NotificationSubscribeButton />
        </div>
        <FeedStories
          stories={stories}
          youStory={youStory}
          onStoryPress={(s) => {
            const idx = stories.findIndex((x) => x.id === s.id);
            setViewerStoryIdx(idx >= 0 ? idx : 0);
            setViewerOpen(true);
          }}
        />
      </div>

      {viewerOpen && (
        <FeedStoryViewer
          stories={stories}
          startIndex={viewerStoryIdx}
          onClose={() => setViewerOpen(false)}
        />
      )}

      <FeedStoryComposer
        open={storyComposerOpen}
        onClose={() => setStoryComposerOpen(false)}
        onPosted={handleStoryPosted}
      />

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
                authorHasStory={storyAuthorIds.has(Number(it.authorId))}
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
