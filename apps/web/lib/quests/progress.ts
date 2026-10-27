import * as Sentry from "@sentry/nextjs";
import { prisma, questRepository } from "@cyberlearn/db";
import type { Prisma, QuestType } from "@cyberlearn/db";
import { isoWeekKey, nextQuestProgress, previousIsoWeekKey } from "@cyberlearn/lib";

interface ProgressOpts {
  /** Counter increment (lessons, perfect quiz, forum post). Defaults to 1. */
  amount?: number;
  /** Absolute value to raise progress to, monotonically (streak quest). */
  setTo?: number;
}

/**
 * Records weekly-quest progress for the quest of `type` the current ISO week
 * (Europe/Paris) asks for, if it asks for one: the week draws four quests from
 * the pool (questRepository.ensureWeek), and a kind it did not draw counts for
 * nothing. Server-authoritative and best-effort: any failure is reported but
 * never propagated, so it can't break the triggering action (lesson
 * completion, quiz, etc.). Completing a real quest advances the weekly-bonus
 * tally.
 */
export async function recordQuestProgress(
  userId: string,
  type: QuestType,
  now: Date,
  opts: ProgressOpts = {},
): Promise<void> {
  try {
    const weekKey = isoWeekKey(now);
    const week = await questRepository.ensureWeek(weekKey, previousIsoWeekKey(now));
    const quest = week.find((q) => q.type === type);
    if (!quest) return;
    const bonus = week.find((q) => q.type === "WEEKLY_BONUS");

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
      if (newlyCompleted && quest.type !== "WEEKLY_BONUS" && bonus) {
        await applyProgress(tx, userId, bonus.id, bonus.target, weekKey, now, { amount: 1 });
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
