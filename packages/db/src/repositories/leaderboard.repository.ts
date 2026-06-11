import { type Prisma, LeaderboardVisibility } from "@prisma/client";
import { prisma } from "../prisma.js";
import {
  buildCurrentUserPosition,
  buildLeaderboard,
  resolveVisibility,
} from "./leaderboard.visibility.js";
import type { CurrentUserPosition, LeaderboardEntry } from "./leaderboard.visibility.js";

export type { LeaderboardEntry, CurrentUserPosition } from "./leaderboard.visibility.js";

// A user is visible unless their preference is HIDDEN. A user with no
// preferences row (pre-onboarding) is visible and treated as ANONYMOUS, hence
// the explicit `is: null` branch.
const VISIBLE_USER_FILTER: Prisma.UserWhereInput = {
  OR: [
    { preferences: { is: null } },
    { preferences: { is: { leaderboardVisibility: { not: LeaderboardVisibility.HIDDEN } } } },
  ],
};

const leaderboardSelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  level: true,
  xpTotal: true,
  streakDays: true,
  preferences: { select: { leaderboardVisibility: true, publicProfile: true } },
} satisfies Prisma.UserSelect;

export const leaderboardRepository = {
  /**
   * Top users for the public leaderboard.
   *
   * SECURITY: HIDDEN users are filtered out at the query level - excluded from
   * the list AND from rank numbering. buildLeaderboard then strips name,
   * username, and avatar for ANONYMOUS users before the data leaves the server.
   * Ranks are continuous over the visible subset.
   */
  async findTopUsers(limit: number, currentUserId: string): Promise<LeaderboardEntry[]> {
    const users = await prisma.user.findMany({
      where: VISIBLE_USER_FILTER,
      orderBy: [{ xpTotal: "desc" }, { id: "asc" }],
      take: limit,
      select: leaderboardSelect,
    });
    return buildLeaderboard(users, currentUserId);
  },

  /**
   * The signed-in user's own standing. Rank counts only visible users with
   * strictly higher XP, so it stays consistent with findTopUsers. A HIDDEN user
   * gets rank null (no public position). This is the user's own data, so their
   * real identity is returned - the UI shows "TOI" (and "masqué" when HIDDEN).
   */
  async findCurrentUserPosition(userId: string): Promise<CurrentUserPosition | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: leaderboardSelect,
    });
    if (!user) return null;

    if (resolveVisibility(user.preferences) === LeaderboardVisibility.HIDDEN) {
      return buildCurrentUserPosition(user, 0); // rank coerced to null inside
    }

    const higher = await prisma.user.count({
      where: { AND: [VISIBLE_USER_FILTER, { xpTotal: { gt: user.xpTotal } }] },
    });
    return buildCurrentUserPosition(user, higher + 1);
  },

  /**
   * Rank of a user among visible (non-HIDDEN) users, counting strictly higher
   * XP. Used by the dashboard stat; visibility-aware so it agrees with the
   * leaderboard ranks. A HIDDEN user still receives their numeric standing here
   * - this powers their own private dashboard, not the public board.
   */
  async findUserRank(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true },
    });
    if (!user) return 0;

    const higher = await prisma.user.count({
      where: { AND: [VISIBLE_USER_FILTER, { xpTotal: { gt: user.xpTotal } }] },
    });
    return higher + 1;
  },
};
