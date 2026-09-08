"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  ImagePlus,
  X,
  Loader2,
  Send,
  Megaphone,
  Droplet,
  PenLine,
  SmilePlus,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  isCloudinaryConfigured,
  uploadImagesToCloudinary,
} from "@/lib/cloudinary";
import { serverCreatePost, serverGetMyDonationStats } from "@/lib/db-actions";
import Image from "next/image";

type UserType = { id: number; role: string } | null;

export default function FeedComposer({
  currentUser,
  onPosted,
  initialMode = "general",
}: {
  currentUser: UserType;
  onPosted: () => void;
  initialMode?: "general" | "donation";
}) {
  const t = useTranslations("social");
  const locale = useLocale();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<
    "general" | "donation_update" | "admin_announcement"
  >(initialMode === "donation" ? "donation_update" : "general");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const cloudConfigured = isCloudinaryConfigured();
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";

  useEffect(() => {
    if (initialMode !== "donation" || !currentUser) return;
    serverGetMyDonationStats()
      .then((stats: any) => {
        setContent(
          locale === "bn"
            ? `আমি এ পর্যন্ত ${stats.count} বার রক্তদান করেছি 🩸`
            : `I've donated ${stats.count} times 🩸`,
        );
      })
      .catch(() => {
        setContent(
          locale === "bn" ? "আমার রক্তদানের অভিজ্ঞতা 🩸" : "My donation journey 🩸",
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode, currentUser]);

  const onPickFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!cloudConfigured) {
      setError(t("cloudinaryNotConfigured"));
      return;
    }
    setUploading(true);
    setError("");
    try {
      const urls = await uploadImagesToCloudinary(
        Array.from(files),
        setUploadProgress,
      );
      setImages((prev) => [...prev, ...urls].slice(0, 4));
    } catch (e: any) {
      setError(e.message || t("uploadError"));
    }
    setUploading(false);
    setUploadProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (url: string) =>
    setImages((prev) => prev.filter((u) => u !== url));

  const EMOJIS = [
    "😀", "😊", "😂", "❤️", "🩸", "💉", "🏥", "🙏", "🎉", "🔥",
    "👍", "😢", "😍", "🤝", "💪", "🫶", "👏", "✨", "🕊️", "⭐",
    "💯", "😭", "🥺", "😎", "🤗", "🩺", "💊", "🚑", "🙌", "💖",
  ];

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newContent = content.slice(0, start) + emoji + content.slice(end);
    setContent(newContent);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    });
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await serverCreatePost({
        content: content.trim(),
        images,
        postType: isAdmin && postType === "admin_announcement"
          ? "admin_announcement"
          : postType,
        isPublic: true,
      });
      setContent("");
      setImages([]);
      setPostType("general");
      setExpanded(false);
      onPosted();
    } catch (e: any) {
      setError(e.message || t("error"));
    }
    setSubmitting(false);
  };

  const isLoggedIn = !!currentUser;

  const POST_TYPE_OPTIONS: {
    key: "general" | "donation_update" | "admin_announcement";
    icon: typeof PenLine;
    label: string;
    cls: string;
  }[] = [
    {
      key: "general",
      icon: PenLine,
      label: t("postGeneral"),
      cls: postType === "general" ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-slate-600 border-slate-200",
    },
    {
      key: "donation_update",
      icon: Droplet,
      label: t("postDonation"),
      cls: postType === "donation_update" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-600 border-slate-200",
    },
  ];
  if (isAdmin) {
    POST_TYPE_OPTIONS.push({
      key: "admin_announcement",
      icon: Megaphone,
      label: t("postAnnouncement"),
      cls: postType === "admin_announcement" ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-white text-slate-600 border-slate-200",
    });
  }

  return (
    <div className="bg-white border border-slate-100 sm:border-transparent sm:shadow-sm overflow-hidden">
      {/* Gradient accent strip — signals "create" zone */}
      <div className="h-[2px] w-full bg-gradient-to-r from-red-500 via-rose-400 to-amber-400" />

      {/* Composer header — post-creation bar */}
      <div className="px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-red-100">
            <PenLine className="h-4 w-4 text-white" />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) {
                window.location.href = `/${locale}/login?redirect=/${locale}/feed`;
                return;
              }
              setExpanded(true);
              setTimeout(() => textareaRef.current?.focus(), 100);
            }}
            className={`flex-1 text-left text-sm rounded-full px-4 py-2.5 border transition-colors ${
              isLoggedIn
                ? "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            {isLoggedIn
              ? locale === "bn"
                ? "কী ভাবছেন? পোস্ট শেয়ার করুন"
                : "What's on your mind? Share a post"
              : locale === "bn"
                ? "কী ভাবছেন? লগ ইন করে পোস্ট করুন"
                : "What's on your mind? Log in to post"}
          </button>
          {isLoggedIn && cloudConfigured && (
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
                setTimeout(() => fileRef.current?.click(), 120);
              }}
              className="hidden sm:inline-flex items-center justify-center h-9 w-9 rounded-full text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
              aria-label={t("addPhotos")}
              title={t("addPhotos")}
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Quick action chips — always visible to clarify this is a create bar */}
        {!expanded && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2.5 py-1 text-[11px] font-semibold border border-red-100">
              <PenLine className="w-3 h-3" />
              {locale === "bn" ? "পোস্ট" : "Post"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[11px] font-semibold border border-emerald-100">
              <Droplet className="w-3 h-3" />
              {locale === "bn" ? "রক্তদান আপডেট" : "Donation update"}
            </span>
            {cloudConfigured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 px-2.5 py-1 text-[11px] font-semibold border border-sky-100">
                <ImagePlus className="w-3 h-3" />
                {locale === "bn" ? "ছবি" : "Photo"}
              </span>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          {/* Post type pills */}
          <div className="flex flex-wrap gap-2 mb-3">
            {POST_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPostType(opt.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    opt.cls
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={
              postType === "donation_update"
                ? t("composerPlaceholderDonor")
                : t("composerPlaceholder")
            }
            className="w-full resize-none text-sm outline-none placeholder:text-slate-400 text-slate-800 bg-transparent"
          />

          {/* Image previews */}
          {images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((u) => (
                <div key={u} className="relative">
                  <img
                    src={u}
                    alt=""
                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(u)}
                    className="absolute -right-2 -top-2 rounded-full bg-red-600 p-0.5 text-white shadow-md hover:bg-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="mt-2">
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {t("uploading")} {uploadProgress}%
              </p>
            </div>
          )}

          {/* Error */}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

          {/* Bottom toolbar */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => onPickFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => {
                  if (!isLoggedIn) return;
                  fileRef.current?.click();
                }}
                disabled={uploading || images.length >= 4}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                title={t("addPhotos")}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {locale === "bn" ? "ছবি" : "Photo"}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                  title={locale === "bn" ? "ইমোজি" : "Emoji"}
                >
                  <SmilePlus className="h-4 w-4" />
                </button>
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-full left-0 z-50 mb-2 grid w-72 grid-cols-8 gap-0.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                  >
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-slate-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  setContent("");
                  setImages([]);
                  setPostType("general");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
                {locale === "bn" ? "বাতিল" : "Cancel"}
              </button>
            </div>

            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || (!content.trim() && images.length === 0)}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {locale === "bn" ? "পোস্ট" : "Post"}
              </button>
            ) : (
              <a
                href={`/${locale}/login?redirect=/${locale}/feed`}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-red-700"
              >
                {t("login")}
                <Send className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
