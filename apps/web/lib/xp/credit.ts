import type { Prisma } from "@cyberlearn/db";
import { computeLevel } from "@cyberlearn/lib";

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
  options: CreditXpOptions = {},
): Promise<CreditXpResult> {
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { xpTotal: true, level: true },
  });

  const newXpTotal = user.xpTotal + amount;
  const { level: newLevel } = computeLevel(newXpTotal);
  const leveledUp = newLevel > user.level;

  await tx.user.update({
    where: { id: userId },
    data: { xpTotal: newXpTotal, level: newLevel },
  });

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
