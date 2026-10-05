import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { computeSm2, isMastered, reviewXpFor } from "@cyberlearn/lib";
import { creditXp } from "@/lib/xp/credit";

const reviewGradeSchema = z.object({
  scheduleId: z.guid(),
  quality: z.union([z.literal(1), z.literal(3), z.literal(5)]),
});

export type GradeReviewResult =
  | {
      ok: true;
      /** Null once the lesson is held: nothing is scheduled any more. */
      nextReviewAt: Date | null;
      reviewXp: number;
      /** The lesson left the cycle on this grade. */
      mastered: boolean;
    }
  | { ok: false };

/**
 * Grades one due review: feeds the recall quality into SM-2 (next interval,
 * ease factor) and credits a tenth of the lesson XP on a successful recall.
 * quality: 1 = forgot, 3 = hard, 5 = easy.
 *
 * A lesson held well enough (isMastered: the next review would be two months
 * away) leaves the cycle: its schedule is deleted rather than moved, so the
 * queue is finite. Forgetting it later is not a thing the cycle can see; the
 * lesson stays readable, and its quiz is still there.
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
  // jumps forward (or the row is gone), so a re-grade matches 0 rows and
  // credits nothing.
  const now = new Date();
  const dueAndOwned = { id: schedule.id, userId, nextReviewAt: { lte: now } };
  const mastered = quality >= 3 && isMastered(result);
  const advanced = mastered
    ? await prisma.reviewSchedule.deleteMany({ where: dueAndOwned })
    : await prisma.reviewSchedule.updateMany({
        where: dueAndOwned,
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

  return { ok: true, nextReviewAt: mastered ? null : result.nextReviewAt, reviewXp, mastered };
}
