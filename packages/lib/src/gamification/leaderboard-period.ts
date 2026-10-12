/**
 * The leaderboard's periods: all time, this month, this week.
 *
 * All time ranks the running User.xpTotal. A period ranks what the ledger
 * (XpLedger) recorded since its start, and a start is a moment in Paris time,
 * as the streaks, the quests and Wrapped read the calendar: a week opens on
 * Monday at midnight, a month on the 1st at midnight. Reading either in UTC
 * would move the change by one or two hours, and a learner finishing a lesson
 * on Sunday at 23:30 would see it counted in next week's board.
 *
 * Shared by the site, the app's route and the app, so the three say the same
 * words for the same window.
 */
import { parisLocalToDate } from "../challenges/tournament.js";
import { dayKey, STREAK_TIMEZONE } from "./day.js";

export const LEADERBOARD_PERIODS = ["all", "month", "week"] as const;

export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

/** The pill under the board's tabs. */
export const LEADERBOARD_PERIOD_LABEL: Record<LeaderboardPeriod, string> = {
  all: "Depuis toujours",
  month: "Ce mois",
  week: "Cette semaine",
};

/** Whether a value read from a request names one of the periods. */
export function isLeaderboardPeriod(value: unknown): value is LeaderboardPeriod {
  return typeof value === "string" && (LEADERBOARD_PERIODS as readonly string[]).includes(value);
}

/** "2026-10-12" as the Monday of its own week (Monday stays itself). */
function mondayOf(key: string): string {
  const day = new Date(`${key}T00:00:00Z`);
  // getUTCDay is 0 on Sunday: Monday is 0 steps back, Sunday 6.
  const back = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - back * 86_400_000).toISOString().slice(0, 10);
}

/**
 * The moment a period opened, as of `now`: Monday 00:00 or the 1st 00:00,
 * Paris time, whatever the server's own zone and the season's offset. Null for
 * all time, which has no start.
 */
export function leaderboardPeriodStart(period: LeaderboardPeriod, now: Date): Date | null {
  if (period === "all") return null;
  const today = dayKey(now);
  const first = period === "week" ? mondayOf(today) : `${today.slice(0, 7)}-01`;
  // Midnight exists every day in Paris: the clocks change at 02:00 and 03:00.
  return parisLocalToDate(`${first}T00:00`);
}

/**
 * Since when a period board counts, under its title: "depuis lundi 12
 * octobre", "depuis le 1er octobre". Null for all time. The formatters are
 * built on each call, like tournament.ts's: the app imports this file for its
 * labels and need not build them on load.
 */
export function leaderboardPeriodSince(period: LeaderboardPeriod, start: Date): string | null {
  if (period === "all") return null;
  if (period === "month") {
    const month = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: STREAK_TIMEZONE });
    return `depuis le 1er ${month.format(start)}`;
  }
  const day = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: STREAK_TIMEZONE,
  });
  return `depuis ${day.format(start)}`;
}
