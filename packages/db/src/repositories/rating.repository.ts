import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { readSlice, type ConsolePage, type ConsoleSlice } from "./console-page.js";

/** A rating as the console lists it, for a lesson or a path. */
const CONSOLE_RATING_ROW = {
  id: true,
  score: true,
  feedback: true,
  updatedAt: true,
  /** Null once the account is erased: the rating stays, without its author. */
  userId: true,
  user: { select: { displayName: true, username: true } },
} as const satisfies Prisma.RatingSelect;

export type ConsoleRatingRow = Prisma.RatingGetPayload<{ select: typeof CONSOLE_RATING_ROW }>;

/** The newest first; the id settles two written in the same millisecond. */
const CONSOLE_RATING_ORDER = [
  { updatedAt: "desc" },
  { id: "desc" },
] as const satisfies Prisma.RatingOrderByWithRelationInput[];

/** A page of a lesson's ratings in the console, under its filters. */
export interface ConsoleLessonRatingQuery extends ConsolePage {
  lessonId: string;
  /** Part of the comment, or of the learner's @pseudo or name; empty for none. */
  q: string;
  /** One score, 1 to 5; undefined for every score. */
  score: number | undefined;
}

/** The ratings a console search matches: each filter its own term of an AND. */
export function consoleLessonRatingWhere(query: ConsoleLessonRatingQuery): Prisma.RatingWhereInput {
  const terms: Prisma.RatingWhereInput[] = [{ lessonId: query.lessonId }];
  if (query.score !== undefined) terms.push({ score: query.score });
  const q = query.q.trim().replace(/^@/u, "");
  if (q !== "") {
    terms.push({
      OR: [
        { feedback: { contains: q, mode: "insensitive" } },
        { user: { is: { username: { contains: q, mode: "insensitive" } } } },
        { user: { is: { displayName: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  return { AND: terms };
}

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

  /**
   * One page of what learners said about a lesson, newest first, every one
   * of them reachable: the lesson's page shows the latest and links here.
   */
  async listLessonRatingsForConsole(
    query: ConsoleLessonRatingQuery,
  ): Promise<ConsoleSlice<ConsoleRatingRow>> {
    const where = consoleLessonRatingWhere(query);
    return readSlice(
      query,
      () => prisma.rating.count({ where }),
      ({ skip, take }) =>
        prisma.rating.findMany({
          where,
          orderBy: CONSOLE_RATING_ORDER,
          skip,
          take,
          select: CONSOLE_RATING_ROW,
        }),
    );
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
