import { prisma } from "../prisma.js";
import type { Category, Difficulty, Prisma, ProgressStatus } from "@prisma/client";

/**
 * What the open catalogue is, in one place.
 *
 * Published was the whole rule while every lesson belonged to everyone. It
 * stopped being so the moment a teacher could write one for their own classes:
 * a CLASS lesson is published - a class has to be able to open it - and it is
 * not catalogue content. Anything that counts, ranks or recommends lessons to
 * the platform at large reads this, so a private lesson cannot turn up in a
 * path, in the placement recommendations, or in the figures on the dashboard.
 */
export const CATALOGUE_LESSON = {
  status: "PUBLISHED",
  audience: "CATALOGUE",
} as const satisfies Prisma.LessonWhereInput;

/**
 * What one person may open: the catalogue, plus the lessons written for the
 * classes they are in or teach.
 *
 * Scoped by the caller's own id rather than by a role, like every other class
 * read: Prisma connects as the table owner and bypasses RLS, so the policy on
 * public.lessons is a second line of defence over the Data API and this where
 * clause is the one doing the work.
 */
export function lessonsVisibleTo(userId: string): Prisma.LessonWhereInput {
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

/**
 * A completed lesson's quiz score, as the catalogue shows it ("3/5"). Null
 * before completion, for a lesson without quizzes, and for one completed
 * before answers were recorded.
 */
function quizScoreOf(
  progress: { status: string; quizCorrect: number | null; quizTotal: number | null } | undefined,
): { correct: number; total: number } | null {
  if (progress?.status !== "COMPLETED") return null;
  if (progress.quizTotal === null || progress.quizTotal === 0 || progress.quizCorrect === null) {
    return null;
  }
  return { correct: progress.quizCorrect, total: progress.quizTotal };
}

export const lessonRepository = {
  /**
   * A published lesson this reader may open, by slug.
   *
   * The reader is not decoration: a CLASS lesson is published, so "published"
   * alone would hand it to anyone who guessed the slug.
   */
  async findBySlug(slug: string, viewerId: string) {
    return prisma.lesson.findFirst({
      where: { slug, ...lessonsVisibleTo(viewerId) },
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

    const where: Prisma.LessonWhereInput = {
      // Their class's own lessons sit in the catalogue beside the platform's,
      // for them alone. A separate list would mean a second place to look, a
      // second search box, and a lesson that is real work being filed as an
      // annexe.
      ...lessonsVisibleTo(userId),
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
            select: { status: true, completedAt: true, quizCorrect: true, quizTotal: true },
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
        quizScore: quizScoreOf(row.progress[0]),
      })),
    };
  },

  /**
   * Lessons per category, for the filter badges.
   *
   * Counted for the reader, because the list is: a badge saying 40 over a list
   * of 41 is the kind of wrongness nobody reports and everybody notices.
   */
  async countByCategory(viewerId: string) {
    const rows = await prisma.lesson.groupBy({
      by: ["category"],
      where: lessonsVisibleTo(viewerId),
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

  /**
   * Who wrote a lesson, for the byline in the rail.
   *
   * The author is null once that account is erased: the lesson survives them,
   * the credit does not. It is never null for a lesson that simply has no
   * author, since every path that writes one sets it.
   */
  async findAuthor(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        publishedAt: true,
        createdAt: true,
        // The byline reads this: a lesson with no author is the platform's own
        // work on one side and an erased account on the other.
        audience: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            role: true,
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
