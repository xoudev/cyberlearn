"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@cyberlearn/db";
import { isoWeekKey, MAX_FREEZES } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";
import { creditXp } from "@/lib/xp/credit";

export interface ClaimQuestResult {
  ok: boolean;
  xpGained?: number;
  error?: string;
}

/**
 * Claims a completed weekly quest: credits its XP (via creditXp) and any freeze
 * reward, then marks it claimed. 100% server-authoritative and idempotent - a
 * second claim (or a concurrent race) is a no-op thanks to the `claimed` guard.
 */
export async function claimQuestAction(questId: string): Promise<ClaimQuestResult> {
  if (!z.string().uuid().safeParse(questId).success) return { ok: false, error: "Quête invalide." };

  const authUser = await requireRequestUser();
  const weekKey = isoWeekKey(new Date());

  const row = await prisma.userQuestProgress.findUnique({
    where: { userId_questId_weekKey: { userId: authUser.id, questId, weekKey } },
    include: { quest: { select: { xpReward: true, freezeReward: true, code: true } } },
  });
  if (!row?.completed) return { ok: false, error: "Quête non complétée." };
  if (row.claimed) return { ok: false, error: "Récompense déjà réclamée." };

  const now = new Date();

  // The transaction returns whether it actually credited (false on a race / double-claim).
  const credited = await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction to prevent a double-claim race.
    const fresh = await tx.userQuestProgress.findUnique({
      where: { id: row.id },
      select: { claimed: true },
    });
    if (fresh?.claimed !== false) return false;

    await tx.userQuestProgress.update({
      where: { id: row.id },
      data: { claimed: true, claimedAt: now },
    });
    await creditXp(tx, authUser.id, row.quest.xpReward, {
      notifyXp: row.quest.xpReward,
      metadata: { questCode: row.quest.code },
    });
    if (row.quest.freezeReward > 0) {
      const u = await tx.user.findUniqueOrThrow({
        where: { id: authUser.id },
        select: { streakFreezes: true },
      });
      await tx.user.update({
        where: { id: authUser.id },
        data: { streakFreezes: Math.min(MAX_FREEZES, u.streakFreezes + row.quest.freezeReward) },
      });
    }
    return true;
  });

  if (!credited) return { ok: false, error: "Récompense déjà réclamée." };

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { ok: true, xpGained: row.quest.xpReward };
}
