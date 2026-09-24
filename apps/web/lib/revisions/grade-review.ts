import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { computeSm2, reviewXpFor } from "@cyberlearn/lib";
import { creditXp } from "@/lib/xp/credit";

export const reviewGradeSchema = z.object({
  scheduleId: z.string().uuid(),
  quality: z.union([z.literal(1), z.literal(3), z.literal(5)]),
});

export type GradeReviewResult = { ok: true; nextReviewAt: Date; reviewXp: number } | { ok: false };

/**
 * Grades one due review: feeds the recall quality into SM-2 (next interval,
 * ease factor) and credits a tenth of the lesson XP on a successful recall.
 * quality: 1 = forgot, 3 = hard, 5 = easy.
 *
 * Shared by the site's action and the app's /api/mobile/review, so a review
 * graded on a phone moves the same schedule and earns the same XP.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity (server action session or mobile Bearer JWT). Lives outside any
 * "use server" module so it cannot be invoked with an arbitrary userId.
 */
export async function gradeReview(userId: string, input: unknown): Promise<GradeReviewResult> {
  const parsed = reviewGradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { scheduleId, quality } = parsed.data;

  const schedule = await prisma.reviewSchedule.findUnique({ where: { id: scheduleId } });
  if (schedule?.userId !== userId) return { ok: false };

  const result = computeSm2(quality, {
    easeFactor: schedule.easeFactor,
    intervalDays: schedule.intervalDays,
    repetitions: schedule.repetitions,
  });

  // Atomically advance ONLY a review that is genuinely due (and owned). Replaying
  // the request or a double submit cannot farm XP: once graded, nextReviewAt
  // jumps forward, so a re-grade matches 0 rows and credits nothing.
  const now = new Date();
  const advanced = await prisma.reviewSchedule.updateMany({
    where: { id: schedule.id, userId, nextReviewAt: { lte: now } },
    data: {
      easeFactor: result.easeFactor,
      intervalDays: result.intervalDays,
      repetitions: result.repetitions,
      nextReviewAt: result.nextReviewAt,
      lastReviewedAt: now,
    },
  });
  if (advanced.count === 0) return { ok: false };

  // A successful recall (quality >= 3) earns a tenth of the lesson XP.
  let reviewXp = 0;
  if (quality >= 3) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: schedule.lessonId },
      select: { xpReward: true },
    });
    reviewXp = lesson ? reviewXpFor(lesson.xpReward) : 0;
    if (reviewXp > 0) {
      // Credit through the single XP source of truth: level recompute, the
      // level-up notification, and (later) seasonXp all happen in one place.
      await prisma.$transaction((tx) => creditXp(tx, userId, reviewXp, "REVIEW"));
    }
  }

  return { ok: true, nextReviewAt: result.nextReviewAt, reviewXp };
}
