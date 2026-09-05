/**
 * Dynamically compute the "when needed" display label for a blood request.
 *
 * The stored `when_needed` enum (now / today / tomorrow / day_after / ...) is
 * set at creation time and never changes.  But as real time passes, "Tomorrow"
 * should become "Today", then "Yesterday" / "Overdue".  This function computes
 * the target date from `created_at` + the enum offset, then compares it to the
 * current date to produce a fresh label every render.
 *
 * For `specific_date` the actual date is always shown (it never shifts).
 * For `within_3_days` / `within_week` the remaining days are shown, or
 * "Overdue" once the deadline has passed.
 */

export function formatWhenNeededDynamic(
  whenNeeded: string,
  createdAt: string,
  neededDate?: string | null,
  neededTime?: string | null,
  locale: string = "en",
): string {
  if (!whenNeeded) return "—";

  const isBn = locale === "bn";

  // Format "HH:MM" → "10:00 AM" / "10:00 AM" (12-hour with AM/PM)
  const formatTime = (time: string): string => {
    if (!time) return "";
    const d = new Date(`2000-01-01T${time}`);
    if (Number.isNaN(d.getTime())) return time;
    return d.toLocaleTimeString(isBn ? "bn-BD" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const labels = isBn
    ? {
        now: "এখনই",
        today: "আজ",
        tomorrow: "আগামীকাল",
        dayAfter: "পরশু",
        yesterday: "গতকাল",
        overdue: "সময়োত্তীর্ণ",
        within: (n: number) => `${n} দিনের মধ্যে`,
      }
    : {
        now: "Now",
        today: "Today",
        tomorrow: "Tomorrow",
        dayAfter: "Day After Tomorrow",
        yesterday: "Yesterday",
        overdue: "Overdue",
        within: (n: number) => `Within ${n} day${n !== 1 ? "s" : ""}`,
      };

  // 'now' / 'emergency' are always immediate
  if (whenNeeded === "now" || whenNeeded === "emergency") {
    return labels.now;
  }

  // 'specific_date' always shows the actual date
  if (whenNeeded === "specific_date" && neededDate) {
    const d = new Date(neededDate);
    if (!Number.isNaN(d.getTime())) {
      const dateStr = d.toLocaleDateString(
        isBn ? "bn-BD" : "en-US",
        { day: "numeric", month: "short", year: "numeric" },
      );
      return neededTime ? `${dateStr} · ${formatTime(neededTime)}` : dateStr;
    }
  }

  // Compute target date from when_needed + created_at
  const created = new Date(
    typeof createdAt === "string" ? createdAt.replace(" ", "T") : createdAt,
  );
  if (Number.isNaN(created.getTime())) return whenNeeded.replace(/_/g, " ");

  // For range types, compute remaining days
  if (whenNeeded === "within_3_days" || whenNeeded === "within_week") {
    const deadline = new Date(created);
    const days = whenNeeded === "within_3_days" ? 3 : 7;
    deadline.setDate(deadline.getDate() + days);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadlineDay = new Date(
      deadline.getFullYear(),
      deadline.getMonth(),
      deadline.getDate(),
    );
    const remaining = Math.round(
      (deadlineDay.getTime() - today.getTime()) / 86_400_000,
    );

    if (remaining <= 0) return labels.overdue;
    return labels.within(remaining);
  }

  // For point-in-time types, compute the target date
  const target = new Date(created);
  switch (whenNeeded) {
    case "today":
      break;
    case "tomorrow":
      target.setDate(target.getDate() + 1);
      break;
    case "day_after":
    case "day_after_tomorrow":
      target.setDate(target.getDate() + 2);
      break;
    default:
      return whenNeeded.replace(/_/g, " ");
  }

  // Compare target to today
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const diffDays = Math.round(
    (targetDay.getTime() - today.getTime()) / 86_400_000,
  );

  let label: string;
  if (diffDays === 0) label = labels.today;
  else if (diffDays === 1) label = labels.tomorrow;
  else if (diffDays === 2) label = labels.dayAfter;
  else if (diffDays === -1) label = labels.yesterday;
  else if (diffDays < 0) label = labels.overdue;
  else {
    label = target.toLocaleDateString(isBn ? "bn-BD" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (neededTime) {
    return `${label} · ${formatTime(neededTime)}`;
  }
  return label;
}