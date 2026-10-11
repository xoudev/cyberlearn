import {
  LEADERBOARD_PERIODS,
  LEADERBOARD_PERIOD_LABEL,
  type LeaderboardPeriod,
} from "@cyberlearn/lib/gamification/leaderboard-period";

/**
 * The leaderboard's periods in the app: all time, this month, this week, as
 * on the site. The windows are the server's (Monday and the 1st, Paris time);
 * the app only asks for one and words it.
 */

export type { LeaderboardPeriod } from "@cyberlearn/lib/gamification/leaderboard-period";

/** The chips under the board switch, in the site's order and words. */
export const PERIOD_CHIPS: readonly { id: LeaderboardPeriod; label: string }[] =
  LEADERBOARD_PERIODS.map((id) => ({ id, label: LEADERBOARD_PERIOD_LABEL[id] }));

/**
 * The route for a period. All time sends no parameter, which is the request
 * every build before the periods made, so the answer is the one they had.
 */
export function leaderboardPath(period: LeaderboardPeriod): string {
  return period === "all"
    ? "/api/mobile/leaderboard"
    : `/api/mobile/leaderboard?period=${encodeURIComponent(period)}`;
}

/** The eyebrow over the top list: "Général" for all time, the period otherwise. */
export function topListEyebrow(period: LeaderboardPeriod): string {
  return period === "all" ? "Général" : LEADERBOARD_PERIOD_LABEL[period];
}

/** What an empty top list says: nobody yet, or nobody yet in this period. */
export function emptyBoardLabel(period: LeaderboardPeriod): string {
  return period === "all"
    ? "Aucun joueur dans le classement pour le moment."
    : "Personne n'a encore gagné d'XP sur cette période.";
}
