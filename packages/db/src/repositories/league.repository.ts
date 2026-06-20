import type { LeagueDivision } from "@prisma/client";
import { prisma } from "../prisma.js";
import { buildPodLadder, type PodLadderEntry, type RawPodMember } from "./league.visibility.js";

export const leagueRepository = {
  /** The single ACTIVE season, or null when the league hasn't started yet. */
  getActiveSeason() {
    return prisma.season.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, index: true, startsAt: true, endsAt: true },
    });
  },

  /** A user's membership in a season (null when not joined). */
  getUserMembership(userId: string, seasonId: string) {
    return prisma.leagueMembership.findUnique({
      where: { userId_seasonId: { userId, seasonId } },
      select: { division: true, pod: true, seasonXp: true, finalRank: true },
    });
  },

  /**
   * The anonymized ladder for one pod (a division + pod within a season).
   *
   * SECURITY: returns ONLY client-safe PodLadderEntry rows - never raw users,
   * never userIds. No query-level visibility filter and no take cap: a pod is
   * <=15 by construction and HIDDEN members must stay in the ladder (anonymized)
   * so ranks + zones are intact. All PII stripping happens in buildPodLadder.
   * The tiebreak (seasonXp desc, joinedAt asc) matches the rollover so the live
   * preview is identical to the eventual seating.
   */
  async getPodLadder(
    seasonId: string,
    division: LeagueDivision,
    pod: number,
    currentUserId: string,
  ): Promise<PodLadderEntry[]> {
    const rows = await prisma.leagueMembership.findMany({
      where: { seasonId, division, pod },
      orderBy: [{ seasonXp: "desc" }, { joinedAt: "asc" }],
      select: {
        userId: true,
        seasonXp: true,
        user: {
          select: {
            displayName: true,
            username: true,
            avatarUrl: true,
            level: true,
            preferences: { select: { leaderboardVisibility: true, publicProfile: true } },
          },
        },
      },
    });

    const members: RawPodMember[] = rows.map((row) => ({
      id: row.userId,
      displayName: row.user.displayName,
      username: row.user.username,
      avatarUrl: row.user.avatarUrl,
      level: row.user.level,
      seasonXp: row.seasonXp,
      preferences: row.user.preferences,
    }));
    return buildPodLadder(members, currentUserId);
  },
};
