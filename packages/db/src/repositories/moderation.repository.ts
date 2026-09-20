import {
  FLAG_BUDGET,
  FLAG_BUDGET_WINDOW_MS,
  excerpt,
  moderate,
  type ModerationResult,
} from "@cyberlearn/lib";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * The screen, the record of what it decided, and what happens to the content
 * afterwards.
 *
 * One entry point for every surface where a person publishes to another person.
 * It exists once because the alternative is each surface growing its own, and
 * the second one is always weaker than the first: written in a hurry, missing
 * the normalisation, and nobody notices until something gets through it that
 * the other would have caught.
 *
 * screen() decides and records in one call, so a caller cannot do the first and
 * forget the second - which would leave a refusal nobody can review.
 *
 * What changed: a flagged message used to be turned away at the door and never
 * written. Nothing was blocked, because there was nothing to block - and when a
 * reviewer decided the filter had been wrong there was nothing to put back
 * either, so "faux positif" was a note in a log and the person's message was
 * gone for good. Now anything the screen does not plainly allow is written
 * hidden: out of sight the moment it is detected, in front of a reviewer, and
 * either restored or destroyed by their decision. applyOutcome is the half that
 * carries that decision through to the content.
 */

export interface ScreenInput {
  text: string;
  /** Where it happened. A member of the two sets below, never a loose string. */
  surface: ScreenSurface;
  userId: string;
  /** True where links are ordinary - a forum post about a tool, say. */
  allowLinks?: boolean;
}

export interface ScreenResult extends ModerationResult {
  /**
   * The screen flagged it: REVIEW or BLOCK, never ALLOW.
   *
   * Named for what the screen decided rather than for what the caller does
   * about it, because that differs by surface. A surface that publishes writes
   * the content hidden and a reviewer decides its fate. Sharing a note
   * publishes nothing, so there is nothing to hide and the share is refused.
   *
   * It replaced `allowed`, which had every caller throwing the message away -
   * which is why a false positive used to cost the person what they wrote.
   */
  flagged: boolean;
  /** The recorded decision, when one was recorded. */
  eventId: string | null;
  /**
   * This account has tripped the screen too many times in the last hour and is
   * stopped altogether: the caller writes nothing at all, hidden or otherwise.
   *
   * The screen already takes each flagged message out of sight, so this is not
   * about the content. It is about the queue: one person can otherwise fill a
   * morning's moderation with a script, and the reports that matter end up
   * behind it.
   */
  throttled: boolean;
}

/**
 * The surfaces a decision can be carried through to, spelled once.
 *
 * Callers pass these rather than a string of their own, because a surface with
 * a typo in it records perfectly and then cannot be acted on: the reviewer
 * presses "supprimer" and nothing happens, with no error anywhere. The type on
 * ScreenInput.surface makes that a compile error rather than a dead queue row.
 */
export const MODERATION_SURFACE = {
  lessonQuestion: "lesson.question",
  lessonAnswer: "lesson.answer",
  forumTopic: "forum.topic",
  forumPost: "forum.post",
} as const;

export type ModerationSurface = (typeof MODERATION_SURFACE)[keyof typeof MODERATION_SURFACE];

/**
 * Surfaces where flagged content is refused rather than hidden.
 *
 * Sharing a note publishes no row: the note is the author's own either way, so
 * there is nothing for a reviewer's decision to reach. Kept apart from the
 * others by name rather than by omission, so that adding a surface forces the
 * question "which of these two is it?" instead of quietly landing in neither.
 */
export const UNACTIONED_SURFACE = {
  noteShare: "note.share",
} as const;

export type ScreenSurface =
  | ModerationSurface
  | (typeof UNACTIONED_SURFACE)[keyof typeof UNACTIONED_SURFACE];

/**
 * How each surface hides, restores and destroys one row.
 *
 * A map rather than a switch so the test can walk it: every surface a caller
 * can name has to have an entry here, and that is asserted rather than hoped
 * for.
 */
interface SurfaceHandler {
  /** Put it back in front of readers. The screen was wrong. */
  restore: (id: string) => Promise<void>;
  /** Destroy it. The screen was right, and a reviewer agreed. */
  destroy: (id: string) => Promise<void>;
}

const SURFACE_HANDLERS: Record<ModerationSurface, SurfaceHandler> = {
  [MODERATION_SURFACE.lessonQuestion]: {
    restore: async (id) => {
      await prisma.lessonQuestion.updateMany({ where: { id }, data: { isHidden: false } });
    },
    destroy: async (id) => {
      // Its answers go with it, by the cascade on the foreign key: a thread of
      // replies to a question that no longer exists is not a thread.
      await prisma.lessonQuestion.deleteMany({ where: { id } });
    },
  },
  [MODERATION_SURFACE.lessonAnswer]: {
    restore: async (id) => {
      await prisma.lessonAnswer.updateMany({ where: { id }, data: { isHidden: false } });
    },
    destroy: async (id) => {
      await prisma.lessonAnswer.deleteMany({ where: { id } });
    },
  },
  [MODERATION_SURFACE.forumTopic]: {
    restore: async (id) => {
      // The opening post is the thread's body: restoring one without the other
      // leaves a title with nothing under it.
      await prisma.$transaction([
        prisma.forumTopic.updateMany({ where: { id }, data: { isHidden: false } }),
        prisma.forumPost.updateMany({ where: { topicId: id }, data: { isHidden: false } }),
      ]);
    },
    destroy: async (id) => {
      await prisma.forumTopic.deleteMany({ where: { id } });
    },
  },
  [MODERATION_SURFACE.forumPost]: {
    restore: async (id) => {
      await prisma.forumPost.updateMany({ where: { id }, data: { isHidden: false } });
    },
    destroy: async (id) => {
      await prisma.forumPost.deleteMany({ where: { id } });
    },
  },
};

/**
 * The handler for a surface read back out of the database.
 *
 * Takes a string rather than the union because the column is a string and old
 * rows predate all of this: a surface nobody handles has to be survivable.
 */
function handlerFor(surface: string): SurfaceHandler | null {
  return Object.hasOwn(SURFACE_HANDLERS, surface)
    ? SURFACE_HANDLERS[surface as ModerationSurface]
    : null;
}

/**
 * Whether a decision on this event can reach anything.
 *
 * The console asked nobody this and offered "rétablir" and "supprimer" on
 * every row. On a note share both did nothing - the surface publishes no row,
 * so it has no handler - and the reviewer got no error either, just a queue
 * entry that closed and a note still sitting where it was. A button that
 * cannot work should not be drawn.
 */
export function isActionableEvent(surface: string, contentId: string | null): boolean {
  return contentId !== null && handlerFor(surface) !== null;
}

