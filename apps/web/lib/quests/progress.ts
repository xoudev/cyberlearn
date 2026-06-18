import * as Sentry from "@sentry/nextjs";
import { prisma } from "@cyberlearn/db";
import type { Prisma, QuestType } from "@cyberlearn/db";
import { isoWeekKey, nextQuestProgress } from "@cyberlearn/lib";

interface ProgressOpts {
  /** Counter increment (lessons, perfect quiz, forum post). Defaults to 1. */
  amount?: number;
  /** Absolute value to raise progress to, monotonically (streak quest). */
  setTo?: number;
}

/**
 * Records weekly-quest progress for the active quest of `type`, scoped to the
 * current ISO week (Europe/Paris). Server-authoritative and best-effort: any
 * failure is reported but never propagated, so it can't break the triggering
 * action (lesson completion, quiz, etc.). Completing a real quest advances the
 * weekly-bonus tally.
 */
export async function recordQuestProgress(
  userId: string,
  type: QuestType,
  now: Date,
  opts: ProgressOpts = {},
): Promise<void> {
  try {
    const quest = await prisma.quest.findFirst({ where: { type, isActive: true } });
    if (!quest) return;
    const weekKey = isoWeekKey(now);

    await prisma.$transaction(async (tx) => {
      const newlyCompleted = await applyProgress(
        tx,
        userId,
        quest.id,
        quest.target,
        weekKey,
        now,
        opts,
      );
      if (newlyCompleted && quest.type !== "WEEKLY_BONUS") {
        const bonus = await tx.quest.findFirst({ where: { type: "WEEKLY_BONUS", isActive: true } });
        if (bonus) {
          await applyProgress(tx, userId, bonus.id, bonus.target, weekKey, now, { amount: 1 });
        }
      }
    });
  } catch (error) {
    // Quest progress is non-critical: report it but never break the caller.
    Sentry.captureException(error);
  }
}

/** Upserts one quest's weekly progress row. Returns true if it just completed. */
async function applyProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  questId: string,
  target: number,
  weekKey: string,
  now: Date,
  opts: ProgressOpts,
): Promise<boolean> {
  const existing = await tx.userQuestProgress.findUnique({
    where: { userId_questId_weekKey: { userId, questId, weekKey } },
    select: { progress: true, completed: true },
  });
  const progress = nextQuestProgress(existing?.progress ?? 0, target, opts);
  const completed = progress >= target;
  const newlyCompleted = completed && !(existing?.completed ?? false);

  await tx.userQuestProgress.upsert({
    where: { userId_questId_weekKey: { userId, questId, weekKey } },
    create: { userId, questId, weekKey, progress, completed, completedAt: completed ? now : null },
    update: { progress, completed, ...(newlyCompleted ? { completedAt: now } : {}) },
  });
  return newlyCompleted;
}
