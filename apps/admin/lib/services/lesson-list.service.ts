import { prisma } from "@cyberlearn/db";
import { isFirstCatalogueLesson } from "@cyberlearn/types";

/**
 * The console's lessons, split into two folders: the working list (drafts and
 * published lessons) and the archives. An archived lesson is out of the site
 * and the app; keeping it in the working list buried the lessons still being
 * worked on under the ones set aside.
 */

export type LessonFolder = "active" | "archives";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Which catalogue a lesson comes from. */
export type LessonOrigin = "new" | "first" | "class";

export interface LessonRow {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  status: ContentStatus;
  xpReward: number;
  estimatedMinutes: number;
  completions: number;
  pathLessonsCount: number;
  /** A teacher's class lesson, the first catalogue (CL-LSN-NNN), or the new one. */
  origin: LessonOrigin;
}

export interface LessonList {
  rows: LessonRow[];
  counts: { published: number; draft: number; archived: number };
}

export function lessonOrigin(refCode: string, audience: "CATALOGUE" | "CLASS"): LessonOrigin {
  if (audience === "CLASS") return "class";
  return isFirstCatalogueLesson(refCode) ? "first" : "new";
}

export async function listLessons(folder: LessonFolder): Promise<LessonList> {
  const [lessons, grouped] = await Promise.all([
    prisma.lesson.findMany({
      where:
        folder === "archives" ? { status: "ARCHIVED" } : { status: { in: ["DRAFT", "PUBLISHED"] } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        refCode: true,
        slug: true,
        title: true,
        category: true,
        difficulty: true,
        status: true,
        audience: true,
        xpReward: true,
        estimatedMinutes: true,
        _count: {
          select: {
            progress: { where: { status: "COMPLETED" } },
            pathLessons: true,
          },
        },
      },
    }),
    prisma.lesson.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const count = (status: ContentStatus): number =>
    grouped.find((g) => g.status === status)?._count._all ?? 0;

  return {
    rows: lessons.map((l) => ({
      id: l.id,
      refCode: l.refCode,
      slug: l.slug,
      title: l.title,
      category: l.category,
      difficulty: l.difficulty,
      status: l.status,
      xpReward: l.xpReward,
      estimatedMinutes: l.estimatedMinutes,
      completions: l._count.progress,
      pathLessonsCount: l._count.pathLessons,
      origin: lessonOrigin(l.refCode, l.audience),
    })),
    counts: {
      published: count("PUBLISHED"),
      draft: count("DRAFT"),
      archived: count("ARCHIVED"),
    },
  };
}
