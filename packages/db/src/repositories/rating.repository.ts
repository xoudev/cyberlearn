import { prisma } from "../prisma.js";

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

  async findLessonStats(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { avgRating: true, ratingsCount: true },
    });
  },
};
