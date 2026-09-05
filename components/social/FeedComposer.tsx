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
  const [postType, setPostType] = useState<"general" | "donation_update" | "admin_announcement">(
    initialMode === "donation" ? "donation_update" : "general",
  );
  const [isPublic] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const cloudConfigured = isCloudinaryConfigured();
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";

  // Prefill donation-update text for donors sharing their progress.
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
    "😀","😊","😂","❤️","🩸","💉","🏥","🙏","🎉","🔥",
    "👍","😢","😍","🤝","💪","🫶","👏","✨","🕊️","⭐",
    "💯","😭","🥺","😎","🤗","🩺","💊","🚑","🙌","💖",
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

  // Close emoji picker on outside click
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
        isPublic,
      });
      setContent("");
      setImages([]);
      setPostType("general");
      onPosted();
    } catch (e: any) {
      setError(e.message || t("error"));
    }
    setSubmitting(false);
  };

  // The composer is always visible (Facebook-style). Post action is login-gated.
  const isLoggedIn = !!currentUser;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Avatar row */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center gap-0.5 rounded-full bg-red-100">
          <PenLine className="h-4 w-4 text-red-600" />
          <Droplet className="h-4 w-4 text-rose-500" />
        </div>
        <p className="text-sm font-semibold text-slate-800">
          {isLoggedIn
            ? (locale === "bn" ? "কী ভাবছেন?" : "What's on your mind?")
            : (locale === "bn" ? "কী ভাবছেন? লগ ইন করে পোস্ট করুন" : "What's on your mind? Log in to post")}
        </p>
      </div>

      {/* Post type tabs */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPostType("general")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
            postType === "general"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <PenLine className="w-4 h-4" />
          {t("postGeneral")}
        </button>
        <button
          type="button"
          onClick={() => setPostType("donation_update")}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
            postType === "donation_update"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Droplet className="w-4 h-4" />
          {t("postDonation")}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setPostType("admin_announcement")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              postType === "admin_announcement"
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            {t("postAnnouncement")}
          </button>
        )}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={postType === "donation_update" ? 2 : 3}
        maxLength={2000}
        placeholder={
          postType === "donation_update"
            ? t("composerPlaceholderDonor")
            : t("composerPlaceholder")
        }
        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400"
      />

      {/* Image previews */}
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((u) => (
            <div key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt=""
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(u)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white"
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
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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
        <div className="flex items-center gap-2">
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
              if (!isLoggedIn) {
                window.location.href = `/${locale}/login?redirect=/${locale}/feed`;
                return;
              }
              fileRef.current?.click();
            }}
            disabled={uploading || images.length >= 4}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            title={t("addPhotos")}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {t("addPhotos")}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              title={locale === "bn" ? "ইমোজি" : "Emoji"}
            >
              <SmilePlus className="h-4 w-4" />
            </button>
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute bottom-full left-0 z-50 mb-2 grid w-72 grid-cols-10 gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
              >
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-slate-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoggedIn ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (!content.trim() && images.length === 0)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("postButton")}
          </button>
        ) : (
          <a
            href={`/${locale}/login?redirect=/${locale}/feed`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            {t("login")}
            <Send className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
