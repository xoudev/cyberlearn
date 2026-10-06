import { type ExerciseKind, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * Exercises finished inside lessons: the real terminal's checks all green, a
 * Python challenge's tests all passed. One row per learner and exercise; the
 * teacher's class view counts them, and the first time pays a little XP.
 */
export const exerciseRepository = {
  /**
   * Records an exercise finished. `created` is false when the row already
   * existed: the same exercise done again, in another session or another
   * tab, is not done twice.
   */
  async recordCompletion(
    userId: string,
    lessonId: string,
    exerciseId: string,
    kind: ExerciseKind,
  ): Promise<{ created: boolean }> {
    try {
      await prisma.exerciseCompletion.create({ data: { userId, lessonId, exerciseId, kind } });
      return { created: true };
    } catch (err) {
      // The unique constraint says it was already there: a race between two
      // tabs lands here rather than on a second row.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { created: false };
      }
      throw err;
    }
  },

  /** How many exercises each of these people has finished, by user id. */
  async countByUsers(userIds: readonly string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const rows = await prisma.exerciseCompletion.groupBy({
      by: ["userId"],
      where: { userId: { in: [...userIds] } },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.userId, row._count._all]));
  },

  /** The exercises this person has finished in a lesson, by their id. */
  async listForLesson(userId: string, lessonId: string): Promise<string[]> {
    const rows = await prisma.exerciseCompletion.findMany({
      where: { userId, lessonId },
      select: { exerciseId: true },
      orderBy: { completedAt: "asc" },
    });
    return rows.map((row) => row.exerciseId);
  },
};
