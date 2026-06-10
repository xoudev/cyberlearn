import { prisma } from "../prisma.js";

export const badgeRepository = {
  /** All active badges — loaded once per request for badge evaluation. */
  async findAllActive() {
    return prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: "asc" }, { name: "asc" }],
    });
  },

  /** Set of badge IDs already earned by a user — used to skip re-evaluation. */
  async findUserBadgeIds(userId: string): Promise<ReadonlySet<string>> {
    const rows = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    return new Set(rows.map((r) => r.badgeId));
  },

  /** All badges earned by a user, with badge details. */
  async findUserBadges(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    });
  },

  /**
   * Raw facts needed to evaluate every badge criterion for a user.
   * Feed into buildBadgeCriterionStats (@cyberlearn/lib); callers apply any
   * not-yet-persisted trigger delta (e.g. the lesson being completed now).
   */
  async findCriterionFacts(userId: string): Promise<{
    completedLessons: { lessonId: string; category: string }[];
    completedPathIds: string[];
    totalCertificates: number;
    perfectQuizCount: number;
    placementScores: { devScore: number; cybersecScore: number; networkScore: number } | null;
  }> {
    const [completedLessons, completedPaths, totalCertificates, perfectQuizCount, placementScores] =
      await Promise.all([
        prisma.userLessonProgress.findMany({
          where: { userId, status: "COMPLETED" },
          select: { lessonId: true, lesson: { select: { category: true } } },
        }),
        prisma.userPathProgress.findMany({
          where: { userId, status: "COMPLETED" },
          select: { pathId: true },
        }),
        prisma.certificate.count({ where: { userId } }),
        prisma.quizAttempt.count({ where: { userId, score: 100 } }),
        prisma.userPlacementResult.findUnique({
          where: { userId },
          select: { devScore: true, cybersecScore: true, networkScore: true },
        }),
      ]);
    return {
      completedLessons: completedLessons.map((r) => ({
        lessonId: r.lessonId,
        category: r.lesson.category,
      })),
      completedPathIds: completedPaths.map((r) => r.pathId),
      totalCertificates,
      perfectQuizCount,
      placementScores,
    };
  },
};
