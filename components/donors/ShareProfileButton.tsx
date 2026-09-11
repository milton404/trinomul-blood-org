"use client";

import { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { Share2, Loader2 } from "lucide-react";

interface ShareProfileButtonProps {
  donorName: string;
  bloodGroup?: string;
  district?: string;
  /** The URL to share. Defaults to `window.location.href`. */
  url?: string;
  /** Compact mode — icon only, no text. */
  compact?: boolean;
}

/**
 * Share a donor profile link using the Web Share API. Falls back to
 * clipboard copy with a toast notification when Web Share is unavailable
 * (e.g., desktop browsers without the API).
 */
export default function ShareProfileButton({
  donorName,
  bloodGroup,
  district,
  url,
  compact = false,
}: ShareProfileButtonProps) {
  const locale = useLocale();
  const isBn = locale === "bn";
  const [loading, setLoading] = useState(false);

  const handleShare = useCallback(async () => {
    setLoading(true);
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
    const title = isBn
      ? `${donorName} — রক্তদাতা`
      : `${donorName} — Blood Donor`;
    const text = isBn
      ? `${donorName}${bloodGroup ? ` (${bloodGroup})` : ""}${district ? `, ${district}` : ""} — Trinomul Blood Bank Rangpur`
      : `${donorName}${bloodGroup ? ` (${bloodGroup})` : ""}${district ? `, ${district}` : ""} — Trinomul Blood Bank Rangpur`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(isBn ? "লিংক কপি হয়েছে" : "Link copied to clipboard");
      } else {
        toast.error(isBn ? "শেয়ার সমর্থিত নয়" : "Sharing not supported");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — no toast.
      } else {
        toast.error(isBn ? "শেয়ার ব্যর্থ" : "Share failed");
      }
    } finally {
      setLoading(false);
    }
  }, [donorName, bloodGroup, district, url, isBn]);

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
      title={isBn ? "শেয়ার" : "Share"}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
      {!compact && (isBn ? "শেয়ার" : "Share")}
    </button>
  );
}