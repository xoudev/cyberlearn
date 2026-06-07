import { prisma } from "../prisma.js";
import type { ProgressStatus } from "@prisma/client";

export const pathRepository = {
  async findBySlug(slug: string) {
    return prisma.path.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: { id: true, slug: true, title: true, category: true },
    });
  },

  async findProgress(userId: string, pathId: string) {
    return prisma.userPathProgress.findUnique({
      where: { userId_pathId: { userId, pathId } },
      select: { id: true, status: true, certificateId: true },
    });
  },

  async upsertProgress(data: {
    userId: string;
    pathId: string;
    status: ProgressStatus;
    completedAt?: Date;
  }) {
    return prisma.userPathProgress.upsert({
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

  async linkCertificate(userId: string, pathId: string, certificateId: string) {
    return prisma.userPathProgress.update({
      where: { userId_pathId: { userId, pathId } },
      data: { status: "COMPLETED", completedAt: new Date(), certificateId },
    });
  },

  /** Returns all published path IDs that contain a given lesson. */
  async findPublishedPathsForLesson(
    lessonId: string,
  ): Promise<{ id: string; slug: string; title: string }[]> {
    const rows = await prisma.pathLesson.findMany({
      where: { lessonId, path: { status: "PUBLISHED" } },
      select: { path: { select: { id: true, slug: true, title: true } } },
    });
    return rows.map((r) => r.path);
  },

  /** Returns the IDs of all required lessons in a path. */
  async findLessonIds(pathId: string): Promise<string[]> {
    const rows = await prisma.pathLesson.findMany({
      where: { pathId },
      select: { lessonId: true },
    });
    return rows.map((r) => r.lessonId);
  },

  /** Returns the count of COMPLETED lessons for a user within a specific path. */
  async countCompletedLessons(userId: string, pathId: string): Promise<number> {
    return prisma.userLessonProgress.count({
      where: {
        userId,
        status: "COMPLETED",
        lesson: { pathLessons: { some: { pathId } } },
      },
    });
  },

  /**
   * Whether the user has completed all lessons of a path. Mirrors the existing
   * `completedCount >= totalIds.length` gate (true also for a 0-lesson path,
   * preserving current behaviour).
   */
  async areLessonsComplete(userId: string, pathId: string): Promise<boolean> {
    const [total, completed] = await Promise.all([
      this.findLessonIds(pathId),
      this.countCompletedLessons(userId, pathId),
    ]);
    return completed >= total.length;
  },
};
