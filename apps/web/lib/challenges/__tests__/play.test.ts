import { beforeEach, describe, expect, it, vi } from "vitest";
import { weeklyChallengeId } from "@cyberlearn/lib/challenges/weekly";

/**
 * The XP a solve credits: the reward, twice over for the week's challenge,
 * written on the progress row by the transaction that marks it solved, and
 * credited once.
 */

const ONE = "11111111-1111-4111-8111-111111111111";
const TWO = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";

const m = vi.hoisted(() => ({
  tx: {
    userChallengeProgress: { upsert: vi.fn(), updateMany: vi.fn() },
    user: { update: vi.fn() },
    userActivityDay: { upsert: vi.fn() },
    notification: { create: vi.fn() },
  },
  prisma: {
    challenge: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  repo: { getUserProgress: vi.fn(), findActiveIdsInOrder: vi.fn() },
  creditXp: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({ prisma: m.prisma, challengeRepository: m.repo }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/quests/progress", () => ({ recordQuestProgress: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkHintReveal: vi.fn() }));
vi.mock("@/lib/xp/credit", () => ({ creditXp: m.creditXp }));

const { completeFor, submitFlagFor } = await import("../play");

const NOW = new Date();
/** The week's challenge now, among ONE and TWO; the other is not. */
const WEEKLY = weeklyChallengeId([ONE, TWO], NOW) ?? ONE;
const PLAIN = WEEKLY === ONE ? TWO : ONE;

beforeEach(() => {
  vi.clearAllMocks();
  m.repo.findActiveIdsInOrder.mockResolvedValue([ONE, TWO]);
  m.repo.getUserProgress.mockResolvedValue(null);
  m.prisma.user.findUnique.mockResolvedValue({
    xpTotal: 0,
    level: 1,
    streakDays: 0,
    longestStreak: 0,
    streakFreezes: 0,
    lastActiveAt: null,
  });
  m.prisma.$transaction.mockImplementation((fn: (tx: typeof m.tx) => Promise<unknown>) => fn(m.tx));
  m.tx.userChallengeProgress.updateMany.mockResolvedValue({ count: 1 });
});

describe("a solve", () => {
  it("credits twice the reward on the week's challenge, and says so", async () => {
    m.prisma.challenge.findUnique.mockResolvedValue({ type: "PUZZLE", xpReward: 75, title: "X" });
    await expect(completeFor(USER, WEEKLY)).resolves.toEqual({ xpEarned: 150 });
    expect(m.creditXp).toHaveBeenCalledWith(m.tx, USER, 150, "CHALLENGE", expect.anything());
    const flip = m.tx.userChallengeProgress.updateMany.mock.calls[0]?.[0] as {
      data: { xpEarned: number };
    };
    expect(flip.data.xpEarned).toBe(150);
    const notification = m.tx.notification.create.mock.calls[0]?.[0] as {
      data: { body: string };
    };
    expect(notification.data.body).toContain("défi de la semaine");
  });

  it("credits the reward alone on any other challenge", async () => {
    m.prisma.challenge.findUnique.mockResolvedValue({ type: "LAB", xpReward: 75, title: "X" });
    await expect(completeFor(USER, PLAIN)).resolves.toEqual({ xpEarned: 75 });
    expect(m.creditXp).toHaveBeenCalledWith(m.tx, USER, 75, "CHALLENGE", expect.anything());
  });

  it("credits nothing when another submission solved it first", async () => {
    m.prisma.challenge.findUnique.mockResolvedValue({ type: "PUZZLE", xpReward: 75, title: "X" });
    m.tx.userChallengeProgress.updateMany.mockResolvedValue({ count: 0 });
    await expect(completeFor(USER, WEEKLY)).resolves.toEqual({});
    expect(m.creditXp).not.toHaveBeenCalled();
  });

  it("hands the XP back with a right flag", async () => {
    m.prisma.challenge.findUnique.mockResolvedValue({
      id: WEEKLY,
      flag: "CL{ok}",
      machine: null,
      xpReward: 50,
      title: "X",
      maxAttempts: 3,
    });
    await expect(submitFlagFor(USER, WEEKLY, "CL{ok}")).resolves.toEqual({
      correct: true,
      xpEarned: 100,
    });
  });
});
