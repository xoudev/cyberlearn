import { leaderboardRepository, type LeaderboardEntry } from "@cyberlearn/db";
import { resolveAvatarSrcMany } from "@/lib/avatar/storage";

/**
 * What the /leaderboard page reads, ready to draw: the board of the period,
 * its real count, the reader's place, and each row's link and avatar decided
 * here rather than in the browser.
 *
 * A row carries no user id (leaderboard.visibility.ts), so whether a name may
 * open a profile, which picture to show and whether it is a friend all have
 * to be settled before the rows leave the server. The repository has already
 * said who is named; this only turns that into an href and a resolved avatar.
 */

/** The rows a board sends: the podium, the top twelve and the reader's neighbours. */
export const BOARD_ROWS = 100;

/** A leaderboard row as the page draws it. */
export interface BoardRow extends LeaderboardEntry {
  /** The profile the name opens, or null when it may not be a link. */
  profileHref: string | null;
  /**
   * Resolved here: a signed URL, a built-in path, a glyph marker, or null.
   * Null on every anonymised row, whose stored avatar never left the
   * repository.
   */
  avatarSrc: string | null;
}

/** Each row's link and picture, in one signing round-trip for the whole board. */
export async function boardRows(entries: readonly LeaderboardEntry[]): Promise<BoardRow[]> {
  const avatars = await resolveAvatarSrcMany(entries.map((e) => e.avatarUrl));
  return entries.map((entry, i) => ({
    ...entry,
    profileHref: entry.hasPublicProfile && entry.username !== null ? `/u/${entry.username}` : null,
    avatarSrc: entry.avatarUrl === null ? null : (avatars[i] ?? null),
  }));
}

/** The reader on the public board: their place, their XP on it, their level. */
export interface BoardStanding {
  rank: number;
  xp: number;
  level: number;
}

export interface PublicBoard {
  rows: BoardRow[];
  /** Everybody the board ranks, where `rows` stops at BOARD_ROWS. */
  total: number;
  /** Null when this board does not rank the reader. */
  standing: BoardStanding | null;
}

/**
 * The public board for all time (`start` null) or since `start`.
 *
 * The reader's place comes from the board itself rather than from the rows
 * sent: a reader ranked 240th is told so even though the list stops at 100,
 * and a hidden reader, or one with no XP in the period, is told they are not
 * on it.
 */
export async function publicBoardFor(
  userId: string,
  start: Date | null,
  limit: number = BOARD_ROWS,
): Promise<PublicBoard> {
  if (start === null) {
    const [entries, total, position] = await Promise.all([
      leaderboardRepository.findTopUsers(limit, userId),
      leaderboardRepository.countRanked(),
      leaderboardRepository.findCurrentUserPosition(userId),
    ]);
    // Null for a hidden reader, or one the board does not rank at all.
    const rank = position?.rank ?? null;
    return {
      rows: await boardRows(entries),
      total,
      standing:
        position === null || rank === null
          ? null
          : { rank, xp: position.xpTotal, level: position.level },
    };
  }

  const [board, position] = await Promise.all([
    leaderboardRepository.findTopUsersSince(start, limit, userId),
    leaderboardRepository.findCurrentUserPosition(userId),
  ]);
  return {
    rows: await boardRows(board.entries),
    total: board.total,
    standing:
      board.standing === null || position === null
        ? null
        : { ...board.standing, level: position.level },
  };
}
