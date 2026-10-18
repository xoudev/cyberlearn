import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/** A rating as the console lists it, for a lesson or a path. */
const CONSOLE_RATING_ROW = {
  id: true,
  score: true,
  feedback: true,
  updatedAt: true,
  user: { select: { displayName: true, username: true } },
} as const satisfies Prisma.RatingSelect;

export type ConsoleRatingRow = Prisma.RatingGetPayload<{ select: typeof CONSOLE_RATING_ROW }>;

/** The newest first; the id settles two written in the same millisecond. */
const CONSOLE_RATING_ORDER = [
  { updatedAt: "desc" },
  { id: "desc" },
] as const satisfies Prisma.RatingOrderByWithRelationInput[];

export const ratingRepository = {
  async upsertLessonRating(userId: string, lessonId: string, score: number, feedback?: string) {
    const data = { score, feedback: feedback ?? null };

    const [rating] = await prisma.$transaction([
      prisma.rating.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId, ...data },
        update: data,
      }),
      // Recompute aggregate on Lesson in the same transaction
      prisma.$executeRaw`
        UPDATE lessons
        SET "avgRating"    = (SELECT AVG(score) FROM ratings WHERE "lessonId" = ${lessonId}::uuid),
            "ratingsCount" = (SELECT COUNT(*)   FROM ratings WHERE "lessonId" = ${lessonId}::uuid)
        WHERE id = ${lessonId}::uuid
      `,
    ]);

    return rating;
  },

  async findUserLessonRating(userId: string, lessonId: string) {
    return prisma.rating.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { score: true, feedback: true, updatedAt: true },
    });
  },

  /**
   * A learner's rating of a path, with the path's average recomputed in the
   * same transaction, as for lessons.
   */
  async upsertPathRating(userId: string, pathId: string, score: number, feedback?: string) {
    const data = { score, feedback: feedback ?? null };

    const [rating] = await prisma.$transaction([
      prisma.rating.upsert({
        where: { userId_pathId: { userId, pathId } },
        create: { userId, pathId, ...data },
        update: data,
      }),
      prisma.$executeRaw`
        UPDATE paths
        SET "avgRating"    = (SELECT AVG(score) FROM ratings WHERE "pathId" = ${pathId}::uuid),
            "ratingsCount" = (SELECT COUNT(*)   FROM ratings WHERE "pathId" = ${pathId}::uuid)
        WHERE id = ${pathId}::uuid
      `,
    ]);

    return rating;
  },

  async findUserPathRating(userId: string, pathId: string) {
    return prisma.rating.findUnique({
      where: { userId_pathId: { userId, pathId } },
      select: { score: true, feedback: true, updatedAt: true },
    });
  },

  /** What learners said about a path, newest first: for the console. */
  async findPathRatings(pathId: string, take = 50): Promise<ConsoleRatingRow[]> {
    return prisma.rating.findMany({
      where: { pathId },
      orderBy: CONSOLE_RATING_ORDER,
      take,
      select: CONSOLE_RATING_ROW,
    });
  },

  /** What learners said about a lesson, newest first: for the console, as for paths. */
  async findLessonRatings(lessonId: string, take = 50): Promise<ConsoleRatingRow[]> {
    return prisma.rating.findMany({
      where: { lessonId },
      orderBy: CONSOLE_RATING_ORDER,
      take,
      select: CONSOLE_RATING_ROW,
    });
  },

  async findPathStats(pathId: string) {
    return prisma.path.findUnique({
      where: { id: pathId },
      select: { avgRating: true, ratingsCount: true },
    });
  },

  async findLessonStats(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { avgRating: true, ratingsCount: true },
    });
  },
};
