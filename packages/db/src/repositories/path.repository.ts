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
 * Which of a path's lessons count as its missions: the published ones.
 *
 * A link can point at a lesson nobody may open: the catalogue sync links a
 * lesson imported as a draft, and archiving a lesson leaves its links behind.
 * Counted, that lesson was a mission the map offered and the lesson page
 * refused, one the path could never be finished without, and a recap handed
 * out on the module's sheet. Every read of a path's lessons applies this, the
 * rule the lesson page's own reading of its path (findPathContexts) applies.
 */
export const PUBLISHED_PATH_LESSON = {
  lesson: { status: "PUBLISHED" },
} as const satisfies Prisma.PathLessonWhereInput;

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

  /**
   * What a module's revision sheet is cut from: the path's modules and its
   * lessons in order, each with its module, for the reader who may open the
   * path. The lessons' text is fetched apart, for the one module asked.
   */
  async findSheetOutline(slug: string, viewerId: string) {
    return prisma.path.findFirst({
      where: { slug, ...pathsVisibleTo(viewerId) },
      select: {
        slug: true,
        title: true,
        modules: {
          orderBy: { position: "asc" },
          select: { id: true, position: true, title: true, description: true },
        },
        lessons: {
          orderBy: { position: "asc" },
          where: PUBLISHED_PATH_LESSON,
          select: { lessonId: true, moduleId: true },
        },
      },
    });
  },

  /** Returns the IDs of all required lessons in a path: its published ones. */
  async findLessonIds(pathId: string): Promise<string[]> {
    const rows = await prisma.pathLesson.findMany({
      where: { pathId, ...PUBLISHED_PATH_LESSON },
      select: { lessonId: true },
    });
    return rows.map((r) => r.lessonId);
  },

  /**
   * Returns the count of COMPLETED lessons for a user within a specific path,
   * among its published ones: a lesson finished before it was archived would
   * otherwise make up for one still to do.
   */
  async countCompletedLessons(userId: string, pathId: string): Promise<number> {
    return prisma.userLessonProgress.count({
      where: {
        userId,
        status: "COMPLETED",
        lesson: { status: "PUBLISHED", pathLessons: { some: { pathId } } },
      },
    });
  },

  /**
   * The paths an account opened, for its page in the console: where each one
   * stands, its missions done out of its published ones, and whether it gave
   * a certificate. Newest first. A path's progress row is written when its
   * page is first opened, so these are the paths somebody started.
   */
  async findProgressForConsole(userId: string) {
    const rows = await prisma.userPathProgress.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: {
        status: true,
        startedAt: true,
        completedAt: true,
        certificateId: true,
        path: {
          select: {
            id: true,
            title: true,
            slug: true,
            _count: { select: { lessons: { where: PUBLISHED_PATH_LESSON } } },
          },
        },
      },
    });
    const completed = await Promise.all(
      rows.map((row) => this.countCompletedLessons(userId, row.path.id)),
    );
    return rows.map((row, index) => ({
      pathId: row.path.id,
      title: row.path.title,
      slug: row.path.slug,
      status: row.status,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      hasCertificate: row.certificateId !== null,
      lessonCount: row.path._count.lessons,
      completedLessons: completed[index] ?? 0,
    }));
  },

  /**
   * Whether the user has completed all the published lessons of a path.
   *
   * A path with none left is never complete. Its links can all point at drafts
   * (the sync links lessons imported as drafts, and nothing stops the path
   * being published before them) or at archived lessons; read as "nothing left
   * to do", it opened the exam and issued a verifiable certificate for zero
   * lessons to anyone who asked. This is the gate the exam, the claim and the
   * certificate itself read, so it refuses rather than the screens alone.
   */
  async areLessonsComplete(userId: string, pathId: string): Promise<boolean> {
    const [total, completed] = await Promise.all([
      this.findLessonIds(pathId),
      this.countCompletedLessons(userId, pathId),
    ]);
    return total.length > 0 && completed >= total.length;
  },
};
