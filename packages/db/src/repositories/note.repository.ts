import type { Category } from "@prisma/client";
import { prisma } from "../prisma.js";

/** A note joined with its lesson + primary parcours, for the notes library. */
export interface NoteSummary {
  id: string;
  lessonId: string;
  content: string;
  wordCount: number;
  updatedAt: Date;
  lessonSlug: string;
  lessonTitle: string;
  lessonCategory: Category;
  pathSlug: string | null;
  pathTitle: string | null;
}

export const noteRepository = {
  /** The user's note for one lesson (or null). */
  async findForLesson(userId: string, lessonId: string) {
    return prisma.note.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { id: true, content: true, wordCount: true, updatedAt: true },
    });
  },

  /**
   * Create or update the user's note for a lesson. Saving an empty note deletes
   * it (so blank notes never clutter the library). Returns the saved metadata,
   * or null when the note was cleared.
   */
  async upsert(
    userId: string,
    lessonId: string,
    content: string,
    wordCount: number,
  ): Promise<{ wordCount: number; updatedAt: Date } | null> {
    if (content.trim().length === 0) {
      await prisma.note.deleteMany({ where: { userId, lessonId } });
      return null;
    }
    return prisma.note.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: { userId, lessonId, content, wordCount },
      update: { content, wordCount },
      select: { wordCount: true, updatedAt: true },
    });
  },

  async deleteForLesson(userId: string, lessonId: string): Promise<void> {
    await prisma.note.deleteMany({ where: { userId, lessonId } });
  },

  /** Every note for a user, newest first, with lesson + primary parcours. */
  async findAllForUser(userId: string): Promise<NoteSummary[]> {
    const rows = await prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        lessonId: true,
        content: true,
        wordCount: true,
        updatedAt: true,
        lesson: {
          select: {
            slug: true,
            title: true,
            category: true,
            pathLessons: {
              orderBy: { position: "asc" },
              take: 1,
              select: { path: { select: { slug: true, title: true } } },
            },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      lessonId: r.lessonId,
      content: r.content,
      wordCount: r.wordCount,
      updatedAt: r.updatedAt,
      lessonSlug: r.lesson.slug,
      lessonTitle: r.lesson.title,
      lessonCategory: r.lesson.category,
      pathSlug: r.lesson.pathLessons[0]?.path.slug ?? null,
      pathTitle: r.lesson.pathLessons[0]?.path.title ?? null,
    }));
  },
};
