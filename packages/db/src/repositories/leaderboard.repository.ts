import { type Prisma, LeaderboardVisibility, UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import {
  buildCurrentUserPosition,
  buildLeaderboard,
  resolveVisibility,
} from "./leaderboard.visibility.js";
import type { CurrentUserPosition, LeaderboardEntry } from "./leaderboard.visibility.js";

export type { LeaderboardEntry, CurrentUserPosition } from "./leaderboard.visibility.js";

// Who appears on the board, and it is two conditions rather than one.
//
// Visibility: a user is visible unless their preference is HIDDEN. A user with
// no preferences row (pre-onboarding) is visible and treated as ANONYMOUS,
// hence the explicit `is: null` branch.
//
// Role: only students are ranked. The board measures learning, and a teacher
// or an admin accumulating XP while building the content is not competing with
// their own class - a teacher at rank 1 above their students reads as a
// scoreboard nobody can win. They are excluded from the list, from the rank
// numbering, and from their own standing, the same way a HIDDEN user is.
const RANKED_USER_FILTER: Prisma.UserWhereInput = {
  role: UserRole.STUDENT,
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
   * Ranks are continuous over the ranked subset, which is students only.
   */
  async findTopUsers(limit: number, currentUserId: string): Promise<LeaderboardEntry[]> {
    const users = await prisma.user.findMany({
      where: RANKED_USER_FILTER,
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
      select: { ...leaderboardSelect, role: true },
    });
    if (!user) return null;

    // A rank among a list one does not appear in would be a number with no
    // meaning: not being ranked is the same answer as being hidden.
    if (
      user.role !== UserRole.STUDENT ||
      resolveVisibility(user.preferences) === LeaderboardVisibility.HIDDEN
    ) {
      return buildCurrentUserPosition(user, null);
    }

    const higher = await prisma.user.count({
      where: { AND: [RANKED_USER_FILTER, { xpTotal: { gt: user.xpTotal } }] },
    });
    return buildCurrentUserPosition(user, higher + 1);
  },

  /**
   * Rank of a user among ranked (student, non-HIDDEN) users, counting strictly
   * higher XP. Used by the dashboard stat, and aware of the same two conditions
   * so it agrees with the leaderboard. A HIDDEN user still receives their
   * numeric standing here - this powers their own private dashboard, not the
   * public board - but a teacher or an admin gets 0, because they are not in
   * the list the number would refer to.
   */
  async findUserRank(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true, role: true },
    });
    // 0 is this function's "no rank", already returned for an unknown user -
    // which the optional chain folds into the same branch, since a user who is
    // not there has no role either.
    if (user?.role !== UserRole.STUDENT) return 0;

    const higher = await prisma.user.count({
      where: { AND: [RANKED_USER_FILTER, { xpTotal: { gt: user.xpTotal } }] },
    });
    return higher + 1;
  },
};
