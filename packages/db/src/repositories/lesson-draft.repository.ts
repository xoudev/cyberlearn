import { AUDIT_ACTION } from "../audit-actions.js";
import { prisma } from "../prisma.js";
import {
  LESSON_CONTENT_SELECT,
  type LessonBase,
  type LessonContent,
  lessonContentHash,
  lessonVersionRepository,
  type PublishLessonResult,
} from "./lesson-version.repository.js";

/**
 * The lesson studio's draft: what an administrator is writing, saved as they
 * type, out of the learners' sight until it is published.
 *
 * One draft per lesson, shared: two administrators on the same lesson write
 * the same draft. Every write is conditional on the draft's updatedAt as the
 * editor last saw it, so a second tab saving over the first is refused rather
 * than silent; the editor then says so and reloads.
 *
 * The site and the app never read it. They read the lesson, which a draft
 * reaches only through publish() below, and so lessonVersionRepository.publish.
 */

export interface LessonDraftRow extends LessonContent {
  baseVersion: number;
  baseContentHash: string;
  updatedAt: Date;
  updatedBy: { displayName: string; username: string | null } | null;
}

export type SaveLessonDraftResult =
  | { ok: true; updatedAt: Date }
  | {
      ok: false;
      /**
       * No such lesson; or the draft is not the one the editor saw (another
       * tab saved, published or discarded it since).
       */
      reason: "not_found" | "conflict";
    };

export type PublishLessonDraftResult =
  | PublishLessonResult
  | {
      ok: false;
      /**
       * The draft moved since the editor saw it; or the lesson's content
       * changed since the editor loaded what the draft was started from (a
       * sync, another publish), which publishing would replace unseen.
       */
      reason: "draft_changed" | "lesson_changed";
    }
  | { ok: false; reason: "taken"; field: "refCode" | "slug" };

/** A unique-constraint violation: a refCode or a slug taken between the check and the write. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Which of the lesson's unique fields a violation names. The driver adapter
 * reports it in its own shape, so the error is read whole, as the console's
 * form always did.
 */
function takenField(error: unknown): "refCode" | "slug" | null {
  if (!isUniqueViolation(error)) return null;
  const meta = typeof error === "object" && error !== null && "meta" in error ? error.meta : null;
  const text = `${error instanceof Error ? error.message : ""} ${JSON.stringify(meta ?? null)}`;
  if (text.includes("refCode")) return "refCode";
  if (text.includes("slug")) return "slug";
  return null;
}

function sameStamp(a: Date | null, b: Date | null): boolean {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

export const lessonDraftRepository = {
  async get(lessonId: string): Promise<LessonDraftRow | null> {
    return prisma.lessonDraft.findUnique({
      where: { lessonId },
      select: {
        ...LESSON_CONTENT_SELECT,
        baseVersion: true,
        baseContentHash: true,
        updatedAt: true,
        updatedBy: { select: { displayName: true, username: true } },
      },
    });
  },

  /**
   * Saves what the editor holds. `expectedUpdatedAt` is the draft's updatedAt
   * as the editor last saw it, null when it saw none: that save starts the
   * draft.
   *
   * `base` is the lesson as the editor's fields started from it (lessonBaseOf
   * the lesson the page loaded, or the one a publish or a discard left), and
   * a new draft keeps it. Not the lesson as it is at the first save: a sync
   * landing between the page load and the first keystroke would then become
   * the draft's base, and the publish would write the older fields over it
   * without a word.
   */
  async save(
    lessonId: string,
    content: LessonContent,
    options: {
      actorId: string;
      expectedUpdatedAt: Date | null;
      base: LessonBase;
      now?: Date;
    },
  ): Promise<SaveLessonDraftResult> {
    const now = options.now ?? new Date();
    if (options.expectedUpdatedAt !== null) {
      const { count } = await prisma.lessonDraft.updateMany({
        where: { lessonId, updatedAt: options.expectedUpdatedAt },
        data: { ...content, updatedById: options.actorId, updatedAt: now },
      });
      return count === 1 ? { ok: true, updatedAt: now } : { ok: false, reason: "conflict" };
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) return { ok: false, reason: "not_found" };
    try {
      await prisma.lessonDraft.create({
        data: {
          lessonId,
          ...content,
          baseVersion: options.base.version,
          baseContentHash: options.base.contentHash,
          updatedById: options.actorId,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (error) {
      // Another tab started it first: this one did not see that draft.
      if (isUniqueViolation(error)) return { ok: false, reason: "conflict" };
      throw error;
    }
    return { ok: true, updatedAt: now };
  },

  /** Drops the draft; the lesson stays as published. Whether there was one. */
  async discard(lessonId: string): Promise<boolean> {
    const { count } = await prisma.lessonDraft.deleteMany({ where: { lessonId } });
    return count > 0;
  },

  /**
   * Publishes the draft and drops it: lessonVersionRepository.publish, in one
   * transaction with the checks that the draft is still the one the editor saw
   * and that the lesson has not changed under it. `force` publishes over a
   * lesson that changed, once the administrator has been told.
   *
   * `content` is the draft as the caller validated it, the form's rules
   * applied (trimmed, as the lesson stores it), the MDX checked and the
   * refCode and slug free: the draft's updatedAt, matched in the transaction,
   * is what makes it that draft. A unique violation that slips in between the
   * caller's check and this write comes back as `taken`.
   */
  async publish(
    lessonId: string,
    content: LessonContent,
    options: { actorId: string; expectedUpdatedAt: Date; force?: boolean; now?: Date },
  ): Promise<PublishLessonDraftResult> {
    try {
      return await prisma.$transaction(async (tx): Promise<PublishLessonDraftResult> => {
        const draft = await tx.lessonDraft.findUnique({
          where: { lessonId },
          select: { updatedAt: true, baseContentHash: true },
        });
        if (draft === null || !sameStamp(draft.updatedAt, options.expectedUpdatedAt)) {
          return { ok: false, reason: "draft_changed" };
        }
        if (options.force !== true) {
          const lesson = await tx.lesson.findUnique({
            where: { id: lessonId },
            select: LESSON_CONTENT_SELECT,
          });
          if (!lesson) return { ok: false, reason: "not_found" };
          if (lessonContentHash(lesson) !== draft.baseContentHash) {
            return { ok: false, reason: "lesson_changed" };
          }
        }

        const published = await lessonVersionRepository.publish(
          {
            lessonId,
            changes: content,
            source: "CONSOLE",
            actorId: options.actorId,
            audit: {
              action: AUDIT_ACTION.lesson.publish,
              metadata: { title: content.title, refCode: content.refCode },
            },
            ...(options.now !== undefined ? { now: options.now } : {}),
          },
          tx,
        );
        // Published, or the same as the lesson already: either way the draft
        // has nothing left to say.
        if (published.ok || published.reason === "unchanged") {
          await tx.lessonDraft.delete({ where: { lessonId } });
        }
        return published;
      });
    } catch (error) {
      const field = takenField(error);
      if (field !== null) return { ok: false, reason: "taken", field };
      throw error;
    }
  },
};
