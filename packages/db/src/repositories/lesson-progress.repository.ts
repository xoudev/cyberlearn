import type { ProgressStatus } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * One lesson's progress, from the console's side: what an account did with
 * its lessons, and the two corrections support can make to one of them.
 *
 * The rest of the progress is written by the learning loop
 * (apps/web/lib/lessons/complete.ts) and nowhere else. The corrections here
 * deliberately stop short of it: no XP, no streak, no badge, no certificate.
 */

/** What a correction does to a lesson's progress. */
export type LessonCorrection = "reset" | "complete";

export const LESSON_CORRECTIONS = [
  "reset",
  "complete",
] as const satisfies readonly LessonCorrection[];

/** The audit action of a lesson's progress corrected from the console. */
export const LESSON_CORRECTION_ACTION = "admin.user.lesson_progress.correct";

export type LessonCorrectionResult =
  | {
      ok: true;
      mode: "reset";
      lessonTitle: string;
      progressRemoved: number;
      answersRemoved: number;
      cardsRemoved: number;
    }
  | { ok: true; mode: "complete"; lessonTitle: string; previousStatus: ProgressStatus | null }
  | { ok: false; reason: "NO_LESSON" | "NOTHING_TO_RESET" | "ALREADY_COMPLETED" };

export const lessonProgressRepository = {
  /** The lessons an account touched most recently, with where each one stands. */
  async recentForConsole(userId: string, limit = 30) {
    return prisma.userLessonProgress.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: "desc" },
      take: limit,
      select: {
        lessonId: true,
        status: true,
        bestScore: true,
        quizCorrect: true,
        quizTotal: true,
        startedAt: true,
        completedAt: true,
        lastAccessedAt: true,
        lesson: { select: { title: true, slug: true } },
      },
    });
  },

  /** How many lessons an account finished, and how many it left under way. */
  async countsForConsole(userId: string): Promise<{ completed: number; inProgress: number }> {
    const rows = await prisma.userLessonProgress.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    });
    const of = (status: ProgressStatus): number =>
      rows.find((row) => row.status === status)?._count._all ?? 0;
    return { completed: of("COMPLETED"), inProgress: of("IN_PROGRESS") };
  },

  /**
   * Corrects one lesson's progress, for a lesson stuck in a state the learner
   * cannot get out of on their own.
   *
   * "reset" puts the lesson back to never opened: its progress, its quiz
   * answers (each is answered once, so they would stay locked), the review
   * cards they produced and the lesson's review schedule. The XP it paid
   * stays paid, and finishing it again pays again, as for any first
   * completion.
   *
   * "complete" marks it finished without paying anything, as a waiver opens a
   * lesson without crediting it: no XP, no streak, no badge. The path it
   * belongs to is not touched; the caller says what that changes for it.
   *
   * One transaction, with its audit row.
   */
  async correct(
    userId: string,
    lessonId: string,
    mode: LessonCorrection,
    by: { actorId: string },
    now: Date = new Date(),
  ): Promise<LessonCorrectionResult> {
    return prisma.$transaction(async (tx): Promise<LessonCorrectionResult> => {
      const lesson = await tx.lesson.findUnique({
        where: { id: lessonId },
        select: { title: true },
      });
      if (lesson === null) return { ok: false, reason: "NO_LESSON" };

      const audit = (metadata: Record<string, string | number | null>) =>
        tx.auditLog.create({
          data: {
            actorId: by.actorId,
            action: LESSON_CORRECTION_ACTION,
            targetType: "User",
            targetId: userId,
            metadata: { lessonId, mode, ...metadata },
          },
        });

      if (mode === "reset") {
        const where = { userId, lessonId };
        const [progress, answers, cards, schedules] = await Promise.all([
          tx.userLessonProgress.deleteMany({ where }),
          tx.lessonQuizAnswer.deleteMany({ where }),
          tx.reviewCard.deleteMany({ where }),
          // The lesson-level review its completion scheduled goes with it,
          // as resetProgress clears it for every lesson.
          tx.reviewSchedule.deleteMany({ where }),
        ]);
        if (progress.count + answers.count + cards.count + schedules.count === 0) {
          return { ok: false, reason: "NOTHING_TO_RESET" };
        }
        await audit({
          progressRemoved: progress.count,
          answersRemoved: answers.count,
          cardsRemoved: cards.count,
          schedulesRemoved: schedules.count,
        });
        return {
          ok: true,
          mode,
          lessonTitle: lesson.title,
          progressRemoved: progress.count,
          answersRemoved: answers.count,
          cardsRemoved: cards.count,
        };
      }

      const existing = await tx.userLessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
        select: { status: true },
      });
      if (existing?.status === "COMPLETED") return { ok: false, reason: "ALREADY_COMPLETED" };
      await tx.userLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId, status: "COMPLETED", completedAt: now },
        update: { status: "COMPLETED", completedAt: now },
      });
      const previousStatus = existing?.status ?? null;
      await audit({ previousStatus });
      return { ok: true, mode, lessonTitle: lesson.title, previousStatus };
    });
  },
};
