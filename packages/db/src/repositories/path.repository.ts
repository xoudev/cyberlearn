import { prisma } from "../prisma.js";
import type { Prisma, ProgressStatus } from "@prisma/client";

/**
 * What the open catalogue of paths is, in one place.
 *
 * Published was the whole rule while every path belonged to everyone. It
 * stopped being so the moment a teacher could build one for their classes: a
 * CLASS path is PUBLISHED - a class has to be able to open it - and it is not
 * catalogue content. Anything that counts, ranks or recommends paths to the
 * platform at large reads this, so a class's path cannot turn up in the public
 * list, in the platform's figures, or in somebody else's recommendations.
 *
 * The lessons learned this the hard way one release earlier; see
 * CATALOGUE_LESSON, which this deliberately mirrors.
 */
export const CATALOGUE_PATH = {
  status: "PUBLISHED",
  audience: "CATALOGUE",
} as const satisfies Prisma.PathWhereInput;

/**
 * What one person may open: the catalogue, plus the paths built for the classes
 * they are in or teach.
 *
 * Scoped by the caller's own id rather than by a role, like every other class
 * read: Prisma connects as the table owner and bypasses RLS, so the policy on
 * public.paths is a second line of defence over the Data API and this where
 * clause is the one doing the work.
 */
export function pathsVisibleTo(userId: string): Prisma.PathWhereInput {
  return {
    status: "PUBLISHED",
    OR: [
      { audience: "CATALOGUE" },
      {
        classLinks: {
          some: {
            class: {
              OR: [
                { members: { some: { userId } } },
                { teachers: { some: { teacherId: userId } } },
              ],
            },
          },
        },
      },
    ],
  };
}

export const pathRepository = {
  /**
   * A published path this reader may open, by slug.
   *
   * The reader is not decoration: a CLASS path is published, so "published"
   * alone would hand it to anyone who guessed the slug.
   */
  async findBySlug(slug: string, viewerId: string) {
    return prisma.path.findFirst({
      where: { slug, ...pathsVisibleTo(viewerId) },
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

  /**
   * The catalogue paths that contain a lesson, for certificate emission.
   *
   * Catalogue only, deliberately. A certificate carries the platform's name and
   * is verifiable at a public URL; a path a teacher assembled for one class is
   * teaching material, not a credential the platform is willing to vouch for.
   * Finishing one still earns the XP of every lesson in it.
   */
  async findPublishedPathsForLesson(
    lessonId: string,
  ): Promise<{ id: string; slug: string; title: string }[]> {
    const rows = await prisma.pathLesson.findMany({
      where: { lessonId, path: CATALOGUE_PATH },
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
