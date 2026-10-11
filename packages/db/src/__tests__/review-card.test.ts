/**
 * Review cards and sessions: what is asked of the database. Prisma is mocked;
 * where an answer moves a card and what a day draws are the lib's, tested
 * there (@cyberlearn/lib/revisions/cards). What this checks is that every
 * write is idempotent or conditional, so a replayed request changes nothing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { reviewCardRepository } from "../repositories/review-card.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    reviewCard: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    reviewSession: {
      createMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

// 10:00 in Paris on 11 October 2026.
const NOW = new Date("2026-10-11T08:00:00.000Z");
const USER = "11111111-1111-4111-8111-111111111111";
const LESSON = "22222222-2222-4222-8222-222222222222";
const day = (key: string): Date => new Date(`${key}T00:00:00Z`);

/** The first argument a mocked call was made with. */
function argOf(fn: { mock: { calls: unknown[][] } }, call = 0): unknown {
  return fn.mock.calls[call]?.[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enqueueForLesson", () => {
  it("inserts the cards, skipping any already there, retired or not", async () => {
    mockPrisma.reviewCard.createMany.mockResolvedValue({ count: 1 });
    const count = await reviewCardRepository.enqueueForLesson(USER, LESSON, [
      { quizId: "q-2", box: 1, dueAt: day("2026-10-12"), everCorrect: false },
      { quizId: "q-3", box: 3, dueAt: day("2026-10-18"), everCorrect: true },
    ]);
    expect(count).toBe(1);
    expect(mockPrisma.reviewCard.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: USER,
          lessonId: LESSON,
          quizId: "q-2",
          box: 1,
          dueAt: day("2026-10-12"),
          everCorrect: false,
        },
        {
          userId: USER,
          lessonId: LESSON,
          quizId: "q-3",
          box: 3,
          dueAt: day("2026-10-18"),
          everCorrect: true,
        },
      ],
      skipDuplicates: true,
    });
  });

  it("writes through the transaction it is given", async () => {
    const tx = { reviewCard: { createMany: vi.fn().mockResolvedValue({ count: 1 }) } };
    await reviewCardRepository.enqueueForLesson(
      USER,
      LESSON,
      [{ quizId: "q-1", box: 1, dueAt: day("2026-10-12"), everCorrect: false }],
      // SAFETY: the fake has the one model method enqueueForLesson calls.
      tx as unknown as Prisma.TransactionClient,
    );
    expect(tx.reviewCard.createMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.reviewCard.createMany).not.toHaveBeenCalled();
  });

  it("asks nothing of the database when there is nothing to enqueue", async () => {
    expect(await reviewCardRepository.enqueueForLesson(USER, LESSON, [])).toBe(0);
    expect(mockPrisma.reviewCard.createMany).not.toHaveBeenCalled();
  });
});

describe("findDue", () => {
  it("reads the cards due by today, not retired, of the live lessons, in a session's order", async () => {
    mockPrisma.reviewCard.findMany.mockResolvedValue([]);
    await reviewCardRepository.findDue(USER, NOW);
    expect(mockPrisma.reviewCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: USER,
          retiredAt: null,
          // The start of today: a card due today is due from midnight.
          dueAt: { lte: day("2026-10-11") },
          // Never a stale card, retired by retireStale yet or not: answered
          // right once and due before 11 September, more than thirty days ago.
          NOT: { everCorrect: true, dueAt: { lt: day("2026-09-11") } },
          lesson: { status: "PUBLISHED" },
        },
        orderBy: [{ dueAt: "asc" }, { box: "asc" }],
        take: 200,
      }),
    );
  });
});

describe("retire", () => {
  it("retires only the learner's own cards still in the cycle", async () => {
    mockPrisma.reviewCard.updateMany.mockResolvedValue({ count: 2 });
    expect(await reviewCardRepository.retire(USER, ["c1", "c2"], NOW)).toBe(2);
    expect(mockPrisma.reviewCard.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1", "c2"] }, userId: USER, retiredAt: null },
      data: { retiredAt: NOW },
    });
  });

  it("asks nothing of the database for no card", async () => {
    expect(await reviewCardRepository.retire(USER, [], NOW)).toBe(0);
    expect(mockPrisma.reviewCard.updateMany).not.toHaveBeenCalled();
  });
});

describe("retireStale", () => {
  it("retires the cards answered right once and more than thirty days overdue", async () => {
    mockPrisma.reviewCard.updateMany.mockResolvedValue({ count: 3 });
    expect(await reviewCardRepository.retireStale(USER, NOW)).toBe(3);
    expect(mockPrisma.reviewCard.updateMany).toHaveBeenCalledWith({
      where: {
        userId: USER,
        retiredAt: null,
        everCorrect: true,
        dueAt: { lt: day("2026-09-11") },
      },
      data: { retiredAt: NOW },
    });
  });
});

describe("applyAnswer", () => {
  const question = { lessonId: LESSON, quizId: "q-1" };
  const card = {
    id: "c1",
    box: 2,
    dueAt: day("2026-10-11"),
    lapses: 0,
    everCorrect: false,
    retiredAt: null,
  };

  it("moves the card up a box, on the condition it was not moved meanwhile", async () => {
    mockPrisma.reviewCard.findUnique.mockResolvedValue(card);
    mockPrisma.reviewCard.updateMany.mockResolvedValue({ count: 1 });
    const next = await reviewCardRepository.applyAnswer(USER, question, true, NOW);
    expect(next).toEqual({
      box: 3,
      dueAt: day("2026-10-18"),
      lapses: 0,
      everCorrect: true,
      lastAnsweredAt: NOW,
      retiredAt: null,
    });
    expect(argOf(mockPrisma.reviewCard.findUnique)).toMatchObject({
      where: { userId_lessonId_quizId: { userId: USER, lessonId: LESSON, quizId: "q-1" } },
    });
    expect(mockPrisma.reviewCard.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", box: 2, dueAt: day("2026-10-11"), retiredAt: null },
      data: next,
    });
  });

  it("sends it back to the first box on a wrong answer", async () => {
    mockPrisma.reviewCard.findUnique.mockResolvedValue(card);
    mockPrisma.reviewCard.updateMany.mockResolvedValue({ count: 1 });
    const next = await reviewCardRepository.applyAnswer(USER, question, false, NOW);
    expect(next).toMatchObject({ box: 1, dueAt: day("2026-10-12"), lapses: 1 });
  });

  it("is null when the card is not there or retired, and writes nothing", async () => {
    mockPrisma.reviewCard.findUnique.mockResolvedValueOnce(null);
    expect(await reviewCardRepository.applyAnswer(USER, question, true, NOW)).toBeNull();
    mockPrisma.reviewCard.findUnique.mockResolvedValueOnce({ ...card, retiredAt: NOW });
    expect(await reviewCardRepository.applyAnswer(USER, question, true, NOW)).toBeNull();
    expect(mockPrisma.reviewCard.updateMany).not.toHaveBeenCalled();
  });

  it("is null when another answer moved the card first", async () => {
    mockPrisma.reviewCard.findUnique.mockResolvedValue(card);
    mockPrisma.reviewCard.updateMany.mockResolvedValue({ count: 0 });
    expect(await reviewCardRepository.applyAnswer(USER, question, true, NOW)).toBeNull();
  });
});

const DRAW = [{ cardId: "c1", lessonId: LESSON, quizId: "q-1", domain: "Leçon", order: [1, 0] }];

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    userId: USER,
    day: day("2026-10-11"),
    draw: DRAW,
    answers: {},
    completedAt: null,
    xpCredited: false,
    ...overrides,
  };
}

describe("sessions", () => {
  it("finds the day's session by its day key, and reads its JSON back", async () => {
    mockPrisma.reviewSession.findUnique.mockResolvedValue(
      sessionRow({ answers: { "0": 1, bogus: "x" } }),
    );
    const session = await reviewCardRepository.findSession(USER, "2026-10-11");
    expect(argOf(mockPrisma.reviewSession.findUnique)).toMatchObject({
      where: { userId_day: { userId: USER, day: day("2026-10-11") } },
    });
    expect(session).toEqual({
      id: "s1",
      userId: USER,
      day: "2026-10-11",
      draw: DRAW,
      answers: { "0": 1 },
      completedAt: null,
      xpCredited: false,
    });
  });

  it("is null when no session was drawn that day", async () => {
    mockPrisma.reviewSession.findUnique.mockResolvedValue(null);
    expect(await reviewCardRepository.findSession(USER, "2026-10-11")).toBeNull();
  });

  it("stores one session a day and hands back the one stored first", async () => {
    mockPrisma.reviewSession.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.reviewSession.findUniqueOrThrow.mockResolvedValue(sessionRow());
    const session = await reviewCardRepository.createSession(USER, "2026-10-11", DRAW);
    expect(mockPrisma.reviewSession.createMany).toHaveBeenCalledWith({
      data: [{ userId: USER, day: day("2026-10-11"), draw: DRAW }],
      skipDuplicates: true,
    });
    expect(session.id).toBe("s1");
  });

  it("hands a session in once", async () => {
    mockPrisma.reviewSession.updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await reviewCardRepository.completeSession("s1", { "0": 1 }, NOW)).toBe(true);
    expect(mockPrisma.reviewSession.updateMany).toHaveBeenCalledWith({
      where: { id: "s1", completedAt: null },
      data: { answers: { "0": 1 }, completedAt: NOW },
    });
    mockPrisma.reviewSession.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await reviewCardRepository.completeSession("s1", { "0": 0 }, NOW)).toBe(false);
  });

  it("claims a handed-in session's XP once", async () => {
    mockPrisma.reviewSession.updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await reviewCardRepository.claimSessionXp("s1")).toBe(true);
    expect(mockPrisma.reviewSession.updateMany).toHaveBeenCalledWith({
      where: { id: "s1", completedAt: { not: null }, xpCredited: false },
      data: { xpCredited: true },
    });
    mockPrisma.reviewSession.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await reviewCardRepository.claimSessionXp("s1")).toBe(false);
  });
});
