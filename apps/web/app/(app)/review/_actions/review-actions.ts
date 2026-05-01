"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@cyberlearn/db";
import { computeSm2 } from "@cyberlearn/lib";
import { requireRequestUser } from "@/lib/auth";

/** quality: 1 = forgot, 3 = hard, 5 = easy */
export async function submitReviewAction(
  scheduleId: string,
  quality: 1 | 3 | 5,
): Promise<{ success: boolean; nextReviewAt?: Date }> {
  const authUser = await requireRequestUser();

  const schedule = await prisma.reviewSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule || schedule.userId !== authUser.id) {
    return { success: false };
  }

  // SAFETY: quality values are constrained by the caller's type
  const result = computeSm2(quality as 1 | 3 | 5, {
    easeFactor: schedule.easeFactor,
    intervalDays: schedule.intervalDays,
    repetitions: schedule.repetitions,
  });

  await prisma.reviewSchedule.update({
    where: { id: scheduleId },
    data: {
      easeFactor: result.easeFactor,
      intervalDays: result.intervalDays,
      repetitions: result.repetitions,
      nextReviewAt: result.nextReviewAt,
      lastReviewedAt: new Date(),
    },
  });

  // Award 10% of lesson XP for review
  const lesson = await prisma.lesson.findUnique({
    where: { id: schedule.lessonId },
    select: { xpReward: true },
  });

  if (lesson && quality >= 3) {
    const reviewXp = Math.floor(lesson.xpReward * 0.1);
    if (reviewXp > 0) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { xpTotal: { increment: reviewXp } },
      });
    }
  }

  revalidatePath("/review");
  return { success: true, nextReviewAt: result.nextReviewAt };
}
