import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@cyberlearn/db";

/**
 * The site's award flows: evaluation at an event, and the silent sweep. The
 * award primitive under them is tested where it lives, in packages/db
 * (src/__tests__/badge-award.test.ts), and runs for real here, through the
 * fake transaction: "@cyberlearn/db" is replaced, "@cyberlearn/db/gamification"
 * is not.
 */

const m = vi.hoisted(() => ({
  transaction: vi.fn(),
  findAllActive: vi.fn(),
  findUserBadgeIds: vi.fn(),
  findCriterionFacts: vi.fn(),
  findForGamification: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: { $transaction: m.transaction },
  badgeRepository: {
    findAllActive: m.findAllActive,
    findUserBadgeIds: m.findUserBadgeIds,
    findCriterionFacts: m.findCriterionFacts,
  },
  userRepository: { findForGamification: m.findForGamification },
}));

import { evaluateAndAwardBadges, retroAwardBadges, type AwardableBadge } from "../award";

// ── Transaction client fake ───────────────────────────────────────────────────

interface TxMock {
  userBadge: { createManyAndReturn: ReturnType<typeof vi.fn> };
  user: { findUniqueOrThrow: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  notification: { createMany: ReturnType<typeof vi.fn> };
  season: { findFirst: ReturnType<typeof vi.fn> };
  xpLedger: { create: ReturnType<typeof vi.fn> };
}

function makeTx(insertedBadgeIds: string[], xpTotal: number): TxMock {
  return {
    userBadge: {
      createManyAndReturn: vi
        .fn()
        .mockResolvedValue(insertedBadgeIds.map((badgeId) => ({ badgeId }))),
    },
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ xpTotal }),
      update: vi.fn().mockResolvedValue({}),
    },
    notification: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    season: { findFirst: vi.fn().mockResolvedValue(null) },
    xpLedger: { create: vi.fn().mockResolvedValue({}) },
  };
}

// SAFETY: the fake implements exactly the subset of Prisma.TransactionClient
// that awardBadges touches.
function asTx(tx: TxMock): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}

function badge(id: string, xpReward: number): AwardableBadge {
  return { id, name: `Badge ${id}`, description: `desc ${id}`, rarity: "RARE", xpReward };
}

// Full active-badge shape as returned by badgeRepository.findAllActive.
function hookBadge(id: string, criterionType: string, criterionData: unknown, xpReward = 30) {
  return { ...badge(id, xpReward), isActive: true, criterionType, criterionData };
}

const EMPTY_FACTS = {
  completedLessons: [],
  completedPathIds: [],
  totalCertificates: 0,
  perfectQuizCount: 0,
  placementScores: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  m.findUserBadgeIds.mockResolvedValue(new Set());
  m.findCriterionFacts.mockResolvedValue(EMPTY_FACTS);
  m.findForGamification.mockResolvedValue({ xpTotal: 0, streakDays: 0 });
});

// ── evaluateAndAwardBadges (event hooks) ──────────────────────────────────────
// Uses the REAL evaluator from @cyberlearn/lib - only the DB layer is faked.

describe("evaluateAndAwardBadges", () => {
  it("awards a PERFECT_QUIZ badge once the persisted perfect count reaches its target", async () => {
    const tx = makeTx(["pq"], 100);
    m.transaction.mockImplementation((cb: (txArg: unknown) => Promise<unknown>) => cb(asTx(tx)));
    m.findAllActive.mockResolvedValue([hookBadge("pq", "PERFECT_QUIZ", { count: 2 })]);
    m.findCriterionFacts.mockResolvedValue({ ...EMPTY_FACTS, perfectQuizCount: 2 });

    const result = await evaluateAndAwardBadges("u1", ["PERFECT_QUIZ"], { quizId: "q1" });

    expect(result.awarded.map((b) => b.id)).toEqual(["pq"]);
    expect(tx.userBadge.createManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ context: { quizId: "q1", xpCredited: 30 } })],
      }),
    );
    // Real-time hook → notifies.
    expect(tx.notification.createMany).toHaveBeenCalled();
  });

  it("does not award below the target (no transaction opened)", async () => {
    m.findAllActive.mockResolvedValue([hookBadge("pq", "PERFECT_QUIZ", { count: 2 })]);
    m.findCriterionFacts.mockResolvedValue({ ...EMPTY_FACTS, perfectQuizCount: 1 });

    const result = await evaluateAndAwardBadges("u1", ["PERFECT_QUIZ"], { quizId: "q1" });

    expect(result.awarded).toHaveLength(0);
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("evaluates ONLY the requested criterion types", async () => {
    const tx = makeTx(["pq"], 0);
    m.transaction.mockImplementation((cb: (txArg: unknown) => Promise<unknown>) => cb(asTx(tx)));
    // The XP badge is satisfiable but is NOT of a requested type.
    m.findAllActive.mockResolvedValue([
      hookBadge("xp", "XP_THRESHOLD", { threshold: 1 }),
      hookBadge("pq", "PERFECT_QUIZ", {}),
    ]);
    m.findForGamification.mockResolvedValue({ xpTotal: 9999, streakDays: 0 });
    m.findCriterionFacts.mockResolvedValue({ ...EMPTY_FACTS, perfectQuizCount: 1 });

    const result = await evaluateAndAwardBadges("u1", ["PERFECT_QUIZ"], {});

    expect(result.awarded.map((b) => b.id)).toEqual(["pq"]);
    const insertArg = tx.userBadge.createManyAndReturn.mock.calls[0]?.[0] as {
      data: { badgeId: string }[];
    };
    expect(insertArg.data.map((d) => d.badgeId)).toEqual(["pq"]);
  });

  it("returns empty without reading facts when no active badge matches the types", async () => {
    m.findAllActive.mockResolvedValue([hookBadge("xp", "XP_THRESHOLD", { threshold: 1 })]);

    const result = await evaluateAndAwardBadges("u1", ["PERFECT_QUIZ"], {});

    expect(result.awarded).toHaveLength(0);
    expect(m.findCriterionFacts).not.toHaveBeenCalled();
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("awards the CUSTOM placement badge on mastery, never other events", async () => {
    const tx = makeTx(["place"], 0);
    m.transaction.mockImplementation((cb: (txArg: unknown) => Promise<unknown>) => cb(asTx(tx)));
    m.findAllActive.mockResolvedValue([
      hookBadge("place", "CUSTOM", { event: "placement_test_passed" }),
      hookBadge("other", "CUSTOM", { event: "some_future_event" }),
    ]);
    m.findCriterionFacts.mockResolvedValue({
      ...EMPTY_FACTS,
      placementScores: { devScore: 80, cybersecScore: 60, networkScore: 0 },
    });

    const result = await evaluateAndAwardBadges("u1", ["CUSTOM"], {
      event: "placement_test_passed",
    });

    expect(result.awarded.map((b) => b.id)).toEqual(["place"]);
  });

  it("skips badges the user already earned", async () => {
    m.findAllActive.mockResolvedValue([hookBadge("pq", "PERFECT_QUIZ", {})]);
    m.findUserBadgeIds.mockResolvedValue(new Set(["pq"]));
    m.findCriterionFacts.mockResolvedValue({ ...EMPTY_FACTS, perfectQuizCount: 5 });

    const result = await evaluateAndAwardBadges("u1", ["PERFECT_QUIZ"], {});

    expect(result.awarded).toHaveLength(0);
    expect(m.transaction).not.toHaveBeenCalled();
  });
});

// ── retroAwardBadges ──────────────────────────────────────────────────────────

describe("retroAwardBadges", () => {
  it("runs awardBadges in a transaction, silently, with the retroactive context", async () => {
    const tx = makeTx(["b1"], 50);
    m.transaction.mockImplementation((cb: (txArg: unknown) => Promise<unknown>) => cb(asTx(tx)));

    const result = await retroAwardBadges("u1", [badge("b1", 20)]);

    expect(result.xpGained).toBe(20);
    expect(tx.userBadge.createManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ context: { source: "retroactive", xpCredited: 20 } })],
      }),
    );
    // SILENT: the catch-up sweep never notifies.
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it("does not even open a transaction for an empty badge list", async () => {
    const result = await retroAwardBadges("u1", []);
    expect(result.awarded).toHaveLength(0);
    expect(m.transaction).not.toHaveBeenCalled();
  });
});
