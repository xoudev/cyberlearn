// Single badge-award primitive - plain server module (NOT "use server"):
// callable only from server code, never exposed as a client-invocable action.
//
// All three award sites (lesson completion, path completion, retroactive
// sweep) go through awardBadges so the rules live in ONE place:
//  - createManyAndReturn + skipDuplicates tells us which rows were ACTUALLY
//    inserted; rows that lost a concurrent race or were already earned are
//    silently dropped and are never credited or notified again. Idempotence
//    is by construction, not by flags.
//  - Badge.xpReward of the inserted rows is credited to user.xpTotal inside
//    the SAME transaction, with the level recomputed via computeLevel.
//  - BADGE_EARNED notifications (metadata includes xpReward) are created for
//    the inserted rows only - and skipped entirely for the retroactive sweep.
//
// Known limit (documented, out of scope): threshold chaining. The XP credited
// by a badge does not re-run evaluation within the same pass, so a badge
// whose XP crosses an XP_THRESHOLD unlocks at the next event or sweep.

import { badgeRepository, prisma, userRepository } from "@cyberlearn/db";
import type { Prisma } from "@cyberlearn/db";
import { buildBadgeCriterionStats, evaluateBadges } from "@cyberlearn/lib";
import { creditXp } from "@/lib/xp/credit";

/** Structural shape - full Prisma Badge rows satisfy it. */
export interface AwardableBadge {
  id: string;
  name: string;
  description: string;
  rarity: string;
  xpReward: number;
}

export interface AwardBadgesResult {
  /** Badges actually inserted by THIS call (race losers excluded). */
  awarded: AwardableBadge[];
  /** Sum of xpReward over `awarded`. */
  xpGained: number;
  /** User's xpTotal after the credit - null when nothing was credited. */
  newXpTotal: number | null;
  /** User's level after the credit - null when nothing was credited. */
  newLevel: number | null;
}

const EMPTY_AWARD: AwardBadgesResult = {
  awarded: [],
  xpGained: 0,
  newXpTotal: null,
  newLevel: null,
};

export async function awardBadges(
  tx: Prisma.TransactionClient,
  userId: string,
  badges: readonly AwardableBadge[],
  context: Record<string, string>,
  options: { notify?: boolean } = {},
): Promise<AwardBadgesResult> {
  if (badges.length === 0) return EMPTY_AWARD;

  const inserted = await tx.userBadge.createManyAndReturn({
    data: badges.map((b) => ({
      userId,
      badgeId: b.id,
      // xpCredited stamps the row as credited at insertion time, so the
      // one-shot backfill script can target legacy (unstamped) rows only.
      context: { ...context, xpCredited: b.xpReward },
    })),
    skipDuplicates: true,
    select: { badgeId: true },
  });
  if (inserted.length === 0) return EMPTY_AWARD;

  const insertedIds = new Set(inserted.map((r) => r.badgeId));
  const awarded = badges.filter((b) => insertedIds.has(b.id));
  const xpGained = awarded.reduce((sum, b) => sum + b.xpReward, 0);

  let newXpTotal: number | null = null;
  let newLevel: number | null = null;
  if (xpGained > 0) {
    // Credit through the single XP source of truth (also keeps seasonXp in sync).
    // The level-up notification is suppressed here: the caller owns that message
    // (the lesson flow emits one combined LEVEL_UP for lesson + badge XP).
    const credit = await creditXp(tx, userId, xpGained, { notifyLevelUp: false });
    newXpTotal = credit.newXpTotal;
    newLevel = credit.newLevel;
  }

  if (options.notify !== false) {
    await tx.notification.createMany({
      data: awarded.map((badge) => ({
        userId,
        type: "BADGE_EARNED" as const,
        title: `Badge obtenu : ${badge.name}`,
        body: badge.description,
        actionUrl: "/badges",
        metadata: { badgeId: badge.id, rarity: badge.rarity, xpReward: badge.xpReward },
      })),
    });
  }

  return { awarded, xpGained, newXpTotal, newLevel };
}

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
