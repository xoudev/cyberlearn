// The site's badge-award flows - plain server module (NOT "use server"):
// callable only from server code, never exposed as a client-invocable action.
//
// The award primitive itself, awardBadges, lives in the db package with the
// XP credit it pays through, so a badge granted from the console follows the
// same rules (see packages/db/src/badges/award.ts). It is re-exported here for
// the lesson and path flows. What stays here is the site's own: evaluating the
// criteria at an event, and the silent retroactive sweep.

import { badgeRepository, prisma, userRepository } from "@cyberlearn/db";
import {
  awardBadges,
  EMPTY_AWARD,
  type AwardableBadge,
  type AwardBadgesResult,
} from "@cyberlearn/db/gamification";
import { buildBadgeCriterionStats, evaluateBadges } from "@cyberlearn/lib";

export { awardBadges, type AwardableBadge, type AwardBadgesResult };

/**
 * Event-hook award: evaluates ONLY the given criterion types against the
 * user's persisted facts and awards whatever unlocks, with notifications.
 *
 * Used by the real-time hooks - PERFECT_QUIZ on quiz submission, CUSTOM on
 * placement-test submission. Both run AFTER their triggering rows are
 * persisted, so the facts already include the trigger and no delta is needed.
 * Criterion semantics (count targets, event matching) live in
 * computeBadgeProgress: a {count: 3} badge only unlocks on the third event.
 */
export async function evaluateAndAwardBadges(
  userId: string,
  criterionTypes: readonly string[],
  context: Record<string, string>,
): Promise<AwardBadgesResult> {
  const allBadges = await badgeRepository.findAllActive();
  const candidates = allBadges.filter((b) => criterionTypes.includes(b.criterionType));
  if (candidates.length === 0) return EMPTY_AWARD;

  const [user, earnedIds, facts] = await Promise.all([
    userRepository.findForGamification(userId),
    badgeRepository.findUserBadgeIds(userId),
    badgeRepository.findCriterionFacts(userId),
  ]);
  if (!user) return EMPTY_AWARD;

  const newIds = evaluateBadges(candidates, earnedIds, buildBadgeCriterionStats(facts, user));
  if (newIds.length === 0) return EMPTY_AWARD;

  const earnedBadges = candidates.filter((b) => newIds.includes(b.id));
  return prisma.$transaction((tx) => awardBadges(tx, userId, earnedBadges, context));
}

/**
 * Retroactive catch-up award: atomic AND silent - the sweep repairs past
 * activity, it never notifies. Only real-time triggers notify.
 */
export async function retroAwardBadges(
  userId: string,
  badges: readonly AwardableBadge[],
): Promise<AwardBadgesResult> {
  if (badges.length === 0) return EMPTY_AWARD;
  return prisma.$transaction((tx) =>
    awardBadges(tx, userId, badges, { source: "retroactive" }, { notify: false }),
  );
}
