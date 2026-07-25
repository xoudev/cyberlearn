import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeLevel } from "@cyberlearn/lib";

const LESSON_ID = "11111111-1111-4111-8111-111111111111";

const m = vi.hoisted(() => ({
  lessonFindUnique: vi.fn(),
  findForGamification: vi.fn(),
  findProgress: vi.fn(),
  findAllActive: vi.fn(),
  findUserBadgeIds: vi.fn(),
  findCriterionFacts: vi.fn(),
  transaction: vi.fn(),
  tx: {
    userLessonProgress: { updateMany: vi.fn(), createMany: vi.fn() },
    user: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
    userBadge: { createManyAndReturn: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    reviewSchedule: { upsert: vi.fn() },
    userActivityDay: { upsert: vi.fn() },
    season: { findFirst: vi.fn() },
    xpLedger: { create: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireRequestUser: vi.fn().mockResolvedValue({ id: "u1" }),
}));
vi.mock("@/app/(app)/paths/[slug]/_actions/generate-certificate", () => ({
  checkAndIssueCertificates: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    lesson: { findUnique: m.lessonFindUnique },
    $transaction: m.transaction,
  },
  lessonRepository: { findProgress: m.findProgress },
  badgeRepository: {
    findAllActive: m.findAllActive,
    findUserBadgeIds: m.findUserBadgeIds,
    findCriterionFacts: m.findCriterionFacts,
  },
  userRepository: { findForGamification: m.findForGamification },
}));

import { completeLesson } from "../track-progress";

// Mutable XP the tx mock reads/writes so creditXp's read-modify-write sees the
// evolving total (lesson credit 90→110, then badge credit 110→160).
let xpState = 90;

const XP_BADGE = {
  id: "b1",
  name: "Hacktiviste",
  description: "Atteignez 100 XP.",
  rarity: "EPIC",
  xpReward: 50,
  isActive: true,
  criterionType: "XP_THRESHOLD",
  criterionData: { threshold: 100 },
};

beforeEach(() => {
  vi.clearAllMocks();
  m.lessonFindUnique.mockResolvedValue({ xpReward: 20, slug: "sql-injection", category: "DEV" });
  m.findForGamification.mockResolvedValue({
    xpTotal: 90,
    level: computeLevel(90).level,
    streakDays: 0,
    longestStreak: 0,
    streakFreezes: 1,
    lastActiveAt: new Date("2026-01-01T12:00:00Z"),
  });
  m.findProgress.mockResolvedValue(null); // first completion
  m.findAllActive.mockResolvedValue([XP_BADGE]);
  m.findUserBadgeIds.mockResolvedValue(new Set());
  m.findCriterionFacts.mockResolvedValue({
    completedLessons: [],
    completedPathIds: [],
    totalCertificates: 0,
    perfectQuizCount: 0,
    placementScores: null,
  });
  m.transaction.mockImplementation((cb: (tx: unknown) => Promise<unknown>) => cb(m.tx));
  // The in-transaction claim decides whether this is the first completion:
  // one row flipped means this caller won it.
  m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 1 });
  m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 0 });
  m.tx.userBadge.createManyAndReturn.mockResolvedValue([{ badgeId: "b1" }]);
  m.tx.season.findFirst.mockResolvedValue(null);
  m.tx.xpLedger.create.mockResolvedValue({});
  // creditXp reads/writes the user's XP inside the tx; track it statefully so the
  // lesson credit (90→110) and the badge credit (110→160) chain correctly.
  xpState = 90;
  m.tx.user.findUniqueOrThrow.mockImplementation(() =>
    Promise.resolve({ xpTotal: xpState, level: computeLevel(xpState).level }),
  );
  m.tx.user.update.mockImplementation(
    (args: { data: { xpTotal?: number | { increment: number } } }) => {
      const xp = args.data.xpTotal;
      if (typeof xp === "number") xpState = xp;
      else if (xp && typeof xp.increment === "number") xpState += xp.increment;
      return Promise.resolve({});
    },
  );
});

