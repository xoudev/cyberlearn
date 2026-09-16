import { moderate, excerpt, type ModerationResult } from "@cyberlearn/lib";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * The screen, and the record of what it decided.
 *
 * One entry point for every surface where a person publishes to another person.
 * It exists once because the alternative is each surface growing its own, and
 * the second one is always weaker than the first: written in a hurry, missing
 * the normalisation, and nobody notices until something gets through it that
 * the other would have caught.
 *
 * screen() decides and records in one call, so a caller cannot do the first and
 * forget the second - which would leave a refusal nobody can review.
 */

export interface ScreenInput {
  text: string;
  /** Where it happened: "lesson.question", "note.share", "forum.post". */
  surface: string;
  userId: string;
  /** True where links are ordinary - a forum post about a tool, say. */
  allowLinks?: boolean;
}

export interface ScreenResult extends ModerationResult {
  /** Whether the caller may go ahead and write the content. */
  allowed: boolean;
  /** The recorded decision, when one was recorded. */
  eventId: string | null;
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
    const allowed = result.verdict !== "BLOCK";

    if (result.verdict === "ALLOW") {
      return { ...result, allowed, eventId: null };
    }

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
      return { ...result, allowed, eventId: event.id };
    } catch (error) {
      console.error("[moderation] failed to record decision:", error);
      return { ...result, allowed, eventId: null };
    }
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
   * UPHELD and OVERTURNED both close the row; neither un-publishes or
   * re-publishes anything on its own. What this is for is knowing whether the
   * filter is any good - a column of OVERTURNED against one rule is the signal
   * that the rule is wrong, and it is the only way this ever gets tuned.
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
