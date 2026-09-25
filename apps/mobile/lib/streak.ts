/**
 * The streak panel in the app: the site's (apps/web/components/streak-panel.tsx),
 * from the same overview (/api/mobile/streak) and the same calendar and words
 * (@cyberlearn/lib/gamification/streak-calendar).
 */

import { dayKey } from "@cyberlearn/lib/gamification/day";

export {
  STREAK_COPY,
  WEEKDAY_LABELS,
  streakCalendar,
  type CalendarCell,
} from "@cyberlearn/lib/gamification/streak-calendar";
export { nextMilestone } from "@cyberlearn/lib/gamification/streak-state";

/** Today in the streak's timezone, which is the site's, not the phone's. */
export function streakTodayKey(now: Date = new Date()): string {
  return dayKey(now);
}

/**
 * The calendar's columns, each the seven days of one week, Monday first:
 * the flat list comes week by week, and a phone lays each week out as a column.
 */
export function calendarColumns<T>(cells: readonly T[]): T[][] {
  const columns: T[][] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
  return columns;
}
