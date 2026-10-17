import { prisma } from "../prisma.js";
import { creditXp } from "./credit.js";

/** What the audit log calls an XP correction from the console. */
export const XP_ADJUSTMENT_ACTION = "admin.user.xp.adjust";

export interface AdjustXpInput {
  userId: string;
  /** XP to add (positive) or take back (negative). Never zero. */
  delta: number;
  /** Why, in the administrator's words. Kept in the audit log. */
  reason: string;
  /** Who made the correction. */
  actorId: string;
}

export interface XpStanding {
  xpTotal: number;
  level: number;
}

export type AdjustXpResult =
  | {
      ok: true;
      /** What was asked. */
      requested: number;
      /** What the total actually moved by: less than asked when it reached zero. */
      applied: number;
      before: XpStanding;
      after: XpStanding;
    }
  | { ok: false; reason: "NO_USER" | "NOTHING_TO_TAKE_BACK" };

/**
 * Adds XP to an account, or takes some back, from the console.
 *
 * It goes through creditXp with its own source, ADJUSTMENT, so the correction
 * is a line in the ledger like any other: the week's and the month's boards,
 * which add the ledger up, and the season count it as they count the rest. A
 * correction made today counts in today's period, whenever the XP it corrects
 * was earned. Nobody is notified, a level up included: a correction is not an
 * achievement.
 *
 * The ledger has no column for a reason, so the reason goes in the audit row,
 * written in the same transaction with the totals before and after: a
 * correction and its trace land together or not at all.
 */
export async function adjustXp(input: AdjustXpInput): Promise<AdjustXpResult> {
  const { userId, delta, reason, actorId } = input;
  return prisma.$transaction(async (tx): Promise<AdjustXpResult> => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true, level: true },
    });
    if (!user) return { ok: false, reason: "NO_USER" };
    if (delta < 0 && user.xpTotal === 0) return { ok: false, reason: "NOTHING_TO_TAKE_BACK" };

    const credit = await creditXp(tx, userId, delta, "ADJUSTMENT", { notifyLevelUp: false });
    // The total read above can have reached zero by the time creditXp read it.
    if (credit.xpGained === 0) return { ok: false, reason: "NOTHING_TO_TAKE_BACK" };
    // From the figures creditXp read and wrote, so before and after agree.
    const before: XpStanding = {
      xpTotal: credit.newXpTotal - credit.xpGained,
      level: credit.previousLevel,
    };
    const after: XpStanding = { xpTotal: credit.newXpTotal, level: credit.newLevel };

    await tx.auditLog.create({
      data: {
        actorId,
        action: XP_ADJUSTMENT_ACTION,
        targetType: "User",
        targetId: userId,
        // Spread into plain objects: an interface is not a JSON value to Prisma.
        metadata: {
          delta,
          applied: credit.xpGained,
          reason,
          before: { ...before },
          after: { ...after },
        },
      },
    });

    return { ok: true, requested: delta, applied: credit.xpGained, before, after };
  });
}
