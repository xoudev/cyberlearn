import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { computeLevel } from "@cyberlearn/lib";
import { awardBadges, type AwardableBadge } from "../badges/award.js";

/**
 * The badge-award primitive every award goes through: the site's lesson and
 * path flows, its retroactive sweep, and a badge granted from the console.
 */

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
      data: { xpTotal: { increment: 80 }, level: computeLevel(180).level },
    });
    expect(tx.xpLedger.create).toHaveBeenCalledWith({
      data: { userId: "u1", amount: 80, source: "BADGE" },
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
      data: { xpTotal: { increment: 10 }, level: computeLevel(210).level },
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

  it("points the BADGE_EARNED notification at the profile's Badges tab", async () => {
    const tx = makeTx(["b1"], 0);
    await awardBadges(asTx(tx), "u1", [badge("b1", 40)], {});

    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ actionUrl: "/profile?tab=badges" })],
    });
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
