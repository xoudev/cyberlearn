/**
 * ISO-week helpers for the weekly-quests feature.
 *
 * A "week" is the ISO 8601 week (Monday start, week 1 contains the first
 * Thursday) of a calendar day resolved in the reference timezone
 * (Europe/Paris, via {@link dayKey}). Weekly quest progress is scoped to the
 * current week key, so a new week is simply a new key - no cron / reset job is
 * needed (lazy reset).
 */
import { dayKey, STREAK_TIMEZONE } from "./day.js";

/**
 * ISO week key of `date` in `tz`, as "YYYY-Www" (e.g. "2026-W01").
 * The ISO year can differ from the calendar year near January 1st.
 */
export function isoWeekKey(date: Date, tz: string = STREAK_TIMEZONE): string {
  // Civil calendar day in the reference tz; week math is then pure UTC (no DST).
  const [ys, ms, ds] = dayKey(date, tz).split("-");
  const civil = new Date(Date.UTC(Number(ys), Number(ms) - 1, Number(ds)));

  // Move to the Thursday of this ISO week (Mon=0 … Sun=6).
  const dayNum = (civil.getUTCDay() + 6) % 7;
  const thursday = new Date(civil);
  thursday.setUTCDate(civil.getUTCDate() - dayNum + 3);

  const isoYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${String(isoYear)}-W${String(week).padStart(2, "0")}`;
}

const WEEKDAY_TO_ISO: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/**
 * Milliseconds from `now` until the current week resets (next Monday 00:00 in
 * `tz`). Display-only countdown ("Reset dans …"); ignores the twice-a-year DST
 * hour shift, which is acceptable for a relative timer.
 */
export function msUntilWeekReset(now: Date, tz: string = STREAK_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";

  const isoDow = WEEKDAY_TO_ISO[part("weekday")] ?? 1;
  const hour = Number(part("hour"));
  const minute = Number(part("minute"));
  const second = Number(part("second"));

  // Days until the next Monday (a fresh Monday is always 7 days away, never 0).
  const days = (8 - isoDow) % 7 || 7;
  const secondsToday = hour * 3600 + minute * 60 + second;
  return (days * 86_400 - secondsToday) * 1000;
}
