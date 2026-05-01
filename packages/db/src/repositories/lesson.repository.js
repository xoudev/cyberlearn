"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lessonRepository = void 0;
const prisma_js_1 = require("../prisma.js");
exports.lessonRepository = {
  /** Find a single published lesson by slug. Returns null if not found or not published. */
  async findBySlug(slug) {
    return prisma_js_1.prisma.lesson.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedMinutes: true,
        xpReward: true,
        contentMdx: true,
        coverImageUrl: true,
        publishedAt: true,
      },
    });
  },
  /** List published lessons with the user's progress joined. Used for the catalog page. */
  async findManyWithProgress(userId, filters = {}) {
    const { category, difficulty, progressStatus, search, page = 1, pageSize = 9 } = filters;
    const progressCondition =
      progressStatus === "COMPLETED"
        ? { progress: { some: { userId, status: "COMPLETED" } } }
        : progressStatus === "IN_PROGRESS"
          ? { progress: { some: { userId, status: "IN_PROGRESS" } } }
          : progressStatus === "NOT_STARTED"
            ? { progress: { none: { userId } } }
            : {};
    const where = {
      status: "PUBLISHED",
      ...(category !== undefined && { category }),
      ...(difficulty !== undefined && { difficulty }),
      ...progressCondition,
      ...(search !== undefined &&
        search.length > 0 && {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }),
    };
    const [total, rows] = await Promise.all([
      prisma_js_1.prisma.lesson.count({ where }),
      prisma_js_1.prisma.lesson.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { publishedAt: "desc" },
        select: {
          id: true,
          refCode: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          difficulty: true,
          estimatedMinutes: true,
          xpReward: true,
          coverImageUrl: true,
          progress: {
            where: { userId },
            select: { status: true, completedAt: true },
          },
        },
      }),
    ]);
    return {
      total,
      lessons: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        estimatedMinutes: row.estimatedMinutes,
        xpReward: row.xpReward,
        coverImageUrl: row.coverImageUrl,
        refCode: row.refCode,
        progressStatus: row.progress[0]?.status ?? null,
      })),
    };
  },
  /** Count published lessons grouped by category. Used for filter badges. */
  async countByCategory() {
    const rows = await prisma_js_1.prisma.lesson.groupBy({
      by: ["category"],
      where: { status: "PUBLISHED" },
      _count: { id: true },
    });
    return Object.fromEntries(rows.map((r) => [r.category, r._count.id]));
  },
  async findProgress(userId, lessonId) {
    return prisma_js_1.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { status: true, attempts: true, completedAt: true, timeSpentSeconds: true },
    });
  },
  /** First 3 users who completed a lesson (ordered by completedAt asc). Respects publicProfile. */
  async findFirstBlood(lessonId) {
    return prisma_js_1.prisma.userLessonProgress.findMany({
      where: { lessonId, status: "COMPLETED" },
      orderBy: { completedAt: "asc" },
      take: 3,
      select: {
        completedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            preferences: { select: { publicProfile: true } },
          },
        },
      },
    });
  },
  async upsertProgress(data) {
    return prisma_js_1.prisma.userLessonProgress.upsert({
      where: { userId_lessonId: { userId: data.userId, lessonId: data.lessonId } },
      create: {
        userId: data.userId,
        lessonId: data.lessonId,
        status: data.status,
        attempts: data.attempts ?? 1,
        ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
      },
      update: {
        status: data.status,
        ...(data.completedAt !== undefined ? { completedAt: data.completedAt } : {}),
        ...(data.attempts !== undefined ? { attempts: data.attempts } : {}),
      },
    });
  },
};
//# sourceMappingURL=lesson.repository.js.map
