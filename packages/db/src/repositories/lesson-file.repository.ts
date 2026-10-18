import type {
  Category,
  ContentStatus,
  Difficulty,
  LessonVersionSource,
  Prisma,
} from "@prisma/client";
import { AUDIT_ACTION } from "../audit-actions.js";
import { prisma } from "../prisma.js";
import { auditLogRepository } from "./audit-log.repository.js";
import { type LessonContent, lessonVersionRepository } from "./lesson-version.repository.js";

/**
 * Lessons as a file describes them: what the console reads to compare a
 * lesson file with the lesson that holds its refCode, and the two writes
 * that bring a file in.
 *
 * Two doors bring a file over a lesson that already exists: the update from
 * the repository (/lessons/sync) and the import of a file whose refCode is
 * taken (/lessons/import). Both write through writeFromFile, and an import
 * that creates its lesson through createFromFile. Each publishes through
 * lessonVersionRepository.publish, as the lesson studio does: the version is
 * bumped, what it holds is kept with where it came from, and the audit row is
 * written once, in the transaction of the write.
 *
 * A studio draft open on the lesson is never touched: it keeps the
 * fingerprint of the lesson it was started from, which the file's write
 * changes, so the studio shows the lesson moved under it and its publish asks
 * before replacing what the file wrote.
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
  AUDIT_ACTION.lesson.sync,
  AUDIT_ACTION.lesson.importSuccess,
  AUDIT_ACTION.lesson.importUpdate,
] as const;

/**
 * An edit made in the console: the lesson studio's publish, and the save of
 * the form it replaced, still in the log.
 */
const LESSON_CONSOLE_EDITS: readonly string[] = [
  AUDIT_ACTION.lesson.publish,
  AUDIT_ACTION.lesson.update,
];

export type LessonFileWriteAction =
  | typeof AUDIT_ACTION.lesson.sync
  | typeof AUDIT_ACTION.lesson.importUpdate;

/** Where the version a file's write leaves says it came from. */
const VERSION_SOURCE: Record<LessonFileWriteAction, Exclude<LessonVersionSource, "BASELINE">> = {
  [AUDIT_ACTION.lesson.sync]: "SYNC",
  [AUDIT_ACTION.lesson.importUpdate]: "IMPORT",
};

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
    // The version the write leaves is added to it.
    metadata: Prisma.InputJsonObject;
  };
}

/** What a file written over a lesson left. */
export type LessonFileWriteResult =
  | {
      ok: true;
      /**
       * The lesson's version now: a new one, or the one it had when the file
       * changed only its prerequisites, which a version does not hold.
       */
      version: number;
      /**
       * A studio draft is open on a lesson the file gave a new version. It is
       * kept as it was, and the studio shows that the lesson moved under it.
       * False when only the prerequisites changed: the draft's base still holds.
       */
      draftKept: boolean;
    }
  /** The lesson moved since the comparison, or is gone: nothing was written or logged. */
  | { ok: false };

/** A lesson a file creates: arrives as DRAFT, like any import. */
export interface LessonFileCreate {
  /** Everything the lesson holds, the slug and the cover included. */
  fields: LessonContent;
  /** The administrator importing it: its author, and the actor of its audit row. */
  actorId: string;
  /** The refCodes of its prerequisites: those the database holds are linked. */
  prerequisiteRefCodes: readonly string[];
  /** The `lesson.import.success` row's metadata; its first version is added to it. */
  auditMetadata: Prisma.InputJsonObject;
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
   * When the studio draft open on each of these lessons was last saved, for
   * those that have one: a file written over the lesson keeps it, and the
   * comparison says so before anything is confirmed.
   */
  async openDrafts(lessonIds: readonly string[]): Promise<Map<string, Date>> {
    if (lessonIds.length === 0) return new Map();
    const drafts = await prisma.lessonDraft.findMany({
      where: { lessonId: { in: [...lessonIds] } },
      select: { lessonId: true, updatedAt: true },
    });
    return new Map(drafts.map((d) => [d.lessonId, d.updatedAt]));
  },

  /**
   * Puts a file's fields and prerequisites over a lesson, in one transaction,
   * through lessonVersionRepository.publish: the version is bumped and kept
   * with its source (SYNC from the repository, IMPORT from the import page),
   * and the audit row is written once, with that version.
   *
   * The write is conditioned on the row's updatedAt as the comparison read
   * it, so an edit landing after the comparison (a studio publish, another
   * sync) cannot be overwritten: refused then, and nothing is written or
   * logged, as the studio's publish refuses a lesson that moved under it.
   *
   * A file that changes only the prerequisites leaves the content, and so the
   * version, as they are: the prerequisites are written under the same
   * condition, with the same audit row.
   */
  async writeFromFile(write: LessonFileWrite): Promise<LessonFileWriteResult> {
    return prisma.$transaction(async (tx): Promise<LessonFileWriteResult> => {
      const { actorId, action, metadata } = write.audit;
      const published = await lessonVersionRepository.publish(
        {
          lessonId: write.lessonId,
          changes: write.fields,
          expectedUpdatedAt: write.expectedUpdatedAt,
          source: VERSION_SOURCE[action],
          actorId,
          audit: { action, metadata },
        },
        tx,
      );

      let version: number;
      if (published.ok) {
        version = published.version;
      } else if (published.reason === "unchanged") {
        const { count } = await tx.lesson.updateMany({
          where: { id: write.lessonId, updatedAt: write.expectedUpdatedAt },
          data: { updatedAt: new Date() },
        });
        if (count !== 1) return { ok: false };
        version = published.version;
        await auditLogRepository.record(
          {
            actorId,
            action,
            targetType: "Lesson",
            targetId: write.lessonId,
            metadata: { ...metadata, version },
          },
          tx,
        );
      } else {
        return { ok: false };
      }

      await tx.lessonPrerequisite.deleteMany({ where: { lessonId: write.lessonId } });
      if (write.prerequisiteIds.length > 0) {
        await tx.lessonPrerequisite.createMany({
          data: write.prerequisiteIds.map((prerequisiteId) => ({
            lessonId: write.lessonId,
            prerequisiteId,
          })),
        });
      }
      // Only a new version moves a draft's base: a file that changed only the
      // prerequisites leaves the content, and so its fingerprint, as it was,
      // and the studio has nothing to signal.
      let draftKept = false;
      if (published.ok) {
        const draft = await tx.lessonDraft.findUnique({
          where: { lessonId: write.lessonId },
          select: { lessonId: true },
        });
        draftKept = draft !== null;
      }
      return { ok: true, version, draftKept };
    });
  },

  /**
   * Creates the lesson a file describes, as DRAFT, with its prerequisites,
   * and records what it holds as its first version (IMPORT) with its
   * `lesson.import.success` audit row: lessonVersionRepository.publish in
   * `created` mode, in the same transaction. A refCode or a slug taken in the
   * meantime throws the unique violation, and nothing is written.
   */
  async createFromFile(
    create: LessonFileCreate,
  ): Promise<{ lessonId: string; refCode: string; version: number }> {
    return prisma.$transaction(async (tx) => {
      const created = await tx.lesson.create({
        data: { ...create.fields, status: "DRAFT", authorId: create.actorId },
        select: { id: true, refCode: true },
      });

      if (create.prerequisiteRefCodes.length > 0) {
        const prerequisites = await tx.lesson.findMany({
          where: { refCode: { in: [...create.prerequisiteRefCodes] } },
          select: { id: true },
        });
        await tx.lessonPrerequisite.createMany({
          data: prerequisites.map((p) => ({ lessonId: created.id, prerequisiteId: p.id })),
        });
      }

      const published = await lessonVersionRepository.publish(
        {
          lessonId: created.id,
          created: true,
          source: "IMPORT",
          actorId: create.actorId,
          audit: { action: AUDIT_ACTION.lesson.importSuccess, metadata: create.auditMetadata },
        },
        tx,
      );
      // Created a statement ago in this very transaction: never missing. If it
      // were, throwing rolls the lesson back rather than leave it unrecorded.
      if (!published.ok) throw new Error(`Lesson ${created.id} vanished in its own import.`);
      return { lessonId: created.id, refCode: created.refCode, version: published.version };
    });
  },
};