describe("completeLesson - badge xpReward crediting (interactive transaction)", () => {
  it("credits lesson XP + badge XP atomically and reports both to the client", async () => {
    const result = await completeLesson(LESSON_ID);

    // Lesson reward (20) + badge reward (50).
    expect(result.xpGained).toBe(70);
    expect(result.newBadges).toEqual([{ name: "Hacktiviste", rarity: "EPIC", xpReward: 50 }]);

    // creditXp increments lesson XP (+20) then badge XP (+50); the streak-only
    // update carries no xpTotal and is filtered out.
    const xpUpdates = m.tx.user.update.mock.calls
      .map((c) => (c[0] as { data: { xpTotal?: { increment: number } } }).data.xpTotal?.increment)
      .filter((x): x is number => typeof x === "number");
    expect(xpUpdates).toEqual([20, 50]);

    // Final level derives from the credited total.
    expect(result.newLevel).toBe(computeLevel(160).level);
    expect(result.leveledUp).toBe(computeLevel(160).level > computeLevel(90).level);
  });

  it("stamps the inserted row and notifies with xpReward metadata", async () => {
    await completeLesson(LESSON_ID);

    expect(m.tx.userBadge.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        {
          userId: "u1",
          badgeId: "b1",
          context: { lessonId: LESSON_ID, xpCredited: 50 },
        },
      ],
      skipDuplicates: true,
      select: { badgeId: true },
    });

    const notifArg = m.tx.notification.createMany.mock.calls[0]?.[0] as {
      data: { metadata: Record<string, unknown> }[];
    };
    expect(notifArg.data[0]?.metadata).toEqual({ badgeId: "b1", rarity: "EPIC", xpReward: 50 });
  });

  it("credits nothing when the badge row lost a concurrent race (idempotence)", async () => {
    m.tx.userBadge.createManyAndReturn.mockResolvedValue([]);

    const result = await completeLesson(LESSON_ID);

    expect(result.xpGained).toBe(20); // lesson XP only
    expect(result.newBadges).toHaveLength(0);
    // Only the lesson XP is credited; no badge credit when the row lost the race.
    const xpUpdates = m.tx.user.update.mock.calls
      .map((c) => (c[0] as { data: { xpTotal?: { increment: number } } }).data.xpTotal?.increment)
      .filter((x): x is number => typeof x === "number");
    expect(xpUpdates).toEqual([20]);
  });

  it("does not re-credit anything on an already-completed lesson", async () => {
    m.findProgress.mockResolvedValue({ status: "COMPLETED" });
    // Nothing left to flip, and the insert conflicts with the existing row.
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 0 });

    const result = await completeLesson(LESSON_ID);

    expect(result.alreadyCompleted).toBe(true);
    expect(result.xpGained).toBe(0);
    expect(result.newBadges).toHaveLength(0);
    expect(m.tx.userBadge.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("credits nothing when a concurrent submission won the completion claim", async () => {
    // The pre-transaction read said IN_PROGRESS, but by the time the
    // transaction ran another request had already flipped the row.
    m.findProgress.mockResolvedValue(null);
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 0 });

    const result = await completeLesson(LESSON_ID);

    expect(result.alreadyCompleted).toBe(true);
    expect(result.xpGained).toBe(0);
    expect(m.tx.xpLedger.create).not.toHaveBeenCalled();
    expect(m.tx.userBadge.createManyAndReturn).not.toHaveBeenCalled();
    expect(m.tx.reviewSchedule.upsert).not.toHaveBeenCalled();
    expect(m.tx.userActivityDay.upsert).not.toHaveBeenCalled();
  });

  it("treats a fresh insert as the first completion", async () => {
    // No progress row existed, so the conditional update matched nothing and
    // the insert is what claims the completion.
    m.findProgress.mockResolvedValue(null);
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 1 });

    const result = await completeLesson(LESSON_ID);

    expect(result.alreadyCompleted).toBe(false);
    expect(result.xpGained).toBe(70);
  });

  it("writes the LEVEL_UP notification with the badge-inclusive totals", async () => {
    await completeLesson(LESSON_ID);

    const before = computeLevel(90).level;
    const after = computeLevel(160).level;
    if (after > before) {
      const callArg = m.tx.notification.create.mock.calls[0]?.[0] as {
        data: { type: string; metadata: Record<string, unknown> };
      };
      expect(callArg.data.type).toBe("LEVEL_UP");
      expect(callArg.data.metadata).toEqual({
        previousLevel: before,
        newLevel: after,
        xpTotal: 160,
      });
    } else {
      expect(m.tx.notification.create).not.toHaveBeenCalled();
    }
  });
});
