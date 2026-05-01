"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ratingRepository = void 0;
const prisma_js_1 = require("../prisma.js");
exports.ratingRepository = {
  async upsertLessonRating(userId, lessonId, score, feedback) {
    const data = { score, feedback: feedback ?? null };
    const [rating] = await prisma_js_1.prisma.$transaction([
      prisma_js_1.prisma.rating.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId, ...data },
        update: data,
      }),
      // Recompute aggregate on Lesson in the same transaction
      prisma_js_1.prisma.$executeRaw`
        UPDATE lessons
        SET "avgRating"    = (SELECT AVG(score) FROM ratings WHERE "lessonId" = ${lessonId}::uuid),
            "ratingsCount" = (SELECT COUNT(*)   FROM ratings WHERE "lessonId" = ${lessonId}::uuid)
        WHERE id = ${lessonId}::uuid
      `,
    ]);
    return rating;
  },
  async findUserLessonRating(userId, lessonId) {
    return prisma_js_1.prisma.rating.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { score: true, feedback: true, updatedAt: true },
    });
  },
  async findLessonStats(lessonId) {
    return prisma_js_1.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { avgRating: true, ratingsCount: true },
    });
  },
};
//# sourceMappingURL=rating.repository.js.map
