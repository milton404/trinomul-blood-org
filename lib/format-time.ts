import { format } from "date-fns";

/** Parse a SQLite/pg/ISO timestamp into ms, defensive against Date objects. */
function toMs(iso: string | Date | null | undefined): number {
  if (iso == null) return NaN;
  if (iso instanceof Date) return iso.getTime();
  const str = String(iso);
  const normalized = str.includes("T") ? str : str.replace(" ", "T");
  const hasTz = /[+-]\d{2}:?\d{2}$/.test(normalized) || normalized.endsWith("Z");
  const t = new Date(hasTz ? normalized : normalized + "Z").getTime();
  return t;
}

/**
 * Relative "time ago" label — min/hours/days ago (Instagram-style).
 * Falls back to an absolute date for anything older than 7 days.
 */
export function formatTimeAgo(
  iso: string | Date | null | undefined,
  locale?: string,
): string {
  const ms = toMs(iso);
  if (!Number.isFinite(ms)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  const bn = locale === "bn";
  const toBn = (s: string) =>
    s.replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
  if (diffSec < 60) return bn ? "এইমাত্র" : "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return bn ? `${toBn(String(diffMin))} মি আগে` : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return bn ? `${toBn(String(diffHr))} ঘ আগে` : `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return bn ? `${toBn(String(diffDay))} দিন আগে` : `${diffDay}d ago`;
  return formatPostedAt(iso);
}

/** Human-friendly "posted at" label, matching the request card style. */
export function formatPostedAt(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const str = typeof iso === "string" ? iso : iso instanceof Date ? iso.toISOString() : String(iso);
  // Handle SQLite ("2026-01-01 12:00:00"), pg ("2026-01-01 12:00:00+00"), and ISO ("2026-01-01T12:00:00Z")
  const normalized = str.includes("T") ? str : str.replace(" ", "T");
  const hasTz = /[+-]\d{2}:?\d{2}$/.test(normalized) || normalized.endsWith("Z");
  const d = new Date(hasTz ? normalized : normalized + "Z");
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate();
  const timeStr = format(d, "h:mm a");
  if (sameDay) return `Today · ${timeStr}`;
  if (isYesterday) return `Yesterday · ${timeStr}`;
  const within7Days = (now.getTime() - d.getTime()) / 86_400_000 < 7;
  if (within7Days) {
    return `${format(d, "EEE")} · ${format(d, "MMM d")} · ${timeStr}`;
  }
  const showYear = d.getFullYear() !== now.getFullYear();
  const datePart = showYear
    ? format(d, "MMM d, yyyy")
    : format(d, "MMM d");
  return `${datePart} · ${timeStr}`;
}
