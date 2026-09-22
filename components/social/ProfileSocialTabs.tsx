"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { Bell, FileText, Bookmark, Heart, MessageCircle, Loader2, CheckCheck, Droplets, PhoneCall, MapPin, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatTimeAgo } from "@/lib/format-time";
import { useAuthStore } from "@/store/authStore";
import FeedPostCard from "@/components/social/FeedPostCard";
import {
  serverGetMyNotifications,
  serverMarkAllNotificationsRead,
  serverMarkNotificationRead,
  serverGetMyPosts,
  serverGetSavedPosts,
  serverGetMyMatchRequests,
  serverRespondToMatchRequest,
} from "@/lib/db-actions";

type Tab = "notifications" | "posts" | "saved" | "requests";

function initialsOf(name: string): string {
  return (name || "").split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "U";
}

export default function ProfileSocialTabs() {
  const locale = useLocale();
  const isBn = locale === "bn";
  const { user, role } = useAuthStore();
  const currentUser = user ? { id: Number(user.id), role: user.role || role || "" } : null;
  const isAdmin = role === "admin" || role === "super_admin";

  const isDonor = role === "donor";
  const [tab, setTab] = useState<Tab>("notifications");
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [matchRequests, setMatchRequests] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await serverGetMyNotifications()) as any[];
      setNotifications(rows || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadMyPosts = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await serverGetMyPosts()) as any[];
      setMyPosts(rows || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await serverGetSavedPosts()) as any[];
      setSavedPosts(rows || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadMatchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const rows = (await serverGetMyMatchRequests()) as any[];
      setMatchRequests(rows || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "notifications") loadNotifications();
    else if (tab === "posts") loadMyPosts();
    else if (tab === "saved") loadSaved();
    else if (tab === "requests") loadMatchRequests();
  }, [tab, loadNotifications, loadMyPosts, loadSaved, loadMatchRequests]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const pendingMatchCount = matchRequests.filter(
    (m) => m.response_status === "pending" && m.request_status === "active",
  ).length;

  const handleRespond = async (requestId: number, status: "accepted" | "declined") => {
    setRespondingId(requestId);
    try {
      await serverRespondToMatchRequest(requestId, status);
      setMatchRequests((prev) =>
        prev.map((m) =>
          m.request_id === requestId
            ? { ...m, response_status: status, responded_at: new Date().toISOString() }
            : m,
        ),
      );
    } catch { /* ignore */ }
    setRespondingId(null);
  };

  const handleMarkAllRead = async () => {
    setBusy(true);
    try {
      await serverMarkAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch { /* ignore */ }
    setBusy(false);
  };

  const handleNotifClick = async (id: number) => {
    try {
      await serverMarkNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    } catch { /* ignore */ }
  };

  const TABS: { key: Tab; icon: typeof Bell; label: string }[] = [
    { key: "notifications", icon: Bell, label: isBn ? "নোটিফিকেশন" : "Notifications" },
    ...(isDonor
      ? [{ key: "requests" as Tab, icon: Droplets, label: isBn ? "রক্তের অনুরোধ" : "Requests" }]
      : []),
    { key: "posts", icon: FileText, label: isBn ? "আমার পোস্ট" : "My Posts" },
    { key: "saved", icon: Bookmark, label: isBn ? "সংরক্ষিত" : "Saved" },
  ];

  const emptyText = (k: Tab) =>
    k === "notifications"
      ? isBn ? "কোনো নোটিফিকেশন নেই" : "No notifications yet"
      : k === "requests"
        ? isBn ? "আপনাকে কোনো রক্তের অনুরোধ করা হয়নি" : "No blood requests matched to you yet"
        : k === "posts"
          ? isBn ? "আপনার কোনো পোস্ট নেই" : "You haven't posted anything yet"
          : isBn ? "কোনো সংরক্ষিত পোস্ট নেই" : "No saved posts yet";

  return (
    <div className="mt-8 bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Tab header */}
      <div className="flex items-center border-b border-slate-100">
        {TABS.map(({ key, icon: Icon, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors ${
                active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {key === "notifications" && unreadCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
              {key === "requests" && pendingMatchCount > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold">
                  {pendingMatchCount}
                </span>
              )}
              {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-red-600 rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Mark all read */}
      {tab === "notifications" && unreadCount > 0 && (
        <div className="flex justify-end px-4 py-2 border-b border-slate-100">
          <button
            onClick={handleMarkAllRead}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {isBn ? "সব পঠিত" : "Mark all read"}
          </button>
        </div>
      )}

      <div className="max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-red-600" />
          </div>
        ) : tab === "notifications" ? (
          notifications.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">{emptyText("notifications")}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => {
                const actorName = n.actor_name || (isBn ? "কেউ" : "Someone");
                const isLike = n.type === "like";

                const row = (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="shrink-0">
                      {n.actor_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.actor_avatar_url} alt={actorName} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-xs">
                          {initialsOf(actorName)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold">{actorName}</span>{" "}
                        {isLike
                          ? isBn ? "আপনার পোস্ট লাইক করেছেন" : "liked your post"
                          : isBn ? "আপনার পোস্টে মন্তব্য করেছেন" : "commented on your post"}
                      </p>
                      {n.content && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">&ldquo;{n.content}&rdquo;</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatTimeAgo(n.created_at, locale)}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full ${isLike ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"}`}>
                      {isLike ? <Heart className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    </span>
                    {!n.is_read && <span className="shrink-0 h-2 w-2 rounded-full bg-red-600" />}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.post_id ? (
                      <Link href={`/feed/${n.post_id}`} onClick={() => handleNotifClick(n.id)} className="block hover:bg-slate-50 transition-colors">
                        {row}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => handleNotifClick(n.id)} className="block w-full text-left hover:bg-slate-50 transition-colors">
                        {row}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        ) : tab === "requests" ? (
          matchRequests.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">{emptyText("requests")}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {matchRequests.map((m) => {
                const isPending = m.response_status === "pending";
                const isActive = m.request_status === "active";
                const canRespond = isPending && isActive;
                const urgencyLabel =
                  m.urgency_level === "critical"
                    ? isBn ? "জরুরি" : "Critical"
                    : m.urgency_level === "urgent"
                      ? isBn ? "তাড়াতাড়ি" : "Urgent"
                      : isBn ? "সাধারণ" : "Normal";
                const urgencyCls =
                  m.urgency_level === "critical"
                    ? "bg-red-600 text-white"
                    : m.urgency_level === "urgent"
                      ? "bg-orange-500 text-white"
                      : "bg-slate-100 text-slate-600";
                const statusLabel =
                  m.request_status === "fulfilled"
                    ? isBn ? "পূর্ণ হয়েছে" : "Fulfilled"
                    : m.request_status === "expired"
                      ? isBn ? "মেয়াদ শেষ" : "Expired"
                      : m.request_status === "cancelled"
                        ? isBn ? "বাতিল" : "Cancelled"
                        : null;
                const whenText = [m.needed_date, m.needed_time].filter(Boolean).join(" ") ||
                  (m.when_needed === "now" ? (isBn ? "এখনই" : "Now") : m.when_needed || "");

                return (
                  <div key={m.request_id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-600 text-white text-xs font-bold">
                          <Droplets className="w-3.5 h-3.5" />
                          {m.blood_group}
                        </span>
                        <span className={`px-2 py-1 rounded-md text-[11px] font-semibold ${urgencyCls}`}>
                          {urgencyLabel}
                        </span>
                        {m.match_rank > 0 && (
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-[11px] font-semibold">
                            {isBn ? `ম্যাচ #${m.match_rank}` : `Match #${m.match_rank}`}
                          </span>
                        )}
                      </div>
                      {statusLabel && (
                        <span className="text-[11px] font-semibold text-slate-400">{statusLabel}</span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-900">
                      {m.patient_name}
                      <span className="font-normal text-slate-500">
                        {" "}{isBn ? "প্রয়োজন" : "needs"} {m.units_needed || 1} {isBn ? "ইউনিট" : "unit(s)"}
                      </span>
                    </p>

                    {m.hospital_name && (
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {m.hospital_name}
                          {m.hospital_address ? `, ${m.hospital_address}` : ""}
                          {m.upazila || m.district ? ` — ${[m.upazila, m.district].filter(Boolean).join(", ")}` : ""}
                        </span>
                      </p>
                    )}

                    {whenText && (
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        {whenText}
                      </p>
                    )}

                    {m.contact_number && (
                      <a
                        href={`tel:${m.contact_number}`}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        {m.contact_number}
                      </a>
                    )}

                    <div className="mt-3">
                      {canRespond ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleRespond(m.request_id, "accepted")}
                            disabled={respondingId === m.request_id}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {isBn ? "গ্রহণ করুন" : "Accept"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespond(m.request_id, "declined")}
                            disabled={respondingId === m.request_id}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            {isBn ? "প্রত্যাখ্যান" : "Decline"}
                          </button>
                        </div>
                      ) : m.response_status === "accepted" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          {isBn ? "আপনি গ্রহণ করেছেন" : "You accepted"}
                        </span>
                      ) : m.response_status === "declined" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <XCircle className="w-4 h-4" />
                          {isBn ? "আপনি প্রত্যাখ্যান করেছেন" : "You declined"}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {isBn ? "অপেক্ষমান" : "Awaiting response"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : tab === "posts" ? (
          myPosts.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">{emptyText("posts")}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {myPosts.map((p) => (
                <FeedPostCard
                  key={p.id}
                  post={p}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  onDeleted={(id) => setMyPosts((prev) => prev.filter((x) => x.id !== id))}
                  onChanged={loadMyPosts}
                />
              ))}
            </div>
          )
        ) : savedPosts.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">{emptyText("saved")}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {savedPosts.map((p) => (
              <FeedPostCard
                key={p.id}
                post={p}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onDeleted={(id) => setSavedPosts((prev) => prev.filter((x) => x.id !== id))}
                onChanged={loadSaved}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}