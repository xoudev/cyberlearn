import type { Category, ContentStatus, Difficulty, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * Lessons as a file describes them: what the console reads to compare a
 * lesson file with the lesson that holds its refCode, and the one write that
 * puts the file over it.
 *
 * Two doors bring a file over a lesson that already exists: the update from
 * the repository (/lessons/sync) and the import of a file whose refCode is
 * taken (/lessons/import). Both write through writeFromFile, so whatever has
 * to happen to every content change of a lesson happens in one place.
 */

/** The part of a lesson a file can change, plus what an update is checked against. */
export const LESSON_FILE_ROW = {
  id: true,
  refCode: true,
  slug: true,
  status: true,
  updatedAt: true,
  contentMdx: true,
  title: true,
  description: true,
  category: true,
  difficulty: true,
  estimatedMinutes: true,
  xpReward: true,
  prerequisites: { select: { prerequisite: { select: { refCode: true } } } },
} as const satisfies Prisma.LessonSelect;

export type LessonFileRow = Prisma.LessonGetPayload<{ select: typeof LESSON_FILE_ROW }>;

/** A catalogue lesson no file of the repository holds. */
export interface LessonOutsideFiles {
  id: string;
  refCode: string;
  title: string;
  status: ContentStatus;
}

/** The audit actions after which a lesson holds what a file said. */
export const LESSON_FROM_FILE_ACTIONS = [
  "lesson.sync",
  "lesson.import.success",
  "lesson.import.update",
] as const;

/**
 * An edit made in the console: the lesson studio's publish, and the save of
 * the form it replaced, still in the log.
 */
const LESSON_CONSOLE_EDITS: readonly string[] = ["lesson.publish", "lesson.update"];

export type LessonFileWriteAction = "lesson.sync" | "lesson.import.update";

export interface LessonFileWrite {
  lessonId: string;
  /** The updatedAt the comparison was made on: a row that moved since is left alone. */
  expectedUpdatedAt: Date;
  /** Slug, status and cover are never a file's to change. */
  fields: {
    contentMdx: string;
    title: string;
    description: string;
    category: Category;
    difficulty: Difficulty;
    estimatedMinutes: number;
    xpReward: number;
  };
  /** The lesson's prerequisites from now on, every one already in the database. */
  prerequisiteIds: readonly string[];
  audit: {
    actorId: string;
    action: LessonFileWriteAction;
    // Prisma's JSON input type: what the column takes, built by the caller.
    metadata: Prisma.InputJsonObject;
  };
}

export const lessonFileRepository = {
  async findByRefCodes(refCodes: readonly string[]): Promise<LessonFileRow[]> {
    if (refCodes.length === 0) return [];
    return prisma.lesson.findMany({
      where: { refCode: { in: [...refCodes] } },
      select: LESSON_FILE_ROW,
    });
  },

  async findByRefCode(refCode: string): Promise<LessonFileRow | null> {
    return prisma.lesson.findUnique({ where: { refCode }, select: LESSON_FILE_ROW });
  },

  /** The lesson a slug belongs to, if any: a new lesson cannot take it. */
  async findIdBySlug(slug: string): Promise<string | null> {
    const row = await prisma.lesson.findUnique({ where: { slug }, select: { id: true } });
    return row?.id ?? null;
  },

  /** The lessons, among these refCodes, that the database holds. */
  async findByRefCodesForLinks(
    refCodes: readonly string[],
  ): Promise<{ id: string; refCode: string }[]> {
    if (refCodes.length === 0) return [];
    return prisma.lesson.findMany({
      where: { refCode: { in: [...refCodes] } },
      select: { id: true, refCode: true },
    });
  },

  /** The refCodes of these lessons, by id: how a prerequisite loop is named to the admin. */
  async refCodesByIds(ids: readonly string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await prisma.lesson.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, refCode: true },
    });
    return new Map(rows.map((r) => [r.id, r.refCode]));
  },

  /**
   * The catalogue's lessons that none of these refCodes names: in the
   * database without a file in the repository (written in the console, or
   * their file taken out). A sync leaves them as they are; the console says so.
   */
  async catalogueLessonsOutside(refCodes: readonly string[]): Promise<LessonOutsideFiles[]> {
    return prisma.lesson.findMany({
      where: { audience: "CATALOGUE", refCode: { notIn: [...refCodes] } },
      orderBy: { refCode: "asc" },
      select: { id: true, refCode: true, title: true, status: true },
    });
  },

  /** How many answers each quiz of these lessons already has. */
  async quizAnswerCounts(
    lessonIds: readonly string[],
  ): Promise<{ lessonId: string; quizId: string; answers: number }[]> {
    if (lessonIds.length === 0) return [];
    const groups = await prisma.lessonQuizAnswer.groupBy({
      by: ["lessonId", "quizId"],
      where: { lessonId: { in: [...lessonIds] } },
      _count: { _all: true },
    });
    return groups.map((g) => ({ lessonId: g.lessonId, quizId: g.quizId, answers: g._count._all }));
  },

  /**
   * When each of these lessons was last edited in the console, for those
   * edited since they last came from a file: an update from a file would
   * replace that edit. A lesson whose newest entry is a file's has none.
   */
  async consoleEditsSinceFile(lessonIds: readonly string[]): Promise<Map<string, Date>> {
    const edits = new Map<string, Date>();
    if (lessonIds.length === 0) return edits;
    const history = await prisma.auditLog.findMany({
      where: {
        targetId: { in: [...lessonIds] },
        action: { in: [...LESSON_CONSOLE_EDITS, ...LESSON_FROM_FILE_ACTIONS] },
      },
      orderBy: { createdAt: "desc" },
      select: { targetId: true, action: true, createdAt: true },
    });
    const seen = new Set<string>();
    for (const entry of history) {
      if (entry.targetId === null || seen.has(entry.targetId)) continue;
      seen.add(entry.targetId);
      if (LESSON_CONSOLE_EDITS.includes(entry.action)) edits.set(entry.targetId, entry.createdAt);
    }
    return edits;
  },

  /**
   * Puts a file's fields and prerequisites over a lesson, with its audit
   * line, in one transaction. The write is conditioned on the row's
   * updatedAt in the same statement, so an edit landing after the comparison
   * cannot be overwritten: false then, and nothing is written or logged.
   */
  async writeFromFile(write: LessonFileWrite): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.lesson.updateMany({
        where: { id: write.lessonId, updatedAt: write.expectedUpdatedAt },
        data: write.fields,
      });
      if (count !== 1) return false;
      await tx.lessonPrerequisite.deleteMany({ where: { lessonId: write.lessonId } });
      if (write.prerequisiteIds.length > 0) {
        await tx.lessonPrerequisite.createMany({
          data: write.prerequisiteIds.map((prerequisiteId) => ({
            lessonId: write.lessonId,
            prerequisiteId,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: write.audit.actorId,
          action: write.audit.action,
          targetType: "lesson",
          targetId: write.lessonId,
          metadata: write.audit.metadata,
        },
      });
      return true;
    });
  },
};
