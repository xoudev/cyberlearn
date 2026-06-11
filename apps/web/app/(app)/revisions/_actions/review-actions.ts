"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { computeLevel, computeSm2 } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";

export interface SubmitReviewResult {
  success: boolean;
  nextReviewAt?: Date;
  /** XP credited by this review (0 when the lesson was forgotten). */
  reviewXp?: number;
}

const qualitySchema = z.union([z.literal(1), z.literal(3), z.literal(5)]);

/**
 * Grades one due review: feeds the recall quality into SM-2 (next interval,
 * ease factor) and credits 10% of the lesson XP on a successful recall.
 * quality: 1 = forgot, 3 = hard, 5 = easy.
 */
export async function submitReviewAction(
  scheduleId: string,
  quality: 1 | 3 | 5,
): Promise<SubmitReviewResult> {
  const authUser = await requireRequestUser();

  const parsedId = z.string().uuid().safeParse(scheduleId);
  const parsedQuality = qualitySchema.safeParse(quality);
  if (!parsedId.success || !parsedQuality.success) return { success: false };

  const schedule = await prisma.reviewSchedule.findUnique({
    where: { id: parsedId.data },
  });
  if (schedule?.userId !== authUser.id) {
    return { success: false };
  }

  const result = computeSm2(parsedQuality.data, {
    easeFactor: schedule.easeFactor,
    intervalDays: schedule.intervalDays,
    repetitions: schedule.repetitions,
  });

  await prisma.reviewSchedule.update({
    where: { id: schedule.id },
    data: {
      easeFactor: result.easeFactor,
      intervalDays: result.intervalDays,
      repetitions: result.repetitions,
      nextReviewAt: result.nextReviewAt,
      lastReviewedAt: new Date(),
    },
  });

  // A successful recall (quality >= 3) earns 10% of the lesson XP.
  let reviewXp = 0;
  if (parsedQuality.data >= 3) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: schedule.lessonId },
      select: { xpReward: true },
    });
    reviewXp = lesson ? Math.floor(lesson.xpReward * 0.1) : 0;
    if (reviewXp > 0) {
      // Credit and recompute the level in one transaction. The previous
      // /review action incremented xpTotal without ever updating level, so
      // review XP could silently cross a level threshold.
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: authUser.id },
          data: { xpTotal: { increment: reviewXp } },
          select: { xpTotal: true },
        });
        await tx.user.update({
          where: { id: authUser.id },
          data: { level: computeLevel(user.xpTotal).level },
        });
      });
    }
  }

  revalidatePath("/revisions");
  revalidatePath("/dashboard");
  return { success: true, nextReviewAt: result.nextReviewAt, reviewXp };
}
