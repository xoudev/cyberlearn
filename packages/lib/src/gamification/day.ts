/**
 * Calendar-day helpers for streaks and activity history.
 *
 * A "day" is a calendar day in a single reference timezone (Europe/Paris) so the
 * whole app agrees on day boundaries - the activity touch logic, the daily cron
 * and the heatmap must all use the SAME notion of "today". Using a fixed tz (not
 * the server's local time or raw UTC) avoids the off-by-one a UTC midnight would
 * cause for users completing a lesson late in the French evening.
 */

/** Reference timezone for all streak / activity-day calculations. */
export const STREAK_TIMEZONE = "Europe/Paris";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(tz);
  if (cached) return cached;
  // en-CA formats as ISO "YYYY-MM-DD", which is exactly our day-key shape.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  formatterCache.set(tz, fmt);
  return fmt;
}

/** The calendar day of `date` in `tz`, as an ISO "YYYY-MM-DD" key. */
export function dayKey(date: Date, tz: string = STREAK_TIMEZONE): string {
  return formatterFor(tz).format(date);
}

/**
 * Whole-day difference `laterKey - earlierKey` (e.g. "2026-04-28" - "2026-04-27"
 * = 1). Day keys are interpreted at UTC midnight, so the result is unaffected by
 * DST. Negative if `laterKey` is before `earlierKey`.
 */
export function daysBetween(earlierKey: string, laterKey: string): number {
  const a = Date.parse(`${earlierKey}T00:00:00Z`);
  const b = Date.parse(`${laterKey}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** The day-key immediately before `key` (one calendar day earlier). */
export function previousDayKey(key: string): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}
