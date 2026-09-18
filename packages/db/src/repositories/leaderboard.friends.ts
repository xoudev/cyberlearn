import { UserRole } from "@prisma/client";
import type { LeaderboardEntry } from "./leaderboard.visibility.js";

/**
 * The board a person sees of their own friends, and the one rule that makes it
 * safe to show.
 *
 * The public board has three visibilities and anonymises the middle one. That
 * works over a hundred strangers and fails over five friends: a reader knows
 * who their own friends are, so four named rows and one "Anonyme" name the
 * fifth. There is no anonymous row here for that reason - somebody is listed by
 * name or is not listed at all, and which of the two is their own decision,
 * taken separately from the public board because it is a different audience.
 *
 * Off by default, and never inferred. ANONYMOUS on the public board says
 * nothing about this one, in either direction.
 *
 * Kept apart from the query, like leaderboard.visibility.ts: the repository's
 * where-clause narrows for speed, and this function is what actually decides.
 * A second caller writing its own query cannot skip it.
 */

/** A candidate row, before the opt-in is checked. */
export interface RawFriendsBoardUser {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xpTotal: number;
  streakDays: number;
  role: UserRole;
  preferences: { friendsLeaderboard: boolean } | null;
}

/**
 * Turns the candidates into the board, ranked continuously over whoever is
 * left. Rows are expected pre-ordered by xpTotal, descending.
 *
 * The reader is always on their own board: it is their own data, and a board
 * of friends with the reader missing from it reads as a bug. It does not put
 * them on anybody else's - that still takes the switch.
 *
 * Only students are ranked, the same rule the public board applies: a teacher
 * above their students is a scoreboard nobody can win.
 */
export function buildFriendsBoard(
  rows: RawFriendsBoardUser[],
  currentUserId: string,
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (const user of rows) {
    if (user.role !== UserRole.STUDENT) continue;
    const isCurrentUser = user.id === currentUserId;
    if (!isCurrentUser && user.preferences?.friendsLeaderboard !== true) continue;
    entries.push({
      rank: entries.length + 1,
      isCurrentUser,
      // No stripping: everybody here is either the reader or somebody who
      // asked to be named to their friends.
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      level: user.level,
      xpTotal: user.xpTotal,
      streakDays: user.streakDays,
      // A friend can open a friend's profile whatever its setting, so the name
      // is a link whenever there is a handle to point at.
      hasPublicProfile: user.username !== null,
    });
  }
  return entries;
}
