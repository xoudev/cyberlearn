import {
  LEADERBOARD_PERIODS,
  LEADERBOARD_PERIOD_LABEL,
  isLeaderboardPeriod,
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

/**
 * The period an answer is for, as the server says it. A server older than the
 * periods sends none, and it ignored the one asked for too: its answer is the
 * all-time board.
 */
export function answeredPeriod(value: unknown): LeaderboardPeriod {
  return isLeaderboardPeriod(value) ? value : "all";
}

/**
 * The name a row's avatar takes its initials from, when it has no picture to
 * draw: the display name, else the handle without its "@" (which would draw
 * "@A"), else what the row is called when it names nobody.
 */
export function rowAvatarName(entry: {
  displayName: string | null;
  username: string | null;
  isCurrentUser: boolean;
}): string {
  return entry.displayName || entry.username || (entry.isCurrentUser ? "Toi" : "Anonyme");
}

/** The podium's places. */
const PODIUM_PLACES = 3;
/** Where the top list stops, counted from the first row. */
const TOP_LIST_END = 25;

/** A podium needs three players to stand on it. */
export function hasPodium(entries: readonly unknown[]): boolean {
  return entries.length >= PODIUM_PLACES;
}

/**
 * The rows the top list draws: whatever the podium has not taken. With one or
 * two players there is no podium, and the list is the only place they appear,
 * which is a normal Monday on "Cette semaine" and a normal 1st on "Ce mois".
 */
export function topListRows<T>(entries: readonly T[]): T[] {
  return hasPodium(entries)
    ? entries.slice(PODIUM_PLACES, TOP_LIST_END)
    : entries.slice(0, TOP_LIST_END);
}
