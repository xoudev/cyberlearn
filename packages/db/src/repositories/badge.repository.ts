import {
  buildBadgeCriterionStats,
  isBadgeUnlocked,
  type BadgeCriterionFacts,
} from "@cyberlearn/lib";
import type { BadgeRarity, Prisma } from "@prisma/client";
import { AUDIT_ACTION } from "../audit-actions.js";
import { awardBadges } from "../badges/award.js";
import { prisma } from "../prisma.js";
import { creditXp } from "../xp/credit.js";

/** What the audit log calls a badge granted, or taken away, from the console. */
export const BADGE_GRANT_ACTION = AUDIT_ACTION.user.badgeGrant;
export const BADGE_REVOKE_ACTION = AUDIT_ACTION.user.badgeRevoke;

export type BadgeGrantResult =
  | { ok: true; badgeName: string; xpCredited: number }
  | { ok: false; reason: "NO_BADGE" | "INACTIVE" | "ALREADY_EARNED" };

export type BadgeRevokeResult =
  | {
      ok: true;
      badgeName: string;
      /** XP the badge paid when awarded, as stamped on its row; 0 when never paid. */
      xpCredited: number;
      /** XP that actually came off: less than xpCredited when the total ran out. */
      xpTakenBack: number;
    }
  /**
   * STILL_EARNED: the account still meets the badge's criterion. Taken away,
   * the badge would come straight back, XP and all, at the next sweep of the
   * collection or the next lesson completed.
   */
  | { ok: false; reason: "NOT_EARNED" | "STILL_EARNED" };

/** A badge an account holds, as its page in the console lists it. */
export interface HeldBadge {
  badgeId: string;
  name: string;
  rarity: BadgeRarity;
  earnedAt: Date;
  /** XP the badge paid when awarded; 0 for a legacy row never paid. */
  xpCredited: number;
}

/** The XP a badge brought when it was awarded, as stamped on its row. */
function creditedXpOf(context: unknown): number {
  if (typeof context !== "object" || context === null || !("xpCredited" in context)) return 0;
  const { xpCredited } = context;
  return typeof xpCredited === "number" && xpCredited > 0 ? xpCredited : 0;
}

/** Reads the criterion facts through the given client: the app's, or a transaction's. */
async function readCriterionFacts(
  db: Prisma.TransactionClient,
  userId: string,
): Promise<BadgeCriterionFacts> {
  const [
    completedLessons,
    completedPaths,
    totalCertificates,
    perfectQuizCount,
    placementScores,
    earnedBadges,
  ] = await Promise.all([
    db.userLessonProgress.findMany({
      where: { userId, status: "COMPLETED" },
      select: { lessonId: true, lesson: { select: { category: true } } },
    }),
    db.userPathProgress.findMany({
      where: { userId, status: "COMPLETED" },
      select: { pathId: true },
    }),
    db.certificate.count({ where: { userId } }),
    db.quizAttempt.count({ where: { userId, score: 100 } }),
    db.userPlacementResult.findUnique({
      where: { userId },
      select: { devScore: true, cybersecScore: true, networkScore: true },
    }),
    db.userBadge.findMany({
      where: { userId },
      select: { badge: { select: { refCode: true } } },
    }),
  ]);
  return {
    completedLessons: completedLessons.map((r) => ({
      lessonId: r.lessonId,
      category: r.lesson.category,
    })),
    completedPathIds: completedPaths.map((r) => r.pathId),
    totalCertificates,
    perfectQuizCount,
    earnedBadgeRefCodes: earnedBadges.map((r) => r.badge.refCode),
    placementScores,
  };
}

/**
 * Whether a badge's criterion would still be met once it is taken away: the
 * account without the badge, and without the XP the revocation takes back.
 * Evaluated by isBadgeUnlocked, the rule the collection's sweep and the
 * lesson flow award by, so a yes here is a badge that would come back.
 */
async function criterionMetWithout(
  tx: Prisma.TransactionClient,
  userId: string,
  badge: { id: string; refCode: string; criterionType: string; criterionData: unknown },
  xpTakenBack: number,
): Promise<boolean> {
  const [user, facts] = await Promise.all([
    tx.user.findUnique({ where: { id: userId }, select: { xpTotal: true, streakDays: true } }),
    readCriterionFacts(tx, userId),
  ]);
  if (!user) return false;
  const stats = buildBadgeCriterionStats(
    {
      ...facts,
      earnedBadgeRefCodes: facts.earnedBadgeRefCodes.filter((code) => code !== badge.refCode),
    },
    { xpTotal: Math.max(0, user.xpTotal - xpTakenBack), streakDays: user.streakDays },
  );
  return isBadgeUnlocked({ ...badge, isActive: true }, stats);
}

