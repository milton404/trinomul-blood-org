"use client";

import { useTranslations, useLocale } from "next-intl";
import { X, Loader2, ImagePlus, Send } from "lucide-react";
import { useState, useRef } from "react";
import {
  isCloudinaryConfigured,
  uploadImagesToCloudinary,
} from "@/lib/cloudinary";
import { serverCreateStory } from "@/lib/db-actions";

export default function FeedStoryComposer({
  open,
  onClose,
  onPosted,
}: {
  open: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  const t = useTranslations("social");
  const locale = useLocale();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cloudConfigured = isCloudinaryConfigured();

  if (!open) return null;

  const onPickFile = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!cloudConfigured) {
      setError(t("cloudinaryNotConfigured"));
      return;
    }
    setUploading(true);
    setError("");
    try {
      const urls = await uploadImagesToCloudinary(Array.from(files).slice(0, 1));
      if (urls[0]) setImageUrl(urls[0]);
    } catch (e: any) {
      setError(e.message || t("uploadError"));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    const text = content.trim();
    if (!text && !imageUrl) return;
    setSubmitting(true);
    setError("");
    try {
      await serverCreateStory({ imageUrl, content: text });
      setImageUrl(null);
      setContent("");
      onPosted();
      onClose();
    } catch (e: any) {
      setError(e.message || t("error"));
    }
    setSubmitting(false);
  };

  const close = () => {
    setImageUrl(null);
    setContent("");
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {locale === "bn" ? "নতুন স্টোরি" : "New story"}
          </h3>
          <button
            onClick={close}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("cancel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-[11px] text-slate-400">{t("storyHint")}</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onPickFile(e.target.files)}
        />

        {imageUrl ? (
          <div className="relative mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="max-h-64 w-full rounded-xl object-contain bg-black"
            />
            <button
              onClick={() => setImageUrl(null)}
              className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white shadow"
              aria-label={t("cancel")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !cloudConfigured}
            className="mb-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-8 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-6 w-6" />
            )}
            <span className="text-xs font-medium">
              {uploading
                ? t("uploading")
                : locale === "bn"
                  ? "ছবি নির্বাচন করুন"
                  : "Choose a photo"}
            </span>
          </button>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder={t("storyPlaceholder")}
          className="mb-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400"
        />

        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (!content.trim() && !imageUrl)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {t("postStory")}
        </button>
      </div>
    </div>
  );
}