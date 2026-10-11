import type { Prisma } from "@prisma/client";
import {
  answerCard,
  dayStart,
  dueCutoff,
  readDraw,
  readSessionAnswers,
  staleBefore,
  type CardSchedule,
  type NewCard,
  type ReviewDrawRef,
} from "@cyberlearn/lib/revisions/cards";
import { prisma } from "../prisma.js";
import { LIVE_REVIEW_FILTER } from "./review.repository.js";

/**
 * Review cards and the day's review sessions: one lesson quiz question asked
 * again, in Leitner boxes. The rules (what a completion enqueues, where an
 * answer moves a card, what a day draws) are @cyberlearn/lib/revisions/cards;
 * this reads and writes rows.
 *
 * Every write is the server's: clients may read their own rows, nothing more
 * (migration 20261011180000_review_cards). The writes that run inside a
 * caller's transaction (a lesson's completion, a session's grading) take its
 * client as their last argument.
 */

/** The global client or a transaction's: both have the models. */
type Db = Prisma.TransactionClient;

/** How many due cards a draw looks at: the most overdue, enough for six from three lessons and more. */
const DUE_WINDOW = 200;

const DUE_CARD = {
  id: true,
  lessonId: true,
  quizId: true,
  box: true,
  dueAt: true,
  lapses: true,
  everCorrect: true,
  lesson: { select: { slug: true, title: true } },
} as const;

export interface DueCardRow {
  id: string;
  lessonId: string;
  quizId: string;
  box: number;
  dueAt: Date;
  lapses: number;
  everCorrect: boolean;
  lesson: { slug: string; title: string };
}

/**
 * The cards the thirty-day rule retires on the day of `now` (isStale):
 * answered right at least once and more than CARD_STALE_DAYS overdue.
 */
function staleWhere(now: Date): Prisma.ReviewCardWhereInput {
  return { everCorrect: true, dueAt: { lt: staleBefore(now) } };
}

const SESSION = {
  id: true,
  userId: true,
  day: true,
  draw: true,
  answers: true,
  completedAt: true,
  xpCredited: true,
} as const;

export interface ReviewSessionRow {
  id: string;
  userId: string;
  /** The day key ("2026-10-11"). */
  day: string;
  draw: ReviewDrawRef[];
  /** The shown option picked, by drawn index. */
  answers: Record<string, number>;
  completedAt: Date | null;
  xpCredited: boolean;
}

function toSession(row: {
  id: string;
  userId: string;
  day: Date;
  draw: Prisma.JsonValue;
  answers: Prisma.JsonValue;
  completedAt: Date | null;
  xpCredited: boolean;
}): ReviewSessionRow {
  return {
    id: row.id,
    userId: row.userId,
    day: row.day.toISOString().slice(0, 10),
    draw: readDraw(row.draw),
    answers: readSessionAnswers(row.answers),
    completedAt: row.completedAt,
    xpCredited: row.xpCredited,
  };
}

export const reviewCardRepository = {
  /**
   * Enqueues a completed lesson's cards. Idempotent on (user, lesson, quiz):
   * a card already there, retired or not, stays as it is, so a replayed
   * completion moves nothing back. Returns how many were new.
   */
  async enqueueForLesson(
    userId: string,
    lessonId: string,
    cards: readonly NewCard[],
    db: Db = prisma,
  ): Promise<number> {
    if (cards.length === 0) return 0;
    const { count } = await db.reviewCard.createMany({
      data: cards.map((card) => ({
        userId,
        lessonId,
        quizId: card.quizId,
        box: card.box,
        dueAt: card.dueAt,
        everCorrect: card.everCorrect,
      })),
      skipDuplicates: true,
    });
    return count;
  },

  /**
   * The cards due on the day of `now`, of the lessons still published, the
   * most overdue first and the lowest box next, as a session takes them.
   * Never a stale card (isStale), whether retireStale has retired it yet or
   * not: being the most overdue, it would otherwise come first.
   */
  async findDue(userId: string, now: Date, take: number = DUE_WINDOW): Promise<DueCardRow[]> {
    return prisma.reviewCard.findMany({
      where: {
        userId,
        retiredAt: null,
        dueAt: { lte: dueCutoff(now) },
        NOT: staleWhere(now),
        ...LIVE_REVIEW_FILTER,
      },
      orderBy: [{ dueAt: "asc" }, { box: "asc" }],
      take,
      select: DUE_CARD,
    });
  },

  /** Retires these cards of the learner's (a question gone from its lesson). Returns how many. */
  async retire(userId: string, cardIds: readonly string[], now: Date): Promise<number> {
    if (cardIds.length === 0) return 0;
    const { count } = await prisma.reviewCard.updateMany({
      where: { id: { in: [...cardIds] }, userId, retiredAt: null },
      data: { retiredAt: now },
    });
    return count;
  },

  /**
   * Retires the learner's cards long overdue and answered right at least
   * once (isStale). Returns how many. The reads leave them out already
   * (findDue); this writes it down.
   */
  async retireStale(userId: string, now: Date): Promise<number> {
    const { count } = await prisma.reviewCard.updateMany({
      where: { userId, retiredAt: null, ...staleWhere(now) },
      data: { retiredAt: now },
    });
    return count;
  },

  /**
   * Moves a card for an answer checked on the server: up a box, retired, or
   * back to the first (answerCard). Null when the card is not there, is
   * retired, or was moved by another answer in the meantime: the write is
   * conditional on the box and due date it was read with, so two answers at
   * once move it once.
   */
  async applyAnswer(
    userId: string,
    question: { lessonId: string; quizId: string },
    correct: boolean,
    now: Date,
    db: Db = prisma,
  ): Promise<CardSchedule | null> {
    const card = await db.reviewCard.findUnique({
      where: {
        userId_lessonId_quizId: { userId, lessonId: question.lessonId, quizId: question.quizId },
      },
      select: {
        id: true,
        box: true,
        dueAt: true,
        lapses: true,
        everCorrect: true,
        retiredAt: true,
      },
    });
    // Not there (undefined) or retired (a date): either way, nothing to move.
    if (card?.retiredAt !== null) return null;
    const next = answerCard(card, correct, now);
    const { count } = await db.reviewCard.updateMany({
      where: { id: card.id, box: card.box, dueAt: card.dueAt, retiredAt: null },
      data: next,
    });
    return count === 1 ? next : null;
  },

  /** The learner's session for a day (a day key), if one was drawn. */
  async findSession(userId: string, day: string): Promise<ReviewSessionRow | null> {
    const row = await prisma.reviewSession.findUnique({
      where: { userId_day: { userId, day: dayStart(day) } },
      select: SESSION,
    });
    return row === null ? null : toSession(row);
  },

  /**
   * Stores a day's draw and returns the day's session: this one, or the one
   * a second tab or a replayed request stored first. The unique index on
   * (user, day) is what makes it one.
   */
  async createSession(
    userId: string,
    day: string,
    draw: readonly ReviewDrawRef[],
  ): Promise<ReviewSessionRow> {
    await prisma.reviewSession.createMany({
      data: [
        {
          userId,
          day: dayStart(day),
          // SAFETY: ReviewDrawRef is plain data (strings and a number array), valid JSON.
          draw: draw as unknown as Prisma.InputJsonValue,
        },
      ],
      skipDuplicates: true,
    });
    const row = await prisma.reviewSession.findUniqueOrThrow({
      where: { userId_day: { userId, day: dayStart(day) } },
      select: SESSION,
    });
    return toSession(row);
  },

  /**
   * Hands a session in with its answers, once: false when it was already
   * handed in, and nothing is written then. The caller grades the cards and
   * credits the XP only on true.
   */
  async completeSession(
    id: string,
    answers: Readonly<Record<string, number>>,
    now: Date,
    db: Db = prisma,
  ): Promise<boolean> {
    const { count } = await db.reviewSession.updateMany({
      where: { id, completedAt: null },
      data: { answers: { ...answers }, completedAt: now },
    });
    return count === 1;
  },

  /**
   * Claims a completed session's XP, once: false when it was claimed already
   * or the session is not handed in. The caller credits the XP only on true,
   * in the same transaction.
   */
  async claimSessionXp(id: string, db: Db = prisma): Promise<boolean> {
    const { count } = await db.reviewSession.updateMany({
      where: { id, completedAt: { not: null }, xpCredited: false },
      data: { xpCredited: true },
    });
    return count === 1;
  },
};
