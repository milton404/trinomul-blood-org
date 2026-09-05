import { addHours, endOfDay, addDays } from 'date-fns';

/**
 * Calculate the expiry timestamp for a blood request.
 *
 * @param whenNeeded One of: 'now' | 'today' | 'tomorrow' | 'day_after' | 'specific_date'
 * @param date       Needed date (ISO yyyy-mm-dd) — used for 'specific_date'.
 * @param time       Needed time (HH:mm) — currently unused but kept for API compat.
 * @param baseDate   The reference point for relative values. Defaults to `now` for
 *                   backwards compatibility, but should be the request's
 *                   `created_at` when computing expiry for an existing record —
 *                   otherwise "today"/"tomorrow" would keep shifting forward.
 */
export const calculateExpiry = (
  whenNeeded: string,
  date?: string,
  time?: string,
  baseDate: Date = new Date(),
) => {
  switch (whenNeeded) {
    case 'now':
      return addHours(baseDate, 6);
    case 'today':
      return endOfDay(baseDate);
    case 'tomorrow':
      return endOfDay(addDays(baseDate, 1));
    case 'day_after':
    case 'day_after_tomorrow':
      return endOfDay(addDays(baseDate, 2));
    case 'specific_date':
      return date ? endOfDay(new Date(date)) : endOfDay(baseDate);
    default:
      return endOfDay(baseDate);
  }
};

/** True when the computed expiry for the given request has passed. */
export const isExpired = (
  whenNeeded: string,
  createdAt: string | Date,
  date?: string,
  time?: string,
): boolean => {
  const base = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (Number.isNaN(base.getTime())) return false;
  const expiry = calculateExpiry(whenNeeded, date, time, base);
  return expiry.getTime() < Date.now();
};
