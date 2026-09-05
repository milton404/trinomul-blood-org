"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  Heart,
  MessageCircle,
  Share2,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  X,
  Loader2,
  Globe,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { formatPostedAt } from "@/lib/format-time";
import {
  serverToggleLike,
  serverAddComment,
  serverGetComments,
  serverDeletePost,
  serverUpdatePost,
  serverPinPost,
  serverSharePost,
} from "@/lib/db-actions";

type FeedPost = {
  kind: "post";
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  content: string;
  images: string[];
  postType: string;
  relatedRequestId: number | null;
  pinned: boolean;
  isPublic: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
  createdAt: string;
};

const ROLE_BADGE: Record<
  string,
  { en: string; bn: string; cls: string }
> = {
  donor: {
    en: "Donor",
    bn: "দাতা",
    cls: "bg-rose-50 text-rose-700 border border-rose-200",
  },
  patient: {
    en: "Requester",
    bn: "অনুরোধকারী",
    cls: "bg-sky-50 text-sky-700 border border-sky-200",
  },
  hospital: {
    en: "Hospital",
    bn: "হাসপাতাল",
    cls: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  admin: {
    en: "Admin",
    bn: "অ্যাডমিন",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  super_admin: {
    en: "Admin",
    bn: "অ্যাডমিন",
    cls: "bg-amber-50 text-amber-700 border border-amber-200",
  },
};

const POST_TYPE_BADGE: Record<string, { en: string; bn: string; cls: string }> = {
  admin_announcement: {
    en: "Announcement",
    bn: "ঘোষণা",
    cls: "bg-amber-100 text-amber-800 border border-amber-300",
  },
  donation_update: {
    en: "Donation Update",
    bn: "রক্তদান আপডেট",
    cls: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  },
  blood_request: {
    en: "Request",
    bn: "অনুরোধ",
    cls: "bg-red-100 text-red-700 border border-red-300",
  },
  general: { en: "Post", bn: "পোস্ট", cls: "" },
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function FeedPostCard({
  post,
  currentUser,
  isAdmin,
  onDeleted,
  onChanged,
}: {
  post: FeedPost;
  currentUser: { id: number; role: string } | null;
  isAdmin: boolean;
  onDeleted: (id: number) => void;
  onChanged: () => void;
}) {
  const t = useTranslations("social");
  const locale = useLocale();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [shareCount, setShareCount] = useState(post.shareCount);
  const [liking, setLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [images, setImages] = useState<string[]>(post.images || []);
  const [isPublic, setIsPublic] = useState(post.isPublic);
  const [busy, setBusy] = useState(false);

  const canModify =
    currentUser && (currentUser.id === post.authorId || isAdmin);
  const roleBadge = ROLE_BADGE[post.authorRole] || ROLE_BADGE.donor;
  const typeBadge = POST_TYPE_BADGE[post.postType] || POST_TYPE_BADGE.general;

  const handleLike = async () => {
    if (!currentUser) return;
    if (liking) return;
    setLiking(true);
    const prev = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try {
      const res = await serverToggleLike(post.id);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      setLiked(prev);
      setLikeCount(prevCount);
    }
    setLiking(false);
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setShowComments(true);
    if (comments.length) return;
    setLoadingComments(true);
    try {
      const rows = await serverGetComments(post.id);
      setComments(rows as any[]);
    } catch {
      /* ignore */
    }
    setLoadingComments(false);
  };

  const handleComment = async () => {
    if (!currentUser) return;
    const text = commentText.trim();
    if (!text || submittingComment) return;
    setSubmittingComment(true);
    try {
      await serverAddComment(post.id, text);
      setCommentText("");
      const rows = await serverGetComments(post.id);
      setComments(rows as any[]);
    } catch {
      /* ignore */
    }
    setSubmittingComment(false);
  };

  const handleDelete = async () => {
    if (!confirm(t("deleteConfirm"))) return;
    setBusy(true);
    try {
      await serverDeletePost(post.id);
      onDeleted(post.id);
    } catch (e: any) {
      alert(e.message || t("error"));
    }
    setBusy(false);
  };

  const handleSaveEdit = async () => {
    setBusy(true);
    try {
      await serverUpdatePost(post.id, {
        content: editText.trim(),
        images,
        isPublic,
      });
      setEditing(false);
      onChanged();
    } catch (e: any) {
      alert(e.message || t("error"));
    }
    setBusy(false);
  };

  const handleToggleImages = (url: string) =>
    setImages((prev) => prev.filter((u) => u !== url));

  const handlePin = async () => {
    setBusy(true);
    try {
      await serverPinPost(post.id, !post.pinned);
      onChanged();
    } catch (e: any) {
      alert(e.message || t("error"));
    }
    setBusy(false);
  };

  const handleShare = async () => {
    if (!currentUser) return;
    try {
      await serverSharePost(post.id);
      setShareCount((c) => c + 1);
    } catch {
      /* ignore */
    }
    const url = `${window.location.origin}/${locale}/feed`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Trinomul Blood Bank", url });
        return;
      } catch {
        /* fall back to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      alert(t("linkCopied"));
    } catch {
      /* ignore */
    }
  };

  return (
    <article
      className={`bg-white rounded-2xl border shadow-sm transition-all ${
        post.pinned ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold shrink-0">
          {initials(post.authorName || "U")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 truncate">
              {post.authorName}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleBadge.cls}`}
            >
              {locale === "bn" ? roleBadge.bn : roleBadge.en}
            </span>
            {typeBadge.cls && post.postType !== "general" && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${typeBadge.cls}`}
              >
                {locale === "bn" ? typeBadge.bn : typeBadge.en}
              </span>
            )}
            {post.pinned && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                <Pin className="w-3 h-3" />
                {t("pinned")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span>{formatPostedAt(post.createdAt)}</span>
            {post.isPublic ? (
              <span className="inline-flex items-center gap-0.5">
                <Globe className="w-3 h-3" />
                {t("public")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5">
                <Lock className="w-3 h-3" />
                {t("private")}
              </span>
            )}
          </div>
        </div>

        {/* Manage menu (author + admin) */}
        {canModify && !editing && (
          <div className="flex items-center gap-1 shrink-0">
            {!isAdmin && (
              <button
                onClick={() => setEditing(true)}
                title={t("edit")}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDelete}
              title={t("delete")}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        {isAdmin && !editing && (
          <button
            onClick={handlePin}
            disabled={busy}
            title={post.pinned ? t("unpin") : t("pin")}
            className={`p-1.5 rounded-lg hover:bg-amber-50 ${
              post.pinned ? "text-amber-600" : "text-slate-400"
            }`}
          >
            {post.pinned ? (
              <PinOff className="w-4 h-4" />
            ) : (
              <Pin className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-2">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-400 outline-none text-sm resize-none"
            />
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((u) => (
                  <div key={u} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleToggleImages(u)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              {isPublic ? t("public") : t("private")}
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("save")}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditText(post.content);
                  setImages(post.images || []);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
              {post.content}
            </p>
          )
        )}

        {!editing && images.length > 0 && (
          <div
            className={`mt-3 grid gap-2 ${
              images.length === 1
                ? "grid-cols-1"
                : images.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
            }`}
          >
            {images.map((u) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl border border-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u}
                  alt=""
                  className="w-full h-40 sm:h-56 object-cover hover:scale-[1.02] transition-transform"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-4 py-2 flex items-center gap-1 border-t border-slate-100">
        <button
          onClick={handleLike}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            liked ? "text-rose-600 bg-rose-50" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-rose-600" : ""}`} />
          {likeCount > 0 ? likeCount : t("like")}
        </button>
        <button
          onClick={loadComments}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          <MessageCircle className="w-4 h-4" />
          {post.commentCount > 0 ? post.commentCount : t("comment")}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          <Share2 className="w-4 h-4" />
          {shareCount > 0 ? shareCount : t("share")}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          {currentUser ? (
            <div className="flex items-center gap-2 pt-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                placeholder={t("writeComment")}
                className="flex-1 px-3 py-2 rounded-full border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-red-300"
              />
              <button
                onClick={handleComment}
                disabled={submittingComment || !commentText.trim()}
                className="px-3 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {submittingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("send")
                )}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-2">{t("loginToComment")}</p>
          )}

          <div className="mt-3 space-y-2">
            {loadingComments && (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400 mx-auto" />
            )}
            {!loadingComments && comments.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-1">
                {t("noComments")}
              </p>
            )}
            {comments.map((c: any) => (
              <div key={c.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {initials(c.author_name || "U")}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      {c.author_name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatPostedAt(c.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
