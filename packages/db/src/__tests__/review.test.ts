/**
 * The revisions queue: what is due of what is live, cut to a session. Prisma
 * is mocked; the ordering and the cap are the lib's, tested there, and what
 * this checks is that every reader asks the same question of the database.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { REVIEW_SESSION_SIZE } from "@cyberlearn/lib/revisions/session";
import { LIVE_REVIEW_FILTER, reviewRepository } from "../repositories/review.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { reviewSchedule: { findMany: vi.fn(), count: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const NOW = new Date("2026-10-05T12:00:00.000Z");
const USER = "11111111-1111-4111-8111-111111111111";

function row(id: string, daysAgo: number, easeFactor = 2.5, userId = USER) {
  return {
    id,
    userId,
    nextReviewAt: new Date(NOW.getTime() - daysAgo * 86_400_000),
    easeFactor,
    lesson: {
      id: `l-${id}`,
      slug: id,
      title: `Leçon ${id}`,
      category: "DEV",
      difficulty: "BEGINNER",
      xpReward: 50,
      estimatedMinutes: 10,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findDue", () => {
  it("asks for what is due, of the lessons still published, oldest first", async () => {
    mockPrisma.reviewSchedule.findMany.mockResolvedValue([]);
    await reviewRepository.findDue(USER, NOW);
    expect(mockPrisma.reviewSchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER, nextReviewAt: { lte: NOW }, lesson: { status: "PUBLISHED" } },
        orderBy: { nextReviewAt: "asc" },
      }),
    );
  });
});

describe("findSession", () => {
  it("cuts the queue to a session and says how many wait", async () => {
    const due = Array.from({ length: 8 }, (_, i) => row(`r${String(i)}`, 8 - i));
    mockPrisma.reviewSchedule.findMany.mockResolvedValue(due);
    const view = await reviewRepository.findSession(USER, NOW);
    expect(view.rows).toHaveLength(REVIEW_SESSION_SIZE);
    expect(view.rows.map((r) => r.id)).toEqual(["r0", "r1", "r2", "r3", "r4"]);
    expect(view.waiting).toBe(3);
    expect(view.total).toBe(8);
  });
});

describe("countSession", () => {
  it("counts the live due rows, and never more than a session", async () => {
    mockPrisma.reviewSchedule.count.mockResolvedValue(60);
    expect(await reviewRepository.countSession(USER, NOW)).toBe(REVIEW_SESSION_SIZE);
    expect(mockPrisma.reviewSchedule.count).toHaveBeenCalledWith({
      where: { userId: USER, nextReviewAt: { lte: NOW }, ...LIVE_REVIEW_FILTER },
    });
    mockPrisma.reviewSchedule.count.mockResolvedValue(2);
    expect(await reviewRepository.countSession(USER, NOW)).toBe(2);
  });
});

describe("findUpcoming", () => {
  it("reads what comes after now, of the live lessons, the soonest first", async () => {
    mockPrisma.reviewSchedule.findMany.mockResolvedValue([]);
    await reviewRepository.findUpcoming(USER, NOW, 3);
    expect(mockPrisma.reviewSchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER, nextReviewAt: { gt: NOW }, lesson: { status: "PUBLISHED" } },
        orderBy: { nextReviewAt: "asc" },
        take: 3,
      }),
    );
  });
});

describe("findReminders", () => {
  it("groups by reader, keeps the live lessons and the readers who want it, and tells a session's size", async () => {
    const other = "22222222-2222-4222-8222-222222222222";
    mockPrisma.reviewSchedule.findMany.mockResolvedValue([
      ...Array.from({ length: 7 }, (_, i) => row(`a${String(i)}`, 7 - i)),
      row("b0", 3, 2.5, other),
      row("b1", 1, 2.5, other),
    ]);
    const reminders = await reviewRepository.findReminders(NOW);
    expect(reminders).toEqual([
      { userId: USER, count: REVIEW_SESSION_SIZE, firstTitle: "Leçon a0" },
      { userId: other, count: 2, firstTitle: "Leçon b0" },
    ]);
    const call = mockPrisma.reviewSchedule.findMany.mock.calls[0]?.[0] as {
      where: { lesson: { status: string }; user: { OR: unknown[] } };
    };
    expect(call.where.lesson).toEqual({ status: "PUBLISHED" });
    expect(call.where.user.OR).toHaveLength(2);
  });
});
