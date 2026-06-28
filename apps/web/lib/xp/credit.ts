import type { Prisma, XpSource } from "@cyberlearn/db";
import { computeLevel } from "@cyberlearn/lib";
import { recordSeasonXp } from "@/lib/league/record-season-xp";

/**
 * Single source of truth for crediting XP to a user.
 *
 * Adds `amount` XP, recomputes the level, persists both, and creates the
 * LEVEL_UP notification when the level increases. Runs inside the caller's
 * transaction so the XP, level and notification commit atomically with whatever
 * the caller is doing (quest claim, lesson completion, …). Mirrors the tx-aware
 * shape of {@link awardBadges}.
 */

export interface CreditXpResult {
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

  const newXpTotal = user.xpTotal + amount;
  const { level: newLevel } = computeLevel(newXpTotal);
  const leveledUp = newLevel > user.level;

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

  // Mirror the gain into the active season's leaderboard (no-op until a season
  // is seeded), so seasonXp stays in lock-step with every xp credit.
  await recordSeasonXp(tx, userId, amount);

  // Append to the XP ledger so the gain can be bucketed by period (month /
  // season) later. The running xpTotal alone cannot express this.
  await tx.xpLedger.create({ data: { userId, amount, source } });

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

  return { xpGained: amount, newXpTotal, previousLevel: user.level, newLevel, leveledUp };
}
