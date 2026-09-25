import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { isoWeekKey, MAX_FREEZES } from "@cyberlearn/lib";
import { creditXp } from "@/lib/xp/credit";

/**
 * Claiming a completed weekly quest, for the site's dashboard and the app
 * (/api/mobile/quests/claim): its XP through creditXp and any streak-freeze it
 * carries, then the quest marked claimed. Server-authoritative and idempotent:
 * a second claim, or two racing, credit once, thanks to the `claimed` guard
 * re-read inside the transaction.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity. Lives outside any "use server" module so it cannot be invoked
 * with an arbitrary userId.
 */

export interface ClaimQuestResult {
  ok: boolean;
  xpGained?: number;
  /** True when this claim carried the user over a level boundary. */
  leveledUp?: boolean;
  newLevel?: number;
  error?: string;
}

export const QUEST_ERROR = {
  invalid: "Quête invalide.",
  notCompleted: "Quête non complétée.",
  alreadyClaimed: "Récompense déjà réclamée.",
} as const;

export async function claimQuestFor(
  userId: string,
  questId: unknown,
  now: Date = new Date(),
): Promise<ClaimQuestResult> {
  const parsed = z.string().uuid().safeParse(questId);
  if (!parsed.success) return { ok: false, error: QUEST_ERROR.invalid };

  const weekKey = isoWeekKey(now);
  const row = await prisma.userQuestProgress.findUnique({
    where: { userId_questId_weekKey: { userId, questId: parsed.data, weekKey } },
    include: { quest: { select: { xpReward: true, freezeReward: true, code: true } } },
  });
  if (!row?.completed) return { ok: false, error: QUEST_ERROR.notCompleted };
  if (row.claimed) return { ok: false, error: QUEST_ERROR.alreadyClaimed };

  // The transaction returns the credit result, or null on a race / double-claim.
  // creditXp reports whether the user crossed a level boundary, so both the
  // site and the app can say so rather than levelling up in silence.
  const credited = await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction to prevent a double-claim race.
    const fresh = await tx.userQuestProgress.findUnique({
      where: { id: row.id },
      select: { claimed: true },
    });
    if (fresh?.claimed !== false) return null;

    await tx.userQuestProgress.update({
      where: { id: row.id },
      data: { claimed: true, claimedAt: now },
    });
    const credit = await creditXp(tx, userId, row.quest.xpReward, "QUEST", {
      notifyXp: row.quest.xpReward,
      metadata: { questCode: row.quest.code },
    });
    if (row.quest.freezeReward > 0) {
      const u = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { streakFreezes: true },
      });
      await tx.user.update({
        where: { id: userId },
        data: { streakFreezes: Math.min(MAX_FREEZES, u.streakFreezes + row.quest.freezeReward) },
      });
    }
    return credit;
  });

  if (!credited) return { ok: false, error: QUEST_ERROR.alreadyClaimed };
  return {
    ok: true,
    xpGained: credited.xpGained,
    leveledUp: credited.leveledUp,
    newLevel: credited.newLevel,
  };
}
