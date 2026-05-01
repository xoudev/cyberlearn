"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathRepository = void 0;
const prisma_js_1 = require("../prisma.js");
exports.pathRepository = {
  async findBySlug(slug) {
    return prisma_js_1.prisma.path.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { id: true, slug: true, title: true, category: true },
    });
  },
  async findProgress(userId, pathId) {
    return prisma_js_1.prisma.userPathProgress.findUnique({
      where: { userId_pathId: { userId, pathId } },
      select: { id: true, status: true, certificateId: true },
    });
  },
  async upsertProgress(data) {
    return prisma_js_1.prisma.userPathProgress.upsert({
      where: { userId_pathId: { userId: data.userId, pathId: data.pathId } },
      create: {
        userId: data.userId,
        pathId: data.pathId,
        status: data.status,
        completedAt: data.completedAt ?? null,
      },
      update: { status: data.status, completedAt: data.completedAt ?? null },
    });
  },
  async linkCertificate(userId, pathId, certificateId) {
    return prisma_js_1.prisma.userPathProgress.update({
      where: { userId_pathId: { userId, pathId } },
      data: { status: "COMPLETED", completedAt: new Date(), certificateId },
    });
  },
  /** Returns all published path IDs that contain a given lesson. */
  async findPublishedPathsForLesson(lessonId) {
    const rows = await prisma_js_1.prisma.pathLesson.findMany({
      where: { lessonId, path: { status: "PUBLISHED" } },
      select: { path: { select: { id: true, slug: true, title: true } } },
    });
    return rows.map((r) => r.path);
  },
  /** Returns the IDs of all required lessons in a path. */
  async findLessonIds(pathId) {
    const rows = await prisma_js_1.prisma.pathLesson.findMany({
      where: { pathId },
      select: { lessonId: true },
    });
    return rows.map((r) => r.lessonId);
  },
  /** Returns the count of COMPLETED lessons for a user within a specific path. */
  async countCompletedLessons(userId, pathId) {
    return prisma_js_1.prisma.userLessonProgress.count({
      where: {
        userId,
        status: "COMPLETED",
        lesson: { pathLessons: { some: { pathId } } },
      },
    });
  },
};
//# sourceMappingURL=path.repository.js.map
