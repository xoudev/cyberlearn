import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeLevel } from "@cyberlearn/lib";

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

import {
  awardBadges,
  evaluateAndAwardBadges,
  retroAwardBadges,
  type AwardableBadge,
} from "../award";

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
function asTx(tx: TxMock) {
  return tx as unknown as Parameters<typeof awardBadges>[0];
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

// ── awardBadges ───────────────────────────────────────────────────────────────

describe("awardBadges", () => {
  it("credits the xpReward sum of inserted rows and recomputes the level", async () => {
    const tx = makeTx(["b1", "b2"], 100);
    const result = await awardBadges(asTx(tx), "u1", [badge("b1", 50), badge("b2", 30)], {
      lessonId: "l1",
    });

    expect(result.awarded.map((b) => b.id)).toEqual(["b1", "b2"]);
    expect(result.xpGained).toBe(80);
    expect(result.newXpTotal).toBe(180);
    expect(result.newLevel).toBe(computeLevel(180).level);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { xpTotal: 180, level: computeLevel(180).level },
    });
  });

  it("stamps each inserted row with context.xpCredited", async () => {
    const tx = makeTx(["b1"], 0);
    await awardBadges(asTx(tx), "u1", [badge("b1", 25)], { pathId: "p1" });

    expect(tx.userBadge.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        {
          userId: "u1",
          badgeId: "b1",
          context: { pathId: "p1", xpCredited: 25 },
        },
      ],
      skipDuplicates: true,
      select: { badgeId: true },
    });
  });

  it("credits ONLY the rows actually inserted (race loser excluded)", async () => {
    // b2 lost a concurrent race: skipDuplicates dropped it.
    const tx = makeTx(["b1"], 200);
    const result = await awardBadges(asTx(tx), "u1", [badge("b1", 10), badge("b2", 90)], {});

    expect(result.awarded.map((b) => b.id)).toEqual(["b1"]);
    expect(result.xpGained).toBe(10);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { xpTotal: 210, level: computeLevel(210).level },
    });
    // Notifications only for the inserted row.
    const notifArg = tx.notification.createMany.mock.calls[0]?.[0] as { data: unknown[] };
    expect(notifArg.data).toHaveLength(1);
  });

  it("is a no-op when nothing is inserted (idempotent re-award)", async () => {
    const tx = makeTx([], 500);
    const result = await awardBadges(asTx(tx), "u1", [badge("b1", 50)], {});

    expect(result).toEqual({ awarded: [], xpGained: 0, newXpTotal: null, newLevel: null });
    expect(tx.user.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it("skips the XP update for zero-reward badges but still notifies", async () => {
    const tx = makeTx(["b1"], 100);
    const result = await awardBadges(asTx(tx), "u1", [badge("b1", 0)], {});

    expect(result.xpGained).toBe(0);
    expect(result.newXpTotal).toBeNull();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.notification.createMany).toHaveBeenCalled();
  });

  it("includes xpReward in the BADGE_EARNED notification metadata", async () => {
    const tx = makeTx(["b1"], 0);
    await awardBadges(asTx(tx), "u1", [badge("b1", 40)], {});

    const notifArg = tx.notification.createMany.mock.calls[0]?.[0] as {
      data: { type: string; metadata: Record<string, unknown> }[];
    };
    expect(notifArg.data[0]?.type).toBe("BADGE_EARNED");
    expect(notifArg.data[0]?.metadata).toEqual({ badgeId: "b1", rarity: "RARE", xpReward: 40 });
  });

  it("creates no notification when notify is false", async () => {
    const tx = makeTx(["b1"], 0);
    await awardBadges(asTx(tx), "u1", [badge("b1", 40)], {}, { notify: false });

    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });

  it("returns the empty result without touching the tx for an empty badge list", async () => {
    const tx = makeTx([], 0);
    const result = await awardBadges(asTx(tx), "u1", [], {});

    expect(result.awarded).toHaveLength(0);
    expect(tx.userBadge.createManyAndReturn).not.toHaveBeenCalled();
  });
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
