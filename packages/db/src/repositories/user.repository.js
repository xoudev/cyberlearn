"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const prisma_js_1 = require("../prisma.js");
exports.userRepository = {
  /** Minimal user data needed for XP + streak computation on lesson completion. */
  async findForGamification(userId) {
    return prisma_js_1.prisma.user.findUnique({
      where: { id: userId },
      select: {
        xpTotal: true,
        level: true,
        streakDays: true,
        lastActiveAt: true,
      },
    });
  },
  /** Total completed lessons count + per-category breakdown for badge evaluation. */
  async countCompletedLessonsByCategory(userId) {
    const rows = await prisma_js_1.prisma.userLessonProgress.findMany({
      where: { userId, status: "COMPLETED" },
      select: { lesson: { select: { category: true } } },
    });
    const byCategory = {};
    for (const row of rows) {
      const cat = row.lesson.category;
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    }
    return { total: rows.length, byCategory };
  },
  /** Full profile data for authenticated user's own profile page. */
  async findProfile(userId) {
    return prisma_js_1.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
        },
        lessonProgress: {
          where: { status: "COMPLETED" },
          select: {
            lessonId: true,
            completedAt: true,
            lesson: { select: { title: true, slug: true, category: true, xpReward: true } },
          },
          orderBy: { completedAt: "desc" },
          take: 20,
        },
      },
    });
  },
  /** Public profile by username — returns null if not found or profile is private. */
  async findPublicProfile(username) {
    const user = await prisma_js_1.prisma.user.findUnique({
      where: { username },
      include: {
        preferences: { select: { publicProfile: true } },
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
        },
        lessonProgress: {
          where: { status: "COMPLETED" },
          select: {
            completedAt: true,
            lesson: { select: { title: true, slug: true, category: true } },
          },
          orderBy: { completedAt: "desc" },
          take: 10,
        },
      },
    });
    if (!user || user.preferences?.publicProfile === false) return null;
    return user;
  },
};
//# sourceMappingURL=user.repository.js.map
