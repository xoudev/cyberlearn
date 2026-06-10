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
    userLessonProgress: { upsert: vi.fn() },
    user: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
    userBadge: { createManyAndReturn: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    reviewSchedule: { upsert: vi.fn() },
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
    lastActiveAt: null,
  });
  m.findProgress.mockResolvedValue(null); // first completion
  m.findAllActive.mockResolvedValue([XP_BADGE]);
  m.findUserBadgeIds.mockResolvedValue(new Set());
  m.findCriterionFacts.mockResolvedValue({
    completedLessons: [],
    completedPathIds: [],
    totalCertificates: 0,
  });
  m.transaction.mockImplementation((cb: (tx: unknown) => Promise<unknown>) => cb(m.tx));
  m.tx.userBadge.createManyAndReturn.mockResolvedValue([{ badgeId: "b1" }]);
  // Read inside the tx happens AFTER the lesson-XP update (90 + 20 = 110).
  m.tx.user.findUniqueOrThrow.mockResolvedValue({ xpTotal: 110 });
});

describe("completeLesson — badge xpReward crediting (interactive transaction)", () => {
  it("credits lesson XP + badge XP atomically and reports both to the client", async () => {
    const result = await completeLesson(LESSON_ID);

    // Lesson reward (20) + badge reward (50).
    expect(result.xpGained).toBe(70);
    expect(result.newBadges).toEqual([{ name: "Hacktiviste", rarity: "EPIC", xpReward: 50 }]);

    // First user.update: lesson XP (absolute set). Second: badge credit.
    const updates = m.tx.user.update.mock.calls.map(
      (c) => (c[0] as { data: { xpTotal: number } }).data.xpTotal,
    );
    expect(updates).toEqual([110, 160]);

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
    // Single user.update: the lesson one. No badge credit.
    expect(m.tx.user.update).toHaveBeenCalledTimes(1);
  });

  it("does not re-credit anything on an already-completed lesson", async () => {
    m.findProgress.mockResolvedValue({ status: "COMPLETED" });

    const result = await completeLesson(LESSON_ID);

    expect(result.alreadyCompleted).toBe(true);
    expect(result.xpGained).toBe(0);
    expect(result.newBadges).toHaveLength(0);
    expect(m.tx.userBadge.createManyAndReturn).not.toHaveBeenCalled();
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
