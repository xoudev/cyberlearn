import { createHash } from "node:crypto";
import type { Category, Difficulty, LessonVersionSource, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * What a lesson publishes, and the one function that publishes it.
 *
 * A lesson's content changes from four places, each of which had its own
 * update: the console's form, the import, the sync with the repository and a
 * teacher's editor. None kept what it replaced, and lessons.version was never
 * bumped. publish() is the one way a catalogue lesson's content is to change:
 * it writes the fields, bumps the version, keeps what was published in
 * lesson_versions and writes the audit row, in one transaction. The console's
 * studio calls it with the draft. The import and the sync are the next to
 * move onto it, each with its file, its source and its own audit action, in
 * their own transaction when they have one (`tx`); until they do, what they
 * write keeps no version. A teacher's class lesson keeps no history: its
 * editor saves into the lesson, as before.
 *
 * The first publish of a lesson that has no version yet keeps what the lesson
 * held before as its current version (a BASELINE), so the state every lesson
 * was in before the studio can be restored like any other.
 */

/** The fields a draft holds, a version keeps and a publish writes. */
export interface LessonContent {
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  estimatedMinutes: number;
  xpReward: number;
  contentMdx: string;
  coverImageUrl: string | null;
}

/** Those fields, as a select: on a lesson, a draft or a version alike. */
export const LESSON_CONTENT_SELECT = {
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
} as const satisfies Prisma.LessonSelect & Prisma.LessonDraftSelect & Prisma.LessonVersionSelect;

/** In a fixed order, which is what makes the fingerprint below stable. */
const CONTENT_KEYS = [
  "refCode",
  "slug",
  "title",
  "description",
  "category",
  "difficulty",
  "estimatedMinutes",
  "xpReward",
  "contentMdx",
  "coverImageUrl",
] as const satisfies readonly (keyof LessonContent)[];

/** The content fields of a row that has more: a lesson, a draft, a version. */
export function lessonContentOf(row: LessonContent): LessonContent {
  return {
    refCode: row.refCode,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimatedMinutes,
    xpReward: row.xpReward,
    contentMdx: row.contentMdx,
    coverImageUrl: row.coverImageUrl,
  };
}

/**
 * A fingerprint of a lesson's content: a draft keeps the one of the lesson it
 * was started from, and a publish compares it with the lesson's own.
 */
export function lessonContentHash(content: LessonContent): string {
  return createHash("sha256")
    .update(JSON.stringify(CONTENT_KEYS.map((key) => content[key])))
    .digest("hex");
}

export function sameLessonContent(a: LessonContent, b: LessonContent): boolean {
  return CONTENT_KEYS.every((key) => a[key] === b[key]);
}

export interface PublishLessonInput {
  lessonId: string;
  /** What changes. A field left out keeps the lesson's value. */
  changes: Partial<LessonContent>;
  source: Exclude<LessonVersionSource, "BASELINE">;
  /** Who published: null for a job with no one behind it. */
  actorId: string | null;
  /** The audit row written with it, in the same transaction; the version is added to its metadata. */
  audit: { action: string; metadata?: Prisma.InputJsonObject };
  /**
   * The lesson's updatedAt as the caller read it, when what it publishes was
   * decided from that state (the sync's diff): nothing is written if it moved.
   */
  expectedUpdatedAt?: Date;
  now?: Date;
}

export type PublishLessonResult =
  | { ok: true; version: number; content: LessonContent; updatedAt: Date }
  | {
      ok: false;
      /** No lesson; the lesson moved since the caller read it; nothing would change. */
      reason: "not_found" | "stale" | "unchanged";
    };

async function publishIn(
  tx: Prisma.TransactionClient,
  input: PublishLessonInput,
): Promise<PublishLessonResult> {
  const now = input.now ?? new Date();
  const before = await tx.lesson.findUnique({
    where: { id: input.lessonId },
    select: { ...LESSON_CONTENT_SELECT, version: true, updatedAt: true, publishedAt: true },
  });
  if (!before) return { ok: false, reason: "not_found" };
  if (
    input.expectedUpdatedAt !== undefined &&
    before.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
  ) {
    return { ok: false, reason: "stale" };
  }

  const previous = lessonContentOf(before);
  const content: LessonContent = { ...previous, ...input.changes };
  if (sameLessonContent(previous, content)) return { ok: false, reason: "unchanged" };
  const version = before.version + 1;

  // Conditional on what was read, in the same statement: a publish, a sync or
  // a status change landing in between makes this one write nothing.
  const { count } = await tx.lesson.updateMany({
    where: { id: input.lessonId, version: before.version, updatedAt: before.updatedAt },
    data: { ...content, version, updatedAt: now },
  });
  if (count !== 1) return { ok: false, reason: "stale" };

  const baseline = await tx.lessonVersion.findUnique({
    where: { lessonId_version: { lessonId: input.lessonId, version: before.version } },
    select: { id: true },
  });
  if (baseline === null) {
    await tx.lessonVersion.create({
      data: {
        lessonId: input.lessonId,
        version: before.version,
        source: "BASELINE",
        ...previous,
        publishedById: null,
        publishedAt: before.publishedAt ?? before.updatedAt,
      },
    });
  }
  await tx.lessonVersion.create({
    data: {
      lessonId: input.lessonId,
      version,
      source: input.source,
      ...content,
      publishedById: input.actorId,
      publishedAt: now,
    },
  });
  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.audit.action,
      targetType: "Lesson",
      targetId: input.lessonId,
      metadata: { ...input.audit.metadata, version },
    },
  });
  return { ok: true, version, content, updatedAt: now };
}

/** A version as the studio lists it. */
export interface LessonVersionRow {
  id: string;
  version: number;
  source: LessonVersionSource;
  title: string;
  publishedAt: Date;
  publishedBy: { displayName: string; username: string | null } | null;
}

/** How many versions the studio lists, newest first. */
export const LESSON_VERSIONS_LISTED = 30;

export const lessonVersionRepository = {
  /**
   * Publishes changes to a lesson: see the module's comment. Runs in the
   * caller's transaction when given one (an import creating the lesson first),
   * in its own otherwise.
   */
  async publish(
    input: PublishLessonInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PublishLessonResult> {
    if (tx !== undefined) return publishIn(tx, input);
    return prisma.$transaction((own) => publishIn(own, input));
  },

  /** The lesson's versions, newest first. */
  async list(lessonId: string): Promise<LessonVersionRow[]> {
    return prisma.lessonVersion.findMany({
      where: { lessonId },
      orderBy: { version: "desc" },
      take: LESSON_VERSIONS_LISTED,
      select: {
        id: true,
        version: true,
        source: true,
        title: true,
        publishedAt: true,
        publishedBy: { select: { displayName: true, username: true } },
      },
    });
  },

  /** One version's content, for restoring it into the draft; null when it is not this lesson's. */
  async find(
    lessonId: string,
    versionId: string,
  ): Promise<(LessonContent & { version: number }) | null> {
    return prisma.lessonVersion.findFirst({
      where: { id: versionId, lessonId },
      select: { ...LESSON_CONTENT_SELECT, version: true },
    });
  },
};
