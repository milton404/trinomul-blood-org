"use client";

import { useTranslations, useLocale } from "next-intl";
import { useState, useEffect } from "react";
import { ListSkeleton } from "@/components/ui/Skeleton";
import {
  Loader2,
  Pin,
  PinOff,
  Trash2,
  Users,
  RefreshCw,
} from "lucide-react";
import {
  serverAdminGetPosts,
  serverPinPost,
  serverAdminDeletePost,
} from "@/lib/db-actions";
import { formatPostedAt } from "@/lib/format-time";

type Filter = "all" | "pinned" | "deleted";

export default function AdminSocialPage() {
  const t = useTranslations("social");
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await serverAdminGetPosts({ filter });
      setItems(res.items as any[]);
    } catch (e: any) {
      setError(e.message || t("error"));
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handlePin = async (id: number, pinned: boolean) => {
    setBusyId(id);
    try {
      await serverPinPost(id, !pinned);
      load();
    } catch (e: any) {
      alert(e.message || t("error"));
    }
    setBusyId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("deleteConfirm"))) return;
    setBusyId(id);
    try {
      await serverAdminDeletePost(id);
      load();
    } catch (e: any) {
      alert(e.message || t("error"));
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-red-600" />
          {t("adminTitle")}
        </h1>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          {t("refresh")}
        </button>
      </div>

      <div className="flex gap-1">
        {(["all", "pinned", "deleted"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              filter === f
                ? "bg-red-600 text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {t(`adminFilter_${f}`)}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          {t("noPosts")}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((post: any) => (
            <div
              key={post.id}
              className={`bg-white rounded-xl border p-4 ${
                post.status === "deleted"
                  ? "border-slate-200 opacity-60"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">
                      {post.authorName}
                    </span>
                    {post.pinned && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                        <Pin className="w-3 h-3" />
                        {t("pinned")}
                      </span>
                    )}
                    {post.postType !== "general" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {post.postType}
                      </span>
                    )}
                    {post.status === "deleted" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                        {t("deleted")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words line-clamp-3">
                    {post.content || (
                      <span className="text-slate-400 italic">
                        {t("noContent")}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                    <span>{formatPostedAt(post.createdAt)}</span>
                    <span>♥ {post.likeCount}</span>
                    <span>💬 {post.commentCount}</span>
                    <span>↗ {post.shareCount}</span>
                  </div>
                </div>

                {post.status !== "deleted" && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePin(post.id, post.pinned)}
                      disabled={busyId === post.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-amber-50 disabled:opacity-50"
                    >
                      {post.pinned ? (
                        <PinOff className="w-3.5 h-3.5" />
                      ) : (
                        <Pin className="w-3.5 h-3.5" />
                      )}
                      {post.pinned ? t("unpin") : t("pin")}
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={busyId === post.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("delete")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