export const moderationRepository = {
  /**
   * Screens a piece of text and records anything that was not plainly fine.
   *
   * ALLOW is not recorded. A row per acceptable sentence on a platform where
   * almost everything is acceptable is a table nobody can read, and it would
   * bury the handful of rows the table exists for.
   *
   * A recording failure never blocks the caller: the decision has been made and
   * the content is refused or allowed either way, and losing the audit row is
   * worse than nothing but much better than a person unable to post because a
   * log write timed out.
   */
  async screen(input: ScreenInput): Promise<ScreenResult> {
    const result = moderate(input.text, { allowLinks: input.allowLinks ?? false });
    // REVIEW and BLOCK are both acted on. The difference between them is how
    // sure the analyser is, which is a reviewer's business and not a reader's:
    // a message nobody is sure about should not be on the site while the
    // question is open.
    const flagged = result.verdict !== "ALLOW";

    if (result.verdict === "ALLOW") {
      return { ...result, flagged, throttled: false, eventId: null };
    }

    // Counted before this one is written, so the budget is the number already
    // spent. The attempt itself is still recorded below: a moderator deciding
    // whether somebody is worth a sanction wants to see all twelve tries, not
    // the first five.
    const throttled = (await this.recentFlagCount(input.userId)) >= FLAG_BUDGET;

    try {
      const event = await prisma.moderationEvent.create({
        data: {
          userId: input.userId,
          surface: input.surface,
          verdict: result.verdict,
          score: result.score,
          // Prisma's Json input type does not accept an interface, only the
          // structural JSON types. The findings are plain data, so this says so
          // rather than widening the interface into something looser.
          findings: result.findings as unknown as Prisma.InputJsonValue,
          excerpt: excerpt(input.text, 500),
        },
        select: { id: true },
      });
      return { ...result, flagged, throttled, eventId: event.id };
    } catch (error) {
      // The decision stands even when the record of it does not: content the
      // screen flagged still goes out of sight. It is then hidden with nothing
      // in the queue pointing at it, which is bad - and far better than
      // publishing it because a log write timed out.
      console.error("[moderation] failed to record decision:", error);
      return { ...result, flagged, throttled, eventId: null };
    }
  },

  /**
   * How many times this account has been flagged in the last hour.
   *
   * From the events table rather than from Redis, deliberately. Every flag is
   * already a row here, so the count is exact, it survives a cache being cold,
   * and it cannot disagree with what the moderator is looking at. The other
   * limiters in the application guard how fast somebody posts; this one guards
   * how much of the queue one person can take up.
   */
  async recentFlagCount(userId: string, now: Date = new Date()): Promise<number> {
    return prisma.moderationEvent.count({
      where: { userId, createdAt: { gte: new Date(now.getTime() - FLAG_BUDGET_WINDOW_MS) } },
    });
  },

  /** One event, with what is needed to write to the person it is about. */
  async findSubject(eventId: string) {
    return prisma.moderationEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        surface: true,
        excerpt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            username: true,
            preferences: { select: { emailNotifications: true } },
          },
        },
      },
    });
  },

  /**
   * Somebody's own moderation record, for the page that shows it to them.
   *
   * What they get to see about themselves: when, what was flagged, and how it
   * ended. Not the score and not the rules that fired - the first means nothing
   * to them and the second is the puzzle again.
   */
  async findForUser(userId: string, limit = 30) {
    return prisma.moderationEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        surface: true,
        excerpt: true,
        outcome: true,
        createdAt: true,
        reviewedAt: true,
      },
    });
  },

  /**
   * Ties a recorded decision to the row it produced.
   *
   * Separate from screen() because the content does not exist yet when the
   * screen runs, and a BLOCK never produces one at all.
   */
  async attachContent(eventId: string, contentId: string): Promise<void> {
    await prisma.moderationEvent.updateMany({ where: { id: eventId }, data: { contentId } });
  },

  /** The queue, oldest first - a report that has waited longest is the one due. */
  async listPending(limit = 100) {
    return prisma.moderationEvent.findMany({
      where: { outcome: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        surface: true,
        verdict: true,
        score: true,
        findings: true,
        excerpt: true,
        createdAt: true,
        contentId: true,
        user: { select: { id: true, displayName: true, username: true, email: true } },
      },
    });
  },

  /** What has been decided, for the record rather than for the queue. */
  async listResolved(limit = 50) {
    return prisma.moderationEvent.findMany({
      where: { outcome: { not: "PENDING" } },
      orderBy: { reviewedAt: "desc" },
      take: limit,
      select: {
        id: true,
        surface: true,
        verdict: true,
        outcome: true,
        excerpt: true,
        reviewedAt: true,
        user: { select: { displayName: true, username: true } },
        reviewedBy: { select: { displayName: true, username: true } },
      },
    });
  },

  /**
   * Records what a person decided about a machine's decision.
   *
   * The record only. applyOutcome is what callers want: it does this and then
   * carries the decision through to the content, which is the whole point of
   * reviewing it.
   */
  async resolve(
    eventId: string,
    outcome: "UPHELD" | "OVERTURNED",
    reviewedById: string,
  ): Promise<void> {
    await prisma.moderationEvent.updateMany({
      where: { id: eventId, outcome: "PENDING" },
      data: { outcome, reviewedById, reviewedAt: new Date() },
    });
  },

  /**
   * A person's decision, carried through to the content it was about.
   *
   * OVERTURNED - the screen was wrong - lifts the block and the message is
   * back where its author put it. UPHELD - the screen was right - destroys it,
   * because content held out of sight forever is a queue that only grows and a
   * copy of the exact material nobody wanted kept.
   *
   * The event is claimed first, with the PENDING condition doing the work: two
   * reviewers pressing opposite buttons at the same moment cannot both act, and
   * the one that loses the claim changes nothing.
   *
   * Returns what actually happened, so the caller can say so rather than
   * reporting a success it did not verify.
   */
  async applyOutcome(
    eventId: string,
    outcome: "UPHELD" | "OVERTURNED",
    reviewedById: string,
  ): Promise<{
    claimed: boolean;
    contentTouched: boolean;
    /** Who wrote it, so the caller can tell them how it ended. Null after erasure. */
    authorId: string | null;
    /** Which surface, so the notice calls it by its name. */
    surface: string | null;
  }> {
    const claim = await prisma.moderationEvent.updateMany({
      where: { id: eventId, outcome: "PENDING" },
      data: { outcome, reviewedById, reviewedAt: new Date() },
    });
    if (claim.count === 0) {
      return { claimed: false, contentTouched: false, authorId: null, surface: null };
    }

    const event = await prisma.moderationEvent.findUnique({
      where: { id: eventId },
      select: { surface: true, contentId: true, userId: true },
    });
    // No content id: an event recorded before flagged content was kept at all,
    // or one whose write failed after the screen. The decision is recorded;
    // there is simply nothing to carry it to.
    const subject = { authorId: event?.userId ?? null, surface: event?.surface ?? null };
    if (!event?.contentId) return { claimed: true, contentTouched: false, ...subject };

    const handler = handlerFor(event.surface);
    if (!handler) {
      console.error("[moderation] no handler for surface:", event.surface);
      return { claimed: true, contentTouched: false, ...subject };
    }

    if (outcome === "OVERTURNED") await handler.restore(event.contentId);
    else await handler.destroy(event.contentId);

    return { claimed: true, contentTouched: true, ...subject };
  },

  /** How the filter is doing, per rule - the numbers that say what to tune. */
  async countsByOutcome() {
    const rows = await prisma.moderationEvent.groupBy({
      by: ["outcome"],
      _count: { id: true },
    });
    return Object.fromEntries(rows.map((r) => [r.outcome, r._count.id])) as Partial<
      Record<"PENDING" | "UPHELD" | "OVERTURNED", number>
    >;
  },
};
