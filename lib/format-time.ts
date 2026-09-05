import { format } from "date-fns";

/** Human-friendly "posted at" label, matching the request card style. */
export function formatPostedAt(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
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
