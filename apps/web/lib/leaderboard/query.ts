import { z } from "zod";
import { LEADERBOARD_PERIODS, type LeaderboardPeriod } from "@cyberlearn/lib";

/**
 * The leaderboard's address: which tab and which period.
 *
 * Both live in the URL. A period is read on the server, from the ledger, so
 * changing it is a round-trip, and the tab the reader was on has to come back
 * with it. Kept apart from boards.ts, which reads the database, because the
 * page's client half builds these addresses too.
 */

export const LEADERBOARD_VIEWS = ["global", "friends", "league"] as const;
export type LeaderboardView = (typeof LEADERBOARD_VIEWS)[number];

const querySchema = z.object({
  period: z.enum(LEADERBOARD_PERIODS).catch("all"),
  board: z.enum(LEADERBOARD_VIEWS).catch("global"),
});

/**
 * `?period=week|month` and `?board=friends|league`, each falling back to the
 * all-time global board when absent or not one of its values: an address
 * typed by hand, or kept from an older version, still opens a board.
 */
export function parseLeaderboardQuery(params: Record<string, string | string[] | undefined>): {
  period: LeaderboardPeriod;
  board: LeaderboardView;
} {
  const first = (key: string): unknown => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const parsed = querySchema.safeParse({ period: first("period"), board: first("board") });
  // Both fields catch: only a schema change could make this fail.
  return parsed.success ? parsed.data : { period: "all", board: "global" };
}

/** The page's address for a tab and a period, the defaults left out. */
export function leaderboardHref(board: LeaderboardView, period: LeaderboardPeriod): string {
  const query = new URLSearchParams();
  if (board !== "global") query.set("board", board);
  if (period !== "all") query.set("period", period);
  const qs = query.toString();
  return qs === "" ? "/leaderboard" : `/leaderboard?${qs}`;
}
