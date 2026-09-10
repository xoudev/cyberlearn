import { prisma } from "../prisma.js";
import type { Category, Difficulty, ProgressStatus } from "@prisma/client";

export interface LessonFilters {
  category?: Category;
  difficulty?: Difficulty;
  /** Filter by user's progress status. Requires userId to be meaningful. */
  progressStatus?: ProgressStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  /** Fetch the matching catalogue before applying user-specific availability ordering. */
  paginate?: boolean;
}

export const lessonRepository = {
  /** Find a single published lesson by slug. Returns null if not found or not published. */
  async findBySlug(slug: string) {
    return prisma.lesson.findFirst({
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
  async findManyWithProgress(userId: string, filters: LessonFilters = {}) {
    const { category, difficulty, progressStatus, search, page = 1, pageSize = 9 } = filters;

    const progressCondition =
      progressStatus === "COMPLETED"
        ? { progress: { some: { userId, status: "COMPLETED" as const } } }
        : progressStatus === "IN_PROGRESS"
          ? { progress: { some: { userId, status: "IN_PROGRESS" as const } } }
          : progressStatus === "NOT_STARTED"
            ? { progress: { none: { userId } } }
            : {};

    const where = {
      status: "PUBLISHED" as const,
      ...(category !== undefined && { category }),
      ...(difficulty !== undefined && { difficulty }),
      ...progressCondition,
      ...(search !== undefined &&
        search.length > 0 && {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }),
    };

    const [total, rows] = await Promise.all([
      prisma.lesson.count({ where }),
      prisma.lesson.findMany({
        where,
        ...(filters.paginate === false ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
        orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
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
    const rows = await prisma.lesson.groupBy({
      by: ["category"],
      where: { status: "PUBLISHED" },
      _count: { id: true },
    });
    return Object.fromEntries(rows.map((r) => [r.category, r._count.id]));
  },

  async findProgress(userId: string, lessonId: string) {
    return prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { status: true, attempts: true, completedAt: true, timeSpentSeconds: true },
    });
  },

  /**
   * The published paths these lessons belong to, each with its full ordered
   * lesson list, plus which of those lessons the reader has completed.
   *
   * Whole paths rather than just the lessons asked about: the sequential rule
   * needs each lesson's neighbours, and a catalogue page asks about nine
   * lessons scattered across as many paths. Three queries whatever the page
   * size, instead of one per card.
   */
  async findPathContexts(userId: string, lessonIds: string[]) {
    if (lessonIds.length === 0) return { paths: [], completedLessonIds: [] };

    const links = await prisma.pathLesson.findMany({
      where: { lessonId: { in: lessonIds }, path: { status: "PUBLISHED" } },
      select: { pathId: true },
    });
    if (links.length === 0) return { paths: [], completedLessonIds: [] };

    const paths = await prisma.path.findMany({
      where: { id: { in: [...new Set(links.map((l) => l.pathId))] } },
      select: {
        id: true,
        slug: true,
        title: true,
        lessons: {
          // Order matters: the rule reads adjacency off this array.
          orderBy: { position: "asc" },
          where: { lesson: { status: "PUBLISHED" } },
          select: {
            position: true,
            lesson: {
              select: {
                id: true,
                slug: true,
                title: true,
                difficulty: true,
                category: true,
                xpReward: true,
                estimatedMinutes: true,
              },
            },
          },
        },
      },
    });

    const completed = await prisma.userLessonProgress.findMany({
      where: {
        userId,
        status: "COMPLETED",
        lessonId: { in: paths.flatMap((p) => p.lessons.map((pl) => pl.lesson.id)) },
      },
      select: { lessonId: true },
    });

    return { paths, completedLessonIds: completed.map((c) => c.lessonId) };
  },

  /** First 3 users who completed a lesson (ordered by completedAt asc). Respects publicProfile. */
  async findFirstBlood(lessonId: string) {
    return prisma.userLessonProgress.findMany({
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

  async upsertProgress(data: {
    userId: string;
    lessonId: string;
    status: ProgressStatus;
    attempts?: number;
    completedAt?: Date;
  }) {
    return prisma.userLessonProgress.upsert({
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
