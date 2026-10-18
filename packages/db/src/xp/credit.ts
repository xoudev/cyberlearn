import type { Prisma, XpSource } from "@prisma/client";
import { computeLevel } from "@cyberlearn/lib";
import { recordSeasonXp } from "../league/record-season-xp.js";

/**
 * Single source of truth for crediting XP to a user.
 *
 * Adds `amount` XP, recomputes the level, persists both, and creates the
 * LEVEL_UP notification when the level increases. Runs inside the caller's
 * transaction so the XP, level and notification commit atomically with whatever
 * the caller is doing (quest claim, lesson completion, …). Mirrors the tx-aware
 * shape of {@link awardBadges}.
 *
 * Lives in the db package so the site and the console credit through the same
 * code: the console's corrections (source ADJUSTMENT) are the one caller that
 * passes a negative amount. XP taken back stops at zero, and what is written to
 * the ledger, the season and the result is what actually came off, which can
 * be less than what was asked. A lower total can mean a lower level: it is
 * recomputed the same way, and nobody is notified of it.
 */

export interface CreditXpResult {
  /** XP actually credited: negative when taken back, never below the total held. */
  xpGained: number;
  newXpTotal: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
}

export interface CreditXpOptions {
  /** Suppress the automatic LEVEL_UP notification (the caller will handle it). */
  notifyLevelUp?: boolean;
  /** XP figure shown in the LEVEL_UP notification body (defaults to `amount`). */
  notifyXp?: number;
  /** Extra fields merged into the LEVEL_UP notification metadata. */
  metadata?: Prisma.InputJsonObject;
}

export async function creditXp(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  source: XpSource,
  options: CreditXpOptions = {},
): Promise<CreditXpResult> {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { xpTotal: true, level: true },
  });

  const applied = amount < 0 ? Math.max(amount, -user.xpTotal) : amount;
  if (amount < 0 && applied === 0) {
    // Nothing left to take back: no row anywhere says otherwise.
    return {
      xpGained: 0,
      newXpTotal: user.xpTotal,
      previousLevel: user.level,
      newLevel: user.level,
      leveledUp: false,
    };
  }

  const newXpTotal = user.xpTotal + applied;
  const { level: newLevel } = computeLevel(newXpTotal);
  const leveledUp = newLevel > user.level;

  if (applied >= 0) {
    // Atomic increment on xpTotal so concurrent credits (two tabs, a double
    // submit, overlapping lesson/review/quest/challenge/badge credits) never
    // clobber each other - an absolute set was a lost-update race that left
    // xpTotal under-counting vs the xp_ledger and seasonXp. The level is set from
    // the read total (best-effort, self-corrects on the next credit); only the
    // persisted xpTotal must be exact.
    await tx.user.update({
      where: { id: userId },
      data: { xpTotal: { increment: amount }, level: newLevel },
    });
  } else {
    // Still an increment, guarded so the total cannot go below zero: the
    // condition is checked again on the locked row, so a correction racing
    // another one fails here and rolls back instead of overdrawing.
    const lowered = await tx.user.updateMany({
      where: { id: userId, xpTotal: { gte: -applied } },
      data: { xpTotal: { increment: applied }, level: newLevel },
    });
    if (lowered.count === 0) {
      throw new Error("creditXp: the XP total changed while it was being lowered");
    }
  }

  // Mirror the gain into the active season's leaderboard (no-op until a season
  // is seeded), so seasonXp stays in lock-step with every xp credit.
  await recordSeasonXp(tx, userId, applied);

  // Append to the XP ledger so the gain can be bucketed by period (month /
  // season) later. The running xpTotal alone cannot express this.
  await tx.xpLedger.create({ data: { userId, amount: applied, source } });

  if (leveledUp && options.notifyLevelUp !== false) {
    const shownXp = options.notifyXp ?? amount;
    await tx.notification.create({
      data: {
        userId,
        type: "LEVEL_UP",
        title: `Niveau ${String(newLevel)} atteint !`,
        body: `+${String(shownXp)} XP, tu passes au niveau ${String(newLevel)}.`,
        actionUrl: "/profile",
        metadata: {
          previousLevel: user.level,
          newLevel,
          xpTotal: newXpTotal,
          ...options.metadata,
        },
      },
    });
  }

  return { xpGained: applied, newXpTotal, previousLevel: user.level, newLevel, leveledUp };
}
