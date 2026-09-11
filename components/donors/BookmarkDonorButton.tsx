"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { serverToggleBookmark, serverIsBookmarked } from "@/lib/db-actions";
import { useAuthStore } from "@/store/authStore";

interface BookmarkDonorButtonProps {
  donorId: number;
  /** Compact mode — icon only, no text. */
  compact?: boolean;
}

export default function BookmarkDonorButton({
  donorId,
  compact = false,
}: BookmarkDonorButtonProps) {
  const locale = useLocale();
  const isBn = locale === "bn";
  const router = useRouter();
  const { user } = useAuthStore();
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(true);
      return;
    }
    let active = true;
    serverIsBookmarked(donorId)
      .then((result) => {
        if (active) setBookmarked(result);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [donorId, user?.id]);

  const handleToggle = useCallback(async () => {
    if (loading) return;

    if (!user?.id) {
      toast.info(isBn ? "সংরক্ষণ করতে লগইন করুন" : "Please login to save");
      router.push("/login");
      return;
    }

    const prev = bookmarked;
    setBookmarked(!prev);
    setLoading(true);
    try {
      const result = await serverToggleBookmark(donorId);
      setBookmarked(result.bookmarked);
      toast.success(
        result.bookmarked
          ? isBn
            ? "ডোনার সংরক্ষিত হয়েছে"
            : "Donor bookmarked"
          : isBn
            ? "বুকমার্ক সরানো হয়েছে"
            : "Bookmark removed",
      );
    } catch {
      setBookmarked(prev);
      toast.error(isBn ? "ব্যর্থ" : "Failed");
    } finally {
      setLoading(false);
    }
  }, [donorId, bookmarked, loading, isBn, user?.id, router]);

  if (!checked) {
    return (
      <button
        type="button"
        disabled
      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-400 rounded-lg border border-slate-200"
    >
      <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
        bookmarked
          ? "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
          : "text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
      }`}
      title={isBn ? "সংরক্ষণ" : "Bookmark"}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : bookmarked ? (
        <BookmarkCheck className="w-4 h-4" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
      {!compact && (isBn ? "সংরক্ষণ" : "Save")}
    </button>
  );
}