export const badgeRepository = {
  /** All active badges - loaded once per request for badge evaluation. */
  async findAllActive() {
    return prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: "asc" }, { name: "asc" }],
    });
  },

  /** Set of badge IDs already earned by a user - used to skip re-evaluation. */
  async findUserBadgeIds(userId: string): Promise<ReadonlySet<string>> {
    const rows = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    return new Set(rows.map((r) => r.badgeId));
  },

  /** All badges earned by a user, with badge details. */
  async findUserBadges(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    });
  },

  /**
   * The badges an account holds, newest first, for its page in the console:
   * with the XP each one paid when it was awarded, which is what a revocation
   * would take back.
   */
  async heldForConsole(userId: string): Promise<HeldBadge[]> {
    const rows = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: [{ earnedAt: "desc" }, { id: "desc" }],
      select: {
        badgeId: true,
        earnedAt: true,
        context: true,
        badge: { select: { name: true, rarity: true } },
      },
    });
    return rows.map((row) => ({
      badgeId: row.badgeId,
      name: row.badge.name,
      rarity: row.badge.rarity,
      earnedAt: row.earnedAt,
      xpCredited: creditedXpOf(row.context),
    }));
  },

  /**
   * Raw facts needed to evaluate every badge criterion for a user.
   * Feed into buildBadgeCriterionStats (@cyberlearn/lib); callers apply any
   * not-yet-persisted trigger delta (e.g. the lesson being completed now).
   */
  async findCriterionFacts(userId: string): Promise<BadgeCriterionFacts> {
    return readCriterionFacts(prisma, userId);
  },

  /**
   * Grants a badge by hand, from the console, through awardBadges: the badge
   * pays its XP and the learner gets the same BADGE_EARNED notification as
   * for one earned, because from their side it is one. Only an active badge:
   * an inactive one is hidden from the collection the learner would look for
   * it in. The audit row is written in the same transaction.
   */
  async grant(
    userId: string,
    badgeId: string,
    options: { actorId: string; reason: string },
  ): Promise<BadgeGrantResult> {
    return prisma.$transaction(async (tx): Promise<BadgeGrantResult> => {
      const badge = await tx.badge.findUnique({
        where: { id: badgeId },
        select: {
          id: true,
          name: true,
          description: true,
          rarity: true,
          xpReward: true,
          isActive: true,
        },
      });
      if (!badge) return { ok: false, reason: "NO_BADGE" };
      if (!badge.isActive) return { ok: false, reason: "INACTIVE" };

      // awardBadges inserts with skipDuplicates: a badge already held comes
      // back as nothing awarded, and nothing is paid twice.
      const award = await awardBadges(tx, userId, [badge], { source: "console" });
      if (award.awarded.length === 0) return { ok: false, reason: "ALREADY_EARNED" };

      await tx.auditLog.create({
        data: {
          actorId: options.actorId,
          action: BADGE_GRANT_ACTION,
          targetType: "User",
          targetId: userId,
          metadata: {
            badgeId: badge.id,
            badgeName: badge.name,
            xpCredited: award.xpGained,
            reason: options.reason,
          },
        },
      });

      return { ok: true, badgeName: badge.name, xpCredited: award.xpGained };
    });
  },

  /**
   * Takes a badge away, from the console. With `takeBackXp`, the XP it paid
   * comes back off the total as a correction (source ADJUSTMENT): the amount
   * stamped on the row when it was awarded, so a badge whose reward changed
   * since takes back what it gave. A legacy row with no stamp was never paid,
   * and nothing is taken for it. Taking back stops at zero, as every
   * correction does: the result gives both what the badge paid and what
   * actually came off. The notification it sent stays: it was true when it
   * was sent.
   *
   * Refused while the account still meets the badge's criterion, the badge
   * and the XP taken back set aside: nothing marks a badge as revoked, so the
   * collection's sweep, or the next lesson completed, would award it again
   * and pay it again. What fills the criterion is corrected first (the XP,
   * the streak), or the criterion itself, or the badge is deactivated: an
   * inactive badge is awarded by nothing, and is always revocable.
   */
  async revoke(
    userId: string,
    badgeId: string,
    options: { actorId: string; reason: string; takeBackXp: boolean },
  ): Promise<BadgeRevokeResult> {
    return prisma.$transaction(async (tx): Promise<BadgeRevokeResult> => {
      const held = await tx.userBadge.findUnique({
        where: { userId_badgeId: { userId, badgeId } },
        select: {
          context: true,
          badge: {
            select: {
              name: true,
              refCode: true,
              isActive: true,
              criterionType: true,
              criterionData: true,
            },
          },
        },
      });
      if (!held) return { ok: false, reason: "NOT_EARNED" };

      const credited = creditedXpOf(held.context);
      const { badge } = held;
      if (
        badge.isActive &&
        (await criterionMetWithout(
          tx,
          userId,
          { id: badgeId, ...badge },
          options.takeBackXp ? credited : 0,
        ))
      ) {
        return { ok: false, reason: "STILL_EARNED" };
      }

      // Removed by a guarded delete rather than by id: of two revocations at
      // once, one removes the row and the other finds nothing to take back.
      const removed = await tx.userBadge.deleteMany({ where: { userId, badgeId } });
      if (removed.count === 0) return { ok: false, reason: "NOT_EARNED" };

      let xpTakenBack = 0;
      if (options.takeBackXp && credited > 0) {
        const credit = await creditXp(tx, userId, -credited, "ADJUSTMENT", {
          notifyLevelUp: false,
        });
        xpTakenBack = Math.abs(credit.xpGained);
      }

      await tx.auditLog.create({
        data: {
          actorId: options.actorId,
          action: BADGE_REVOKE_ACTION,
          targetType: "User",
          targetId: userId,
          metadata: {
            badgeId,
            badgeName: badge.name,
            xpCredited: credited,
            xpTakenBack,
            reason: options.reason,
          },
        },
      });

      return { ok: true, badgeName: badge.name, xpCredited: credited, xpTakenBack };
    });
  },

  /** Every badge the account holds, with what it was earned for, for its GDPR export (rgpd/build-export.ts). */
  async exportFor(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      select: {
        earnedAt: true,
        context: true,
        badge: { select: { name: true, rarity: true, description: true } },
      },
    });
  },
};
