import { type Prisma, LeaderboardVisibility, UserRole } from "@prisma/client";
import type { FriendshipView } from "@cyberlearn/lib/social/friendship";
import { prisma } from "../prisma.js";
import { friendshipRepository } from "./friendship.repository.js";
import { buildFriendsBoard } from "./leaderboard.friends.js";
import {
  buildCurrentUserPosition,
  buildLeaderboard,
  resolveVisibility,
} from "./leaderboard.visibility.js";
import type { CurrentUserPosition, LeaderboardEntry } from "./leaderboard.visibility.js";

export type { LeaderboardEntry, CurrentUserPosition } from "./leaderboard.visibility.js";
export type { RawFriendsBoardUser } from "./leaderboard.friends.js";

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
//
// Participation: a student enters the board with their first XP. Accounts
// that signed up and never earned any filled the board with "Anonyme · 0 XP"
// rows that ranked nothing.
const RANKED_USER_FILTER: Prisma.UserWhereInput = {
  role: UserRole.STUDENT,
  xpTotal: { gt: 0 },
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

/**
 * How many friends the board reads. Friendship is a list people curate by hand,
 * so this is a seatbelt rather than a working limit.
 */
const FRIENDS_BOARD_LIMIT = 200;

/** A friends board, and whether the reader is on their friends' boards in turn. */
export interface FriendsBoard {
  entries: LeaderboardEntry[];
  listedForFriends: boolean;
}

/**
 * The public board over a period of the ledger: this week, this month.
 *
 * `xpTotal` on each entry is what the board ranks by, the XP earned since the
 * period opened, so a screen draws a period board with the same row as the
 * all-time one.
 */
export interface PeriodBoard {
  /** The first rows, as many as the caller asked for. */
  entries: LeaderboardEntry[];
  /** Everybody the period ranks, not only the rows sent. */
  total: number;
  /**
   * The reader's place and their XP of the period, or null when the period
   * does not rank them: no XP since it opened, hidden, or not a student.
   * Like findCurrentUserPosition, the rank counts the players strictly ahead.
   */
  standing: { rank: number; xp: number } | null;
}

/** "a before b" for two uuids, in the order Postgres gives them: every board's tiebreak. */
function byIdAscending(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const friendsBoardSelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  level: true,
  xpTotal: true,
  streakDays: true,
  role: true,
  preferences: { select: { friendsLeaderboard: true } },
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
    // For the friend mark and the row's "Ajouter", which buildLeaderboard
    // sets on public rows only: the reader's relations with the people listed.
    const relations = await friendshipRepository.viewsOf(
      currentUserId,
      users.map((user) => user.id),
    );
    return buildLeaderboard(users, currentUserId, relations);
  },

  /**
   * The id behind a handle shown on the public board, for a friend request
   * sent from it: the rows carry no id (leaderboard.visibility.ts), only the
   * handle of a PUBLIC player. Null for a handle nobody has, or one the board
   * does not name - anonymous, hidden, not a student, or no XP yet - so the
   * board's button cannot be used to reach somebody it does not show.
   */
  async findPublicPlayerId(username: string): Promise<string | null> {
    const player = await prisma.user.findFirst({
      where: {
        AND: [
          RANKED_USER_FILTER,
          { username },
          { preferences: { is: { leaderboardVisibility: LeaderboardVisibility.PUBLIC } } },
        ],
      },
      select: { id: true },
    });
    return player?.id ?? null;
  },

  /**
   * How many players the all-time board ranks. findTopUsers returns the first
   * hundred, and "100 joueurs classés" under a list cut at a hundred was the
   * length of the list, not the number of players.
   */
  async countRanked(): Promise<number> {
    return prisma.user.count({ where: RANKED_USER_FILTER });
  },

  /**
   * The public board since `start`: the same players as findTopUsers, ranked
   * by the XP the ledger recorded from that moment on.
   *
   * The same two conditions hold (RANKED_USER_FILTER, read through the
   * ledger's user), and buildLeaderboard strips and marks the rows exactly as
   * on the all-time board. Taking part means earning XP in the period: a
   * player with nothing since Monday is not "0 XP" on this week's board, the
   * way an account with no XP at all is not on the all-time one.
   *
   * The sums are taken in SQL, one row per player active in the period, and
   * the whole list is read: the count and the reader's place are both
   * answered from it, where a cut list could answer neither. The people
   * behind the rows are then read for the first `limit` only. The range on
   * createdAt, across every user, is what the ledger's (createdAt, userId)
   * index is for; the (userId, createdAt) one cannot serve it.
   */
  async findTopUsersSince(start: Date, limit: number, currentUserId: string): Promise<PeriodBoard> {
    const sums = await prisma.xpLedger.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: start }, user: { is: RANKED_USER_FILTER } },
      _sum: { amount: true },
      having: { amount: { _sum: { gt: 0 } } },
      orderBy: [{ _sum: { amount: "desc" } }, { userId: "asc" }],
    });
    const xpOf = (row: (typeof sums)[number]): number => row._sum.amount ?? 0;

    const top = sums.slice(0, limit);
    const topIds = top.map((row) => row.userId);
    const [users, relations] =
      top.length === 0
        ? [[], new Map<string, FriendshipView>()]
        : await Promise.all([
            prisma.user.findMany({ where: { id: { in: topIds } }, select: leaderboardSelect }),
            friendshipRepository.viewsOf(currentUserId, topIds),
          ]);
    const byId = new Map(users.map((user) => [user.id, user]));
    // In the ledger's order, each person carrying the period's XP in place of
    // their total: that is the figure this board ranks by and shows.
    const rows = top.flatMap((row) => {
      const user = byId.get(row.userId);
      return user === undefined ? [] : [{ ...user, xpTotal: xpOf(row) }];
    });

    const mine = sums.find((row) => row.userId === currentUserId);
    const standing =
      mine === undefined
        ? null
        : { rank: sums.filter((row) => xpOf(row) > xpOf(mine)).length + 1, xp: xpOf(mine) };

    return {
      entries: buildLeaderboard(rows, currentUserId, relations),
      total: sums.length,
      standing,
    };
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
      user.xpTotal <= 0 ||
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
   * The reader's friends, ranked, and only the ones who asked to be there.
   *
   * The query narrows to accepted friends who are students and who turned the
   * switch on, plus the reader themselves; buildFriendsBoard applies the same
   * rules again and is what actually decides. A pending request is not a
   * friendship and never reaches this list.
   *
   * `listedForFriends` comes back with it because the two belong together: a
   * board showing the reader among their friends, while the reader is absent
   * from every one of those friends' own boards, is a thing the page has to be
   * able to say out loud. It costs nothing - the reader's own row is already
   * being read.
   *
   * With `since`, the same people ranked by the XP the ledger recorded from
   * that moment on, which is what each row then carries as its XP. Nobody
   * leaves the board for a quiet week: on a list of friends, a name dropping
   * out reads as a falling-out rather than as "0 XP".
   */
  async findFriendsBoard(userId: string, since: Date | null = null): Promise<FriendsBoard> {
    const friends = await friendshipRepository.listFriends(userId, FRIENDS_BOARD_LIMIT);
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: userId },
          {
            id: { in: friends.map((edge) => edge.person.id) },
            role: UserRole.STUDENT,
            preferences: { is: { friendsLeaderboard: true } },
          },
        ],
      },
      orderBy: [{ xpTotal: "desc" }, { id: "asc" }],
      select: friendsBoardSelect,
    });
    const listedForFriends =
      users.find((u) => u.id === userId)?.preferences?.friendsLeaderboard === true;
    if (since === null) return { entries: buildFriendsBoard(users, userId), listedForFriends };

    const sums = await prisma.xpLedger.groupBy({
      by: ["userId"],
      where: { userId: { in: users.map((u) => u.id) }, createdAt: { gte: since } },
      _sum: { amount: true },
    });
    // XP taken back from the console is a negative line, counted in the period
    // it was taken back in, which can then add up below zero. The board says
    // 0 for that period, as the public one leaves the player off it.
    const earned = new Map(sums.map((row) => [row.userId, Math.max(0, row._sum.amount ?? 0)]));
    const ranked = users
      .map((user) => ({ ...user, xpTotal: earned.get(user.id) ?? 0 }))
      .sort((a, b) => b.xpTotal - a.xpTotal || byIdAscending(a.id, b.id));
    return { entries: buildFriendsBoard(ranked, userId), listedForFriends };
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
    // Not on the board until the first XP (RANKED_USER_FILTER).
    if (user.xpTotal <= 0) return 0;

    const higher = await prisma.user.count({
      where: { AND: [RANKED_USER_FILTER, { xpTotal: { gt: user.xpTotal } }] },
    });
    return higher + 1;
  },
};
