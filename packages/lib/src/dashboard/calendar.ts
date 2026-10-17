/**
 * The dashboard's calendar: the date in its header and the moment "ce
 * mois-ci" starts, both in the site's reference timezone.
 *
 * They were read in the server process's timezone, which is UTC in
 * production: for an hour after midnight in Paris (two in summer) the header
 * still showed the day before, and the month's lessons counted from 1 or 2 am.
 * The streaks, the weekly quests and the rest of the site's dates use
 * Europe/Paris (../gamification/day.ts); so does this.
 */

import { STREAK_TIMEZONE, dayKey } from "../gamification/day";

/** "Vendredi 16 octobre": the day as the reader's calendar shows it. */
export function dashboardDateLabel(now: Date, tz: string = STREAK_TIMEZONE): string {
  const label = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** How far `tz`'s clock is ahead of UTC at an instant, in milliseconds. */
function offsetAt(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wall = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return wall - Math.floor(instant / 1000) * 1000;
}

/** The instant the current month began in `tz`: midnight on the first, there. */
export function monthStartIn(now: Date, tz: string = STREAK_TIMEZONE): Date {
  const [year = "1970", month = "01"] = dayKey(now, tz).split("-");
  const midnightUtc = Date.UTC(Number(year), Number(month) - 1, 1);
  // Twice, in case the first guess falls on the other side of a clock change.
  const first = midnightUtc - offsetAt(midnightUtc, tz);
  return new Date(midnightUtc - offsetAt(first, tz));
}
