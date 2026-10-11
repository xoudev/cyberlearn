import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { leaderboardRepository, leagueRepository, type LeaderboardEntry } from "@cyberlearn/db";
import {
  LEADERBOARD_PERIODS,
  leaderboardPeriodSince,
  leaderboardPeriodStart,
} from "@cyberlearn/lib";
import { userFromBearer } from "../_lib/auth";

import { errorMessage } from "@cyberlearn/lib/logger";
import { requestLogger } from "@/lib/request-logger";

/** The rows the app shows: its podium and its top list. */
const APP_ROWS = 50;

/**
 * `?period=week|month`. Absent - every build before the periods - or not one
 * of them, it is the all-time board, so an older app keeps the answer it
 * always had.
 */
const periodSchema = z.enum(LEADERBOARD_PERIODS).catch("all");

/**
 * Leaderboard + league data for the mobile Leaderboard screen. Served by the
 * API (not direct Supabase) because league_memberships RLS is self-select only:
 * the pod ladder and the anonymization rules live in the repositories, exactly
 * as the web /leaderboard page uses them.
 *
 * The period is additive: `entries`, `userRank` and `friendsBoard` keep their
 * shape and become the period's when one is asked for (each row's xpTotal is
 * then the XP earned since it opened, as on the site). `period`,
 * `periodSince` and `totalPlayers` are new; an older build reads past them.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const parsed = periodSchema.safeParse(request.nextUrl.searchParams.get("period") ?? undefined);
  const period = parsed.success ? parsed.data : "all";
  const start = leaderboardPeriodStart(period, new Date());

  try {
    const [board, season, friendsBoard] = await Promise.all([
      publicBoard(user.id, start),
      leagueRepository.getActiveSeason(),
      // The friends board, with its own opt-in rule (buildFriendsBoard), as on
      // the site's "Amis" tab, over the same period.
      leaderboardRepository.findFriendsBoard(user.id, start),
    ]);

    let league: {
      division: string;
      pod: number;
      seasonEndsAt: string;
      ladder: unknown[];
    } | null = null;
    if (season) {
      const membership = await leagueRepository.getUserMembership(user.id, season.id);
      if (membership) {
        const ladder = await leagueRepository.getPodLadder(
          season.id,
          membership.division,
          membership.pod,
          user.id,
        );
        league = {
          division: membership.division,
          pod: membership.pod,
          seasonEndsAt: season.endsAt.toISOString(),
          ladder,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      entries: board.entries,
      userRank: board.userRank,
      league,
      friendsBoard,
      period,
      periodSince: start === null ? null : leaderboardPeriodSince(period, start),
      totalPlayers: board.totalPlayers,
    });
  } catch (err) {
    const log = await requestLogger();
    log.error({ scope: "mobile/leaderboard", err: errorMessage(err) }, "error");
    return NextResponse.json({ ok: false, error: "Chargement impossible." }, { status: 500 });
  }
}

/**
 * The public board for all time or since `start`. `userRank` keeps the
 * route's old meaning, 0 for "not on the board", and is the reader's place on
 * the board that `totalPlayers` counts.
 *
 * On the all-time board it comes from findCurrentUserPosition, as on the
 * site, rather than from findUserRank: that one still ranks a hidden student
 * (it feeds their private dashboard), while countRanked leaves them out, so
 * the app printed "341e sur 340". A hidden reader now reads the same answer
 * in all three periods, on the site and in every build: not on the board.
 */
async function publicBoard(
  userId: string,
  start: Date | null,
): Promise<{ entries: LeaderboardEntry[]; userRank: number; totalPlayers: number }> {
  if (start === null) {
    const [entries, position, totalPlayers] = await Promise.all([
      leaderboardRepository.findTopUsers(APP_ROWS, userId),
      leaderboardRepository.findCurrentUserPosition(userId),
      leaderboardRepository.countRanked(),
    ]);
    return { entries, userRank: position?.rank ?? 0, totalPlayers };
  }
  const board = await leaderboardRepository.findTopUsersSince(start, APP_ROWS, userId);
  return {
    entries: board.entries,
    userRank: board.standing?.rank ?? 0,
    totalPlayers: board.total,
  };
}
