import { reviewSession, sessionSize } from "@cyberlearn/lib/revisions/session";
import { prisma } from "../prisma.js";

/**
 * The spaced-repetition queue, read in one place.
 *
 * Five readers used to query review_schedules each in their own words (the
 * sidebar, the dashboard, the page, the reminder, the app), and none of them
 * asked whether the lesson was still published: an archived lesson stayed in
 * the cycle, due for ever, with a page nobody could open behind it. They read
 * here now, and they read the same thing: what is due among the lessons still
 * live, cut to the day's session (@cyberlearn/lib/revisions/session).
 */

/** Only a lesson still published comes back to review. */
export const LIVE_REVIEW_FILTER = { lesson: { status: "PUBLISHED" } } as const;

const QUEUE_SELECT = {
  id: true,
  nextReviewAt: true,
  easeFactor: true,
  lesson: {
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      difficulty: true,
      xpReward: true,
      estimatedMinutes: true,
    },
  },
} as const;

export interface ReviewQueueRow {
  id: string;
  nextReviewAt: Date;
  easeFactor: number;
  lesson: {
    id: string;
    slug: string;
    title: string;
    category: string;
    difficulty: string;
    xpReward: number;
    estimatedMinutes: number;
  };
}

export interface ReviewSessionView {
  /** The day's session, in the order it is taken. */
  rows: ReviewQueueRow[];
  /** Due too, but for another day. */
  waiting: number;
  /** Everything due, the session included. */
  total: number;
}

export interface ReviewReminder {
  userId: string;
  /** What the day asks of this reader: the session's size, not the whole queue. */
  count: number;
  firstTitle: string;
}

export const reviewRepository = {
  /** Everything due now whose lesson is still published, oldest first. */
  async findDue(userId: string, now: Date): Promise<ReviewQueueRow[]> {
    return prisma.reviewSchedule.findMany({
      where: { userId, nextReviewAt: { lte: now }, ...LIVE_REVIEW_FILTER },
      orderBy: { nextReviewAt: "asc" },
      select: QUEUE_SELECT,
    });
  },

  /** The day's session out of everything due, and how many wait their turn. */
  async findSession(userId: string, now: Date): Promise<ReviewSessionView> {
    const due = await reviewRepository.findDue(userId, now);
    const { session, waiting } = reviewSession(due);
    return { rows: session, waiting, total: due.length };
  },

  /** What the day asks for: the sidebar's count, never more than a session. */
  async countSession(userId: string, now: Date): Promise<number> {
    const due = await prisma.reviewSchedule.count({
      where: { userId, nextReviewAt: { lte: now }, ...LIVE_REVIEW_FILTER },
    });
    return sessionSize(due);
  },

  /** The next reviews after now, soonest first. */
  async findUpcoming(userId: string, now: Date, take = 10) {
    return prisma.reviewSchedule.findMany({
      where: { userId, nextReviewAt: { gt: now }, ...LIVE_REVIEW_FILTER },
      orderBy: { nextReviewAt: "asc" },
      take,
      select: {
        id: true,
        nextReviewAt: true,
        lesson: { select: { title: true, difficulty: true } },
      },
    });
  },

  /**
   * One reminder per reader due by `until`: those who keep the feature and its
   * reminder on (no preferences row keeps both defaults), told the size of
   * their session rather than of their queue.
   */
  async findReminders(until: Date): Promise<ReviewReminder[]> {
    const rows = await prisma.reviewSchedule.findMany({
      where: {
        nextReviewAt: { lte: until },
        ...LIVE_REVIEW_FILTER,
        // Two switches, and both have to be on: spacedRepetition turns the
        // feature off, reviewReminders only this reminder.
        user: {
          OR: [
            { preferences: { is: null } },
            { preferences: { is: { spacedRepetition: true, reviewReminders: true } } },
          ],
        },
      },
      select: {
        userId: true,
        nextReviewAt: true,
        easeFactor: true,
        lesson: { select: { title: true } },
      },
    });
    const byUser = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byUser.get(row.userId) ?? [];
      list.push(row);
      byUser.set(row.userId, list);
    }
    return [...byUser].map(([userId, due]) => {
      const { session } = reviewSession(due);
      return { userId, count: session.length, firstTitle: session[0]?.lesson.title ?? "" };
    });
  },
};
