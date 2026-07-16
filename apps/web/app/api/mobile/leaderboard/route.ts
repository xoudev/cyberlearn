import { type NextRequest, NextResponse } from "next/server";
import { leaderboardRepository, leagueRepository } from "@cyberlearn/db";
import { userFromBearer } from "../_lib/auth";

/**
 * Leaderboard + league data for the mobile Leaderboard screen. Served by the
 * API (not direct Supabase) because league_memberships RLS is self-select only:
 * the pod ladder and the anonymization rules live in the repositories, exactly
 * as the web /leaderboard page uses them.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  try {
    const [entries, userRank, season] = await Promise.all([
      leaderboardRepository.findTopUsers(50, user.id),
      leaderboardRepository.findUserRank(user.id),
      leagueRepository.getActiveSeason(),
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

    return NextResponse.json({ ok: true, entries, userRank, league });
  } catch (err) {
    console.error("[mobile/leaderboard] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: "Chargement impossible." }, { status: 500 });
  }
}
