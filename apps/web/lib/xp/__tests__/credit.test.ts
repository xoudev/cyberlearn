import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@cyberlearn/db";
import { computeLevel } from "@cyberlearn/lib";
import { creditXp } from "../credit";

// Minimal transaction-client mock. Levels: L1 at 0 XP, L2 at 100, L3 at 300.
function mockTx(xpTotal: number) {
  return {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ xpTotal, level: computeLevel(xpTotal).level }),
      update: vi.fn().mockResolvedValue({}),
    },
    notification: { create: vi.fn().mockResolvedValue({}) },
    season: { findFirst: vi.fn().mockResolvedValue(null) },
    xpLedger: { create: vi.fn().mockResolvedValue({}) },
  };
}

// The helper only needs user.findUniqueOrThrow/update + notification.create.
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
