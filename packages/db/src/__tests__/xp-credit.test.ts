import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { computeLevel } from "@cyberlearn/lib";
import { creditXp } from "../xp/credit.js";
import { recordSeasonXp } from "../league/record-season-xp.js";

/**
 * The single XP credit, and the season figure it keeps in step. Shared by the
 * site and the console; the console's corrections are the one caller that
 * takes XP back, with a negative amount.
 */

const SEASON = { id: "season-1", index: 3 };

// Minimal transaction-client mock. Levels: L1 at 0 XP, L2 at 100, L3 at 300.
function mockTx(xpTotal: number, season: typeof SEASON | null = null) {
  return {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ xpTotal, level: computeLevel(xpTotal).level }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    notification: { create: vi.fn().mockResolvedValue({}) },
    season: { findFirst: vi.fn().mockResolvedValue(season) },
    leagueMembership: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn().mockResolvedValue(null),
      groupBy: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
    },
    xpLedger: { create: vi.fn().mockResolvedValue({}) },
  };
}

// SAFETY: the fake implements exactly the subset of Prisma.TransactionClient
// that creditXp and recordSeasonXp touch.
function asTx(tx: ReturnType<typeof mockTx>): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}

describe("creditXp", () => {
  it("adds XP and recomputes the level", async () => {
    const tx = mockTx(90);
    const r = await creditXp(asTx(tx), "u1", 20, "LESSON");
    expect(r.newXpTotal).toBe(110);
    expect(r.newLevel).toBe(computeLevel(110).level);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { xpTotal: { increment: 20 }, level: computeLevel(110).level },
    });
    expect(tx.xpLedger.create).toHaveBeenCalledWith({
      data: { userId: "u1", amount: 20, source: "LESSON" },
    });
  });

  it("notifies on level-up", async () => {
    const tx = mockTx(90); // L1 → +20 = 110 → L2
    const r = await creditXp(asTx(tx), "u1", 20, "LESSON");
    expect(r.leveledUp).toBe(true);
    expect(tx.notification.create).toHaveBeenCalledOnce();
  });

  it("respects notifyLevelUp: false", async () => {
    const tx = mockTx(90);
    await creditXp(asTx(tx), "u1", 20, "LESSON", { notifyLevelUp: false });
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it("does not notify when the level is unchanged", async () => {
    const tx = mockTx(110); // L2 → +10 = 120, still L2
    const r = await creditXp(asTx(tx), "u1", 10, "LESSON");
    expect(r.leveledUp).toBe(false);
    expect(tx.notification.create).not.toHaveBeenCalled();
  });
});

describe("creditXp with XP taken back", () => {
  it("lowers the total and the level, through a guarded increment", async () => {
    const tx = mockTx(320); // L3
    const r = await creditXp(asTx(tx), "u1", -50, "ADJUSTMENT");

    expect(r).toEqual({
      xpGained: -50,
      newXpTotal: 270,
      previousLevel: computeLevel(320).level,
      newLevel: computeLevel(270).level,
      leveledUp: false,
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", xpTotal: { gte: 50 } },
      data: { xpTotal: { increment: -50 }, level: computeLevel(270).level },
    });
    expect(tx.xpLedger.create).toHaveBeenCalledWith({
      data: { userId: "u1", amount: -50, source: "ADJUSTMENT" },
    });
  });

  it("stops at zero, and records only what actually came off", async () => {
    const tx = mockTx(30);
    const r = await creditXp(asTx(tx), "u1", -200, "ADJUSTMENT");

    expect(r.xpGained).toBe(-30);
    expect(r.newXpTotal).toBe(0);
    expect(r.newLevel).toBe(1);
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", xpTotal: { gte: 30 } },
      data: { xpTotal: { increment: -30 }, level: 1 },
    });
    expect(tx.xpLedger.create).toHaveBeenCalledWith({
      data: { userId: "u1", amount: -30, source: "ADJUSTMENT" },
    });
  });

  it("never notifies a lower level, even with level-up notices on", async () => {
    const tx = mockTx(320);
    await creditXp(asTx(tx), "u1", -300, "ADJUSTMENT", { notifyLevelUp: true });
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it("writes nothing when there is nothing left to take", async () => {
    const tx = mockTx(0);
    const r = await creditXp(asTx(tx), "u1", -10, "ADJUSTMENT");

    expect(r).toEqual({
      xpGained: 0,
      newXpTotal: 0,
      previousLevel: 1,
      newLevel: 1,
      leveledUp: false,
    });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.xpLedger.create).not.toHaveBeenCalled();
    expect(tx.season.findFirst).not.toHaveBeenCalled();
  });

  it("rolls back rather than overdraw when the total moved in between", async () => {
    const tx = mockTx(100);
    // Another correction committed first: the guard no longer matches.
    tx.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(creditXp(asTx(tx), "u1", -80, "ADJUSTMENT")).rejects.toThrow(
      "the XP total changed",
    );
    expect(tx.xpLedger.create).not.toHaveBeenCalled();
  });

  it("takes the season's share back with it", async () => {
    const tx = mockTx(500, SEASON);
    await creditXp(asTx(tx), "u1", -120, "ADJUSTMENT");
    expect(tx.leagueMembership.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", seasonId: SEASON.id, seasonXp: { gte: 120 } },
      data: { seasonXp: { decrement: 120 } },
    });
  });
});

