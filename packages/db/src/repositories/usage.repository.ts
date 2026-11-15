import { prisma } from "../prisma.js";

/**
 * What the console's usage page is computed from: who was active on which
 * day, who signed up lately and what they did next, and where each lesson
 * loses its readers.
 *
 * The rows are read as they are and counted in the console
 * (apps/admin/lib/usage.ts), where the counting is tested. That is a few
 * thousand short rows for a platform of this size; the day it is not, the
 * three reads below become SQL aggregates, behind the same three shapes.
 *
 * "Active" is a day with a row in user_activity_days: a lesson finished, a
 * challenge solved or the daily recall done. Opening the site is not counted,
 * because nothing records it day by day.
 */

/** An in-progress lesson nobody has opened for this long is one they left. */
export const STALLED_AFTER_DAYS = 14;

export interface UsageActivityDay {
  userId: string;
  day: Date;
}

export interface UsageSignup {
  id: string;
  createdAt: Date;
  /** Null until the onboarding is finished. */
  username: string | null;
}

export interface UsageLessonRow {
  id: string;
  refCode: string;
  title: string;
  /** Everybody who opened it. */
  started: number;
  completed: number;
  /** In progress, and not opened for STALLED_AFTER_DAYS. */
  stalled: number;
}

export const usageRepository = {
  /** How many accounts there are, and how many finished their onboarding. */
  async findAccountTotals(): Promise<{ accounts: number; onboarded: number }> {
    const [accounts, onboarded] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { username: { not: null } } }),
    ]);
    return { accounts, onboarded };
  },

  /** Every active day since `from` (a calendar day, at UTC midnight), one row per account and day. */
  async findActivityDaysSince(from: Date): Promise<UsageActivityDay[]> {
    return prisma.userActivityDay.findMany({
      where: { day: { gte: from } },
      select: { userId: true, day: true },
    });
  },

  /**
   * The accounts created since `from`, with what they did afterwards: their
   * active days, and the day each finished a first lesson.
   */
  async findSignupsSince(from: Date): Promise<{
    signups: UsageSignup[];
    activity: UsageActivityDay[];
    firstLessons: { userId: string; completedAt: Date | null }[];
  }> {
    const signups = await prisma.user.findMany({
      where: { createdAt: { gte: from } },
      orderBy: { createdAt: "asc" },
      select: { id: true, createdAt: true, username: true },
    });
    const ids = signups.map((signup) => signup.id);
    if (ids.length === 0) return { signups, activity: [], firstLessons: [] };

    const [activity, firsts] = await Promise.all([
      prisma.userActivityDay.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, day: true },
      }),
      prisma.userLessonProgress.groupBy({
        by: ["userId"],
        where: { status: "COMPLETED", userId: { in: ids } },
        _min: { completedAt: true },
      }),
    ]);
    return {
      signups,
      activity,
      firstLessons: firsts.map((row) => ({
        userId: row.userId,
        completedAt: row._min.completedAt,
      })),
    };
  },

  /**
   * Each catalogue lesson somebody opened, with how many finished it and how
   * many left it. A class's own lesson is its teacher's business, not a
   * figure of the catalogue.
   */
  async findLessonFunnels(now: Date): Promise<UsageLessonRow[]> {
    const stalledBefore = new Date(now.getTime() - STALLED_AFTER_DAYS * 86_400_000);
    const catalogue = { lesson: { audience: "CATALOGUE" } } as const;
    const [started, completed, stalled] = await Promise.all([
      prisma.userLessonProgress.groupBy({
        by: ["lessonId"],
        where: catalogue,
        _count: { _all: true },
      }),
      prisma.userLessonProgress.groupBy({
        by: ["lessonId"],
        where: { ...catalogue, status: "COMPLETED" },
        _count: { _all: true },
      }),
      prisma.userLessonProgress.groupBy({
        by: ["lessonId"],
        where: { ...catalogue, status: "IN_PROGRESS", lastAccessedAt: { lt: stalledBefore } },
        _count: { _all: true },
      }),
    ]);
    if (started.length === 0) return [];

    const lessons = await prisma.lesson.findMany({
      where: { id: { in: started.map((row) => row.lessonId) } },
      select: { id: true, refCode: true, title: true },
    });
    const completedBy = new Map(completed.map((row) => [row.lessonId, row._count._all]));
    const stalledBy = new Map(stalled.map((row) => [row.lessonId, row._count._all]));
    const startedBy = new Map(started.map((row) => [row.lessonId, row._count._all]));
    return lessons.map((lesson) => ({
      ...lesson,
      started: startedBy.get(lesson.id) ?? 0,
      completed: completedBy.get(lesson.id) ?? 0,
      stalled: stalledBy.get(lesson.id) ?? 0,
    }));
  },
};
