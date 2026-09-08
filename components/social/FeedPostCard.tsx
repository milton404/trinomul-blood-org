"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  Heart,
  MessageCircle,
  Share2,
  Ellipsis,
  Bookmark,

  Smile,
  X,
  Loader2,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Globe,
  Lock,
  Eye,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { formatTimeAgo } from "@/lib/format-time";
import {
  serverToggleLike,
  serverAddComment,
  serverGetComments,
  serverDeletePost,
  serverUpdatePost,
  serverPinPost,
  serverSharePost,
  serverToggleSave,
  serverIncrementPostView,
} from "@/lib/db-actions";
import ImageLightbox from "./ImageLightbox";


interface FeedPost {
  kind: "post";
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  authorAvatarUrl: string | null;
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
  saveCount: number;
  savedByMe: boolean;
  viewCount: number;
  createdAt: string;
}

const viewedPosts = new Set<number>();

const ROLE_BADGE: Record<string, { en: string; bn: string; cls: string }> = {
  donor: { en: "Donor", bn: "দাতা", cls: "bg-rose-50 text-rose-700 border border-rose-200" },
  patient: { en: "Requester", bn: "অনুরোধকারী", cls: "bg-sky-50 text-sky-700 border border-sky-200" },
  hospital: { en: "Hospital", bn: "হাসপাতাল", cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  admin: { en: "Admin", bn: "অ্যাডমিন", cls: "bg-amber-50 text-amber-700 border border-amber-300" },
  super_admin: { en: "Admin", bn: "অ্যাডমিন", cls: "bg-amber-50 text-amber-700 border border-amber-300" },
};

const POST_TYPE_BADGE: Record<string, { en: string; bn: string; cls: string }> = {
  admin_announcement: { en: "Announcement", bn: "ঘোষণা", cls: "bg-amber-100 text-amber-800 border border-amber-300" },
  donation_update: { en: "Donation Update", bn: "রক্তদান আপডেট", cls: "bg-emerald-100 text-emerald-800 border border-emerald-300" },
  blood_request: { en: "Request", bn: "অনুরোধ", cls: "bg-red-100 text-red-700 border border-red-300" },
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

function SmartImage({
  src,
  onTap,
  ariaLabel,
}: {
  src: string;
  onTap: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="block w-full cursor-pointer"
      aria-label={ariaLabel}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="block w-full h-auto"
      />
    </button>
  );
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
  const [saved, setSaved] = useState(post.savedByMe);
  const [saving, setSaving] = useState(false);
  const [viewCount, setViewCount] = useState(post.viewCount);
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
  const [showOptions, setShowOptions] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const imageTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const canModify = currentUser && (currentUser.id === post.authorId || isAdmin);
  const roleBadge = ROLE_BADGE[post.authorRole] || ROLE_BADGE.donor;
  const typeBadge = POST_TYPE_BADGE[post.postType] || POST_TYPE_BADGE.general;

  const goLogin = useCallback(() => {
    window.location.href = `/${locale}/login?redirect=/${locale}/feed`;
  }, [locale]);

  useEffect(() => {
    if (viewedPosts.has(post.id)) return;
    viewedPosts.add(post.id);
    setViewCount((c) => c + 1);
    serverIncrementPostView(post.id).catch(() => {});
  }, [post.id]);

  const handleLike = useCallback(async () => {
    if (!currentUser) {
      goLogin();
      return;
    }
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
  }, [currentUser, liking, liked, likeCount, post.id, goLogin]);

  const handleDoubleTapLike = () => {
    if (!currentUser) {
      goLogin();
      return;
    }
    if (!liked) {
      setDoubleTapLike(true);
      setTimeout(() => setDoubleTapLike(false), 500);
      handleLike();
    }
  };

  const handleImageTap = () => {
    if (imageTapTimer.current) {
      clearTimeout(imageTapTimer.current);
      imageTapTimer.current = null;
      handleDoubleTapLike();
      return;
    }
    imageTapTimer.current = setTimeout(() => {
      imageTapTimer.current = null;
      setLightboxIndex(0);
      setLightboxOpen(true);
    }, 280);
  };

  const openLightboxAt = (idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const loadComments = async () => {
    if (!currentUser) {
      goLogin();
      return;
    }
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
    if (!currentUser) {
      goLogin();
      return;
    }
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

  const handleSave = async () => {
    if (!currentUser) {
      goLogin();
      return;
    }
    if (saving) return;
    setSaving(true);
    const prev = saved;
    setSaved(!saved);
    try {
      const res = await serverToggleSave(post.id);
      setSaved(res.saved);
    } catch {
      setSaved(prev);
    }
    setSaving(false);
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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    if (showOptions) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showOptions]);

  const avatar = post.authorAvatarUrl ? (
    <img
      src={post.authorAvatarUrl}
      alt={post.authorName}
      className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover"
    />
  ) : (
    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm">
      {initials(post.authorName || "U")}
    </div>
  );

  const renderComments = () =>
    comments.slice(0, 2).map((c: any) => (
      <div key={c.id} className="flex items-start gap-2 py-1">
        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 shrink-0 mt-0.5">
          {initials(c.author_name || "U")}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-slate-800 mr-1.5">
            {c.author_name}
          </span>
          <span className="text-xs text-slate-700 break-words">{c.content}</span>
        </div>
      </div>
    ));

  const singleImage = images.length === 1;
  const hasImages = images.length > 0;

  return (
    <article className="bg-white border border-slate-100 sm:border-transparent sm:shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-slate-900 truncate">
              {post.authorName}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${roleBadge.cls}`}
            >
              {locale === "bn" ? roleBadge.bn : roleBadge.en}
            </span>
            {typeBadge.cls && post.postType !== "general" && (
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${typeBadge.cls}`}
              >
                {locale === "bn" ? typeBadge.bn : typeBadge.en}
              </span>
            )}
            {post.pinned && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                <Pin className="w-2.5 h-2.5" />
                {t("pinned")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            {post.isPublic ? (
              <span className="inline-flex items-center gap-0.5">
                <Globe className="w-2.5 h-2.5" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
              </span>
            )}
            <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
            <span>{formatTimeAgo(post.createdAt, locale)}</span>
            <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {viewCount}
            </span>
          </div>
        </div>

        {/* Options menu */}
        {canModify && !editing && (
          <div className="relative" ref={optionsRef}>
            <button
              onClick={() => setShowOptions((v) => !v)}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
              aria-label={t("options")}
            >
              <Ellipsis className="w-4 h-4" />
            </button>
            {showOptions && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-slate-200 py-1 min-w-[140px]">
                {!isAdmin && (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t("edit")}
                  </button>
                )}
                <button
                  onClick={() => {
                    handleDelete();
                    setShowOptions(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("delete")}
                </button>
                {isAdmin && (
                  <>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        handlePin();
                        setShowOptions(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                    >
                      {post.pinned ? (
                        <PinOff className="w-3.5 h-3.5" />
                      ) : (
                        <Pin className="w-3.5 h-3.5" />
                      )}
                      {post.pinned ? t("unpin") : t("pin")}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body — images */}
      {hasImages && !editing && (
        <div className="relative w-full">
          {singleImage ? (
            <SmartImage
              src={images[0]}
              onTap={handleImageTap}
              ariaLabel={t("like")}
            />
          ) : (
            <div className="relative overflow-hidden">
              <div
                className="flex transition-transform duration-300"
                style={{ transform: `translateX(-${currentImageIdx * 100}%)` }}
              >
                {images.map((u, i) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => openLightboxAt(i)}
                    className="relative aspect-[4/5] w-full shrink-0 cursor-pointer bg-black sm:aspect-square"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
              {images.length > 1 && (
                <>
                  {/* Dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIdx(i)}
                        className={`h-1.5 rounded-full transition-all duration-200 ${
                          i === currentImageIdx ? "w-5 bg-white" : "w-1.5 bg-white/60"
                        }`}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                  {/* Nav arrows on hover (desktop) */}
                  {currentImageIdx > 0 && (
                    <button
                      onClick={() => setCurrentImageIdx((i) => Math.max(0, i - 1))}
                      className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white items-center justify-center hover:bg-black/50 transition-colors"
                      aria-label="Previous"
                    >
                      <span className="text-lg">‹</span>
                    </button>
                  )}
                  {currentImageIdx < images.length - 1 && (
                    <button
                      onClick={() => setCurrentImageIdx((i) => Math.min(images.length - 1, i + 1))}
                      className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white items-center justify-center hover:bg-black/50 transition-colors"
                      aria-label="Next"
                    >
                      <span className="text-lg">›</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {/* Double-tap like animation */}
          {doubleTapLike && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="w-16 h-16 text-white fill-white animate-[heart-pop_0.6s_ease-out] drop-shadow-lg" />
            </div>
          )}
        </div>
      )}

      {/* Caption / Body */}
      <div className="px-3 sm:px-4 pt-3 pb-1.5">
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
                    <img
                      src={u}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setImages((prev) => prev.filter((x) => x !== u))}
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
            <p className="text-sm text-slate-800 leading-relaxed">
              <span className="font-semibold mr-1.5">{post.authorName}</span>
              <span className="break-words whitespace-pre-wrap">{post.content}</span>
            </p>
          )
        )}
      </div>

      {/* Action bar — Instagram style */}
      {!editing && (
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className="flex items-center justify-center w-9 h-9 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
              aria-label={liked ? t("unlike") : t("like")}
            >
              <Heart
                className={`w-6 h-6 transition-all duration-200 ${
                  liked ? "text-red-600 fill-red-600 scale-110" : "text-slate-700"
                }`}
              />
            </button>
            <button
              onClick={loadComments}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 transition-colors"
              aria-label={t("comment")}
            >
              <MessageCircle className="w-6 h-6 text-slate-700 rotate-flip" />
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 transition-colors"
              aria-label={t("share")}
            >
              <Share2 className="w-5.5 h-5.5 text-slate-700 -rotate-45" />
            </button>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 transition-colors"
            aria-label={t("save")}
          >
            <Bookmark
              className={`w-5.5 h-5.5 transition-all duration-200 ${
                saved ? "text-slate-900 fill-slate-900 scale-110" : "text-slate-700"
              }`}
            />
          </button>
        </div>
      )}

      {/* Like count */}
      {!editing && likeCount > 0 && (
        <div className="px-3 sm:px-4 pb-1">
          <button
            onClick={handleLike}
            className="text-sm font-bold text-slate-900 hover:opacity-80 transition-opacity"
          >
            {likeCount === 1
              ? t("likeCountOne", { count: likeCount })
              : t("likeCount", { count: likeCount })}
          </button>
        </div>
      )}

      {/* View all comments link */}
      {!editing && post.commentCount > 0 && (
        <div className="px-3 sm:px-4 pb-1">
          <button
            onClick={loadComments}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            {locale === "bn"
              ? `সব মন্তব্য দেখুন (${post.commentCount})`
              : `View all ${post.commentCount} comments`}
          </button>
        </div>
      )}

      {/* Comments preview (top 2) */}
      {!editing && showComments && comments.length > 0 && (
        <div className="px-3 sm:px-4 pb-2 space-y-1">
          {renderComments()}
        </div>
      )}

      {/* Timestamp */}
      {!editing && (
        <div className="px-3 sm:px-4 pb-3">
          <span className="text-[10.5px] uppercase tracking-wide text-slate-400 font-medium">
            {formatTimeAgo(post.createdAt, locale)}
          </span>
        </div>
      )}

      {/* Add comment input */}
      {!editing && (
        <div className="border-t border-slate-100 px-3 sm:px-4 py-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                <Smile className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleComment()}
                  placeholder={locale === "bn" ? "মন্তব্য লিখুন…" : "Write a comment…"}
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
                />
              </div>
              {commentText.trim() && (
                <button
                  onClick={handleComment}
                  disabled={submittingComment}
                  className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {submittingComment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : locale === "bn" ? (
                    "পোস্ট"
                  ) : (
                    "Post"
                  )}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={goLogin}
              className="text-xs text-slate-400 hover:text-red-600 transition-colors"
            >
              {t("loginToComment")}
            </button>
          )}
        </div>
      )}

      {lightboxOpen && hasImages && !editing && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  );
}