describe("recordSeasonXp", () => {
  it("does nothing before a season is seeded", async () => {
    const tx = mockTx(0, null);
    await recordSeasonXp(asTx(tx), "u1", 40);
    expect(tx.leagueMembership.updateMany).not.toHaveBeenCalled();
  });

  it("does nothing for a zero amount, without even reading the season", async () => {
    const tx = mockTx(0, SEASON);
    await recordSeasonXp(asTx(tx), "u1", 0);
    expect(tx.season.findFirst).not.toHaveBeenCalled();
  });

  it("increments a member's season figure", async () => {
    const tx = mockTx(0, SEASON);
    await recordSeasonXp(asTx(tx), "u1", 40);
    expect(tx.leagueMembership.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", seasonId: SEASON.id },
      data: { seasonXp: { increment: 40 } },
    });
    expect(tx.leagueMembership.upsert).not.toHaveBeenCalled();
  });

  it("enrols on the first XP of the season, carrying the division over", async () => {
    const tx = mockTx(0, SEASON);
    tx.leagueMembership.updateMany.mockResolvedValue({ count: 0 });
    tx.leagueMembership.findFirst.mockResolvedValue({ division: "OR" });
    tx.leagueMembership.groupBy.mockResolvedValue([]);

    await recordSeasonXp(asTx(tx), "u1", 40);

    expect(tx.leagueMembership.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ division: "OR", seasonXp: 40 }) as unknown,
      }),
    );
  });

  it("lowers the figure without taking it below zero", async () => {
    const tx = mockTx(0, SEASON);
    // Less than what is taken back: the decrement's guard does not match.
    tx.leagueMembership.updateMany.mockResolvedValueOnce({ count: 0 });

    await recordSeasonXp(asTx(tx), "u1", -90);

    expect(tx.leagueMembership.updateMany).toHaveBeenNthCalledWith(1, {
      where: { userId: "u1", seasonId: SEASON.id, seasonXp: { gte: 90 } },
      data: { seasonXp: { decrement: 90 } },
    });
    expect(tx.leagueMembership.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: "u1", seasonId: SEASON.id, seasonXp: { lt: 90 } },
      data: { seasonXp: 0 },
    });
  });

  it("never enrols anybody for XP taken back", async () => {
    const tx = mockTx(0, SEASON);
    tx.leagueMembership.updateMany.mockResolvedValue({ count: 0 });

    await recordSeasonXp(asTx(tx), "u1", -90);

    expect(tx.leagueMembership.upsert).not.toHaveBeenCalled();
    expect(tx.leagueMembership.findFirst).not.toHaveBeenCalled();
  });
});
