import { prisma } from "../prisma.js";

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
};
