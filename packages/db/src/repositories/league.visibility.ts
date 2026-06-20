// Pure pod-ladder anonymization logic.
//
// SECURITY: like leaderboard.visibility.ts, this is the single chokepoint where
// pod-member PII is stripped before it leaves the server. It imports ONLY the
// LeaderboardVisibility enum from @prisma/client (no Prisma client, no DB) and
// reuses resolveVisibility() so the null->ANONYMOUS fallback has one definition.
// Output rows carry NO user id - a stable id on an anonymized row is a
// re-identification primitive (see leaderboard.visibility.ts header).
//
// ONE deliberate difference from the global leaderboard:
//   The leaderboard DROPS hidden users entirely. A pod must NOT - the 15-slot
//   ladder and its promotion/relegation zones depend on a stable member count
//   and continuous ranks, so a dropped member would shrink the pod and corrupt
//   the zone boundaries. HIDDEN members are therefore KEPT and ranked, but
//   anonymized exactly like ANONYMOUS (name / username / avatar nulled) so their
//   identity is never leaked. The signed-in user always sees their own row.

import { LeaderboardVisibility } from "@prisma/client";
import { podOutcome } from "@cyberlearn/lib";
import { resolveVisibility } from "./leaderboard.visibility.js";

/** Raw pod member as fetched for ladder computation, before anonymization. */
export interface RawPodMember {
  /** userId - used ONLY to match the current user; never emitted on an entry. */
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  seasonXp: number;
  preferences: {
    leaderboardVisibility: LeaderboardVisibility;
    publicProfile: boolean;
  } | null;
}

/**
 * A pod-ladder row safe to send to the client. For OTHER non-PUBLIC members the
 * identity fields are always null. The signed-in user's own row keeps its real
 * identity (their own data) and is marked isCurrentUser. No user id is included.
 */
export interface PodLadderEntry {
  rank: number;
  isCurrentUser: boolean;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  seasonXp: number;
  /** Only ever true for a PUBLIC member whose profile page is also public. */
  hasPublicProfile: boolean;
  /** In the promotion zone (top N of the pod) - advances a division at rollover. */
  promotion: boolean;
  /** In the relegation zone (bottom N) - drops a division at rollover. */
  relegation: boolean;
}

/**
 * Transform raw pod members into client-safe ladder entries. Members are
 * expected pre-ordered by seasonXp desc then joinedAt asc - the SAME tiebreak
 * the rollover uses (rollover.ts) - so this live preview matches the eventual
 * seating. Ranks are 1..n continuous over ALL members (HIDDEN included). The
 * promotion/relegation zones are derived once from podOutcome over the full pod
 * so they stay consistent with the rollover outcome.
 *
 * Identity is revealed only for PUBLIC members and for the current user's own
 * row; every OTHER non-PUBLIC row (ANONYMOUS, HIDDEN, or no-preferences) is
 * stripped of name, username, and avatar before leaving the server.
 */
export function buildPodLadder(
  rawMembers: RawPodMember[],
  currentUserId: string,
): PodLadderEntry[] {
  const memberCount = rawMembers.length;
  const { promote, relegate } = podOutcome(memberCount);

  return rawMembers.map((member, index) => {
    const rank = index + 1;
    const visibility = resolveVisibility(member.preferences);
    const isCurrentUser = member.id === currentUserId;
    const isPublic = visibility === LeaderboardVisibility.PUBLIC;
    // The current user always sees their own identity; everyone else is
    // anonymized unless they are PUBLIC. HIDDEN is treated exactly as ANONYMOUS
    // here (kept + ranked, identity nulled) - it is NOT dropped.
    const reveal = isCurrentUser || isPublic;
    return {
      rank,
      isCurrentUser,
      displayName: reveal ? member.displayName : null,
      username: reveal ? member.username : null,
      avatarUrl: reveal ? member.avatarUrl : null,
      level: member.level,
      seasonXp: member.seasonXp,
      hasPublicProfile: isPublic && (member.preferences?.publicProfile ?? false),
      promotion: rank <= promote,
      relegation: rank > memberCount - relegate,
    };
  });
}
