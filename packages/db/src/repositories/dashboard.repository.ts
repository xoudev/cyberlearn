import type { Category } from "@prisma/client";
import { prisma } from "../prisma.js";
import { CATALOGUE_PATH, PUBLISHED_PATH_LESSON, pathsVisibleTo } from "./path.repository.js";

/**
 * What the dashboard reads of the learner, in the page's order: who they are
 * and how far they are, the lesson left open, the counts of the "where you
 * stand" line, the paths to rank for the mission, and the one path that leads.
 *
 * Reads only. Each is its own statement, and the page runs them together.
 */
export const dashboardRepository = {
  /** The greeting and the level ring: the name, the XP, the streak and its record. */
  async findHeader(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, xpTotal: true, streakDays: true, longestStreak: true },
    });
  },

  /**
   * The lesson the learner left open most recently, with what the mission card
   * says of it; null when none is under way.
   */
  async findLessonInProgress(userId: string) {
    const rows = await prisma.userLessonProgress.findMany({
      where: { userId, status: "IN_PROGRESS" },
      select: {
        lesson: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            category: true,
            estimatedMinutes: true,
            xpReward: true,
          },
        },
      },
      orderBy: { lastAccessedAt: "desc" },
      take: 1,
    });
    return rows[0]?.lesson ?? null;
  },

  /** Lessons finished, in all and since `monthStart`. */
  async countCompletedLessons(
    userId: string,
    monthStart: Date,
  ): Promise<{ total: number; thisMonth: number }> {
    const [total, thisMonth] = await Promise.all([
      prisma.userLessonProgress.count({ where: { userId, status: "COMPLETED" } }),
      prisma.userLessonProgress.count({
        where: { userId, status: "COMPLETED", completedAt: { gte: monthStart } },
      }),
    ]);
    return { total, thisMonth };
  },

  /** The categories of the lessons finished last, newest first. */
  async recentCompletedCategories(userId: string, take = 20): Promise<Category[]> {
    const rows = await prisma.userLessonProgress.findMany({
      where: { userId, status: "COMPLETED" },
      select: { lesson: { select: { category: true } } },
      orderBy: { completedAt: "desc" },
      take,
    });
    return rows.map((row) => row.lesson.category);
  },

  /** The last three badges earned, how many in all, and how many since `monthStart`. */
  async badgeSummary(userId: string, monthStart: Date) {
    const [recent, total, thisMonth] = await Promise.all([
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: { select: { name: true, rarity: true, iconUrl: true } } },
        orderBy: { earnedAt: "desc" },
        take: 3,
      }),
      prisma.userBadge.count({ where: { userId } }),
      prisma.userBadge.count({ where: { userId, earnedAt: { gte: monthStart } } }),
    ]);
    return { recent, total, thisMonth };
  },

  /** Certificates the learner holds: the ones not revoked. */
  async countCertificates(userId: string): Promise<number> {
    return prisma.certificate.count({ where: { userId, revokedAt: null } });
  },

  /**
   * How many paths can issue a certificate. The catalogue, because that is
   * what issues certificates: checkAndIssueCertificates walks the catalogue
   * paths a finished lesson belongs to. A class's own path is not one of them.
   */
  async countCertifiablePaths(): Promise<number> {
    return prisma.path.count({ where: CATALOGUE_PATH });
  },

  /**
   * The paths the learner may open, with what ranking them needs: their size,
   * how many have finished each, and the learner's own state on each.
   *
   * Not { status: "PUBLISHED" }. A path a teacher builds for their class is
   * published - the class has to be able to open it - so that filter
   * recommended one class's private work to the whole site. pathsVisibleTo is
   * the rule the catalogue and the slug lookup read: the catalogue, plus the
   * paths built for the classes this reader is in or teaches.
   */
  async listPathsToRank(userId: string) {
    return prisma.path.findMany({
      where: pathsVisibleTo(userId),
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedHours: true,
        _count: {
          select: {
            lessons: { where: PUBLISHED_PATH_LESSON },
            progress: { where: { status: "COMPLETED" } },
          },
        },
        progress: { where: { userId }, select: { status: true }, take: 1 },
      },
    });
  },

  /**
   * The path that leads, with its modules and its lessons in order, to draw
   * the module the learner is in. Only the one path.
   */
  async findLeadPath(pathId: string) {
    return prisma.path.findUnique({
      where: { id: pathId },
      select: {
        modules: {
          orderBy: { position: "asc" },
          select: { id: true, position: true, title: true },
        },
        lessons: {
          orderBy: { position: "asc" },
          // The path page's missions: the mission card must not send the
          // reader to a draft or an archived lesson, which is a 404.
          where: PUBLISHED_PATH_LESSON,
          select: {
            moduleId: true,
            lesson: {
              select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                estimatedMinutes: true,
                xpReward: true,
              },
            },
          },
        },
      },
    });
  },

  /** Which of `lessonIds` the learner finished. An empty list costs no query. */
  async completedLessonIds(userId: string, lessonIds: readonly string[]): Promise<string[]> {
    if (lessonIds.length === 0) return [];
    const rows = await prisma.userLessonProgress.findMany({
      where: { userId, status: "COMPLETED", lessonId: { in: [...lessonIds] } },
      select: { lessonId: true },
    });
    return rows.map((row) => row.lessonId);
  },
};
