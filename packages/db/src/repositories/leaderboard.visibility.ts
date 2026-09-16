// Pure leaderboard anonymization logic.
//
// SECURITY: this module is the single chokepoint where leaderboard PII is
// stripped before it leaves the server. It deliberately imports ONLY the
// `LeaderboardVisibility` enum from @prisma/client (no Prisma client, no DB),
// so it can be unit-tested in isolation and never accidentally fetches data.
//
// Rules enforced here:
//   HIDDEN    → removed entirely (not listed, not counted in ranks)
//   ANONYMOUS → kept and ranked, but displayName / username / avatarUrl nulled
//               FOR OTHER USERS. The signed-in user always sees their own row
//               with their real identity (it is their own data) + isCurrentUser.
//   PUBLIC    → full identity
// A user with no preferences row (e.g. signed up but never finished onboarding)
// is treated as ANONYMOUS - privacy-first fallback.
//
// The output rows carry NO user id: a stable per-user identifier on an
// anonymized row is a re-identification primitive (and a cross-session tracking
// handle), so self-detection is exposed only via the isCurrentUser flag and the
// UI keys rows by rank.

import { LeaderboardVisibility } from "@prisma/client";

/** Raw user row as fetched for leaderboard computation, before anonymization. */
export interface RawLeaderboardUser {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xpTotal: number;
  streakDays: number;
  preferences: {
    leaderboardVisibility: LeaderboardVisibility;
    publicProfile: boolean;
  } | null;
}

/**
 * A leaderboard row safe to send to the client. For OTHER non-PUBLIC users the
 * identity fields (displayName / username / avatarUrl) are always null. The
 * signed-in user's own row keeps its real identity (their own data) and is
 * marked with isCurrentUser. No user id is ever included.
 */
export interface LeaderboardEntry {
  rank: number;
  isCurrentUser: boolean;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xpTotal: number;
  streakDays: number;
  /**
   * True only for a PUBLIC user whose profile page is itself public - i.e. the
   * only case where the leaderboard name may be rendered as a link to
   * /u/[username]. Always false for anonymized rows and for PUBLIC users who
   * kept their profile page private. Also false for the current user's own row
   * unless they are genuinely PUBLIC, so we never expose a private profile link.
   */
  hasPublicProfile: boolean;
}

/** The signed-in user's own standing. Always their real data - it is their own. */
export interface CurrentUserPosition {
  visibility: LeaderboardVisibility;
  /**
   * Null when the user is not on the public board at all - hidden by their own
   * preference, or not a student and therefore never ranked.
   */
  rank: number | null;
  level: number;
  xpTotal: number;
  streakDays: number;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

/**
 * Effective visibility for a user. Absence of a preferences row resolves to
 * ANONYMOUS so pre-onboarding users are never accidentally exposed.
 */
export function resolveVisibility(
  preferences: { leaderboardVisibility: LeaderboardVisibility } | null,
): LeaderboardVisibility {
  return preferences?.leaderboardVisibility ?? LeaderboardVisibility.ANONYMOUS;
}

/**
 * Transform raw rows (expected pre-ordered by xpTotal desc) into client-safe
 * entries. HIDDEN users are dropped and ranks are assigned continuously over
 * the survivors, so a hidden user never leaves a gap in the numbering.
 *
 * Identity is revealed for PUBLIC users and for the current user's own row
 * (their own data); every OTHER non-PUBLIC row is stripped of name, username,
 * and avatar before leaving the server.
 */
export function buildLeaderboard(
  rawUsers: RawLeaderboardUser[],
  currentUserId: string,
): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (const user of rawUsers) {
    const visibility = resolveVisibility(user.preferences);
    if (visibility === LeaderboardVisibility.HIDDEN) continue;
    const isCurrentUser = user.id === currentUserId;
    const isPublic = visibility === LeaderboardVisibility.PUBLIC;
    // The current user always sees their own identity; everyone else is
    // anonymized unless they are PUBLIC.
    const reveal = isCurrentUser || isPublic;
    entries.push({
      rank: entries.length + 1,
      isCurrentUser,
      displayName: reveal ? user.displayName : null,
      username: reveal ? user.username : null,
      avatarUrl: reveal ? user.avatarUrl : null,
      level: user.level,
      xpTotal: user.xpTotal,
      streakDays: user.streakDays,
      // A profile link is only offered for genuinely PUBLIC + public-profile
      // users - never for the current user's own anonymized row.
      hasPublicProfile: isPublic && (user.preferences?.publicProfile ?? false),
    });
  }
  return entries;
}

/**
 * Build the current user's own position card. This is the user's own data, so
 * their real identity is always returned; the UI shows "TOI" and (for HIDDEN)
 * a "masqué" notice instead of a rank. `rankAmongVisible` is ignored when HIDDEN.
 */
export function buildCurrentUserPosition(
  user: RawLeaderboardUser,
  // Null for a caller the board does not rank at all. Passing 0 does not mean
  // that: 0 is a number, and it reached the interface as a position.
  rankAmongRanked: number | null,
): CurrentUserPosition {
  const visibility = resolveVisibility(user.preferences);
  return {
    visibility,
    rank: visibility === LeaderboardVisibility.HIDDEN ? null : rankAmongRanked,
    level: user.level,
    xpTotal: user.xpTotal,
    streakDays: user.streakDays,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
}
