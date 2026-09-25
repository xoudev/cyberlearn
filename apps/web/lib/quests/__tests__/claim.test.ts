import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  txFindUnique: vi.fn<(args: unknown) => Promise<{ claimed: boolean } | null>>(),
  txUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  userFind: vi.fn<(args: unknown) => Promise<{ streakFreezes: number }>>(),
  userUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  creditXp:
    vi.fn<
      (
        tx: unknown,
        userId: string,
        amount: number,
        source: string,
        options: unknown,
      ) => Promise<{ xpGained: number; leveledUp: boolean; newLevel: number }>
    >(),
}));

const tx = {
  userQuestProgress: { findUnique: m.txFindUnique, update: m.txUpdate },
  user: { findUniqueOrThrow: m.userFind, update: m.userUpdate },
};

vi.mock("@cyberlearn/db", () => ({
  prisma: {
    userQuestProgress: { findUnique: m.findUnique },
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  },
}));
vi.mock("@/lib/xp/credit", () => ({ creditXp: m.creditXp }));

const { QUEST_ERROR, claimQuestFor } = await import("../claim");

const QUEST = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-09-23T10:00:00Z");

function row(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "progress-1",
    completed: true,
    claimed: false,
    quest: { xpReward: 50, freezeReward: 0, code: "LESSONS_3" },
    ...over,
  };
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.findUnique.mockResolvedValue(row());
  m.txFindUnique.mockResolvedValue({ claimed: false });
  m.txUpdate.mockResolvedValue({});
  m.userFind.mockResolvedValue({ streakFreezes: 1 });
  m.userUpdate.mockResolvedValue({});
  m.creditXp.mockResolvedValue({ xpGained: 50, leveledUp: false, newLevel: 4 });
});

describe("claimQuestFor", () => {
  it("credits the quest's XP to the caller and marks it claimed, for this week", async () => {
    const result = await claimQuestFor("user-1", QUEST, NOW);
    expect(result).toEqual({ ok: true, xpGained: 50, leveledUp: false, newLevel: 4 });
    expect(m.findUnique.mock.calls[0]?.[0]).toMatchObject({
      where: { userId_questId_weekKey: { userId: "user-1", questId: QUEST, weekKey: "2026-W39" } },
    });
    expect(m.txUpdate).toHaveBeenCalledWith({
      where: { id: "progress-1" },
      data: { claimed: true, claimedAt: NOW },
    });
    expect(m.creditXp).toHaveBeenCalledWith(tx, "user-1", 50, "QUEST", {
      notifyXp: 50,
      metadata: { questCode: "LESSONS_3" },
    });
    expect(m.userUpdate).not.toHaveBeenCalled();
  });

  it("adds the streak-freeze a quest carries, within the reserve's cap", async () => {
    m.findUnique.mockResolvedValue(
      row({ quest: { xpReward: 100, freezeReward: 1, code: "BONUS" } }),
    );
    await claimQuestFor("user-1", QUEST, NOW);
    expect(m.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { streakFreezes: 2 },
    });

    m.userFind.mockResolvedValue({ streakFreezes: 99 });
    await claimQuestFor("user-1", QUEST, NOW);
    const capped = m.userUpdate.mock.calls[1]?.[0] as { data: { streakFreezes: number } };
    expect(capped.data.streakFreezes).toBeLessThan(99);
  });

  it("says when the claim carried the reader over a level", async () => {
    m.creditXp.mockResolvedValue({ xpGained: 50, leveledUp: true, newLevel: 5 });
    expect(await claimQuestFor("user-1", QUEST, NOW)).toMatchObject({
      leveledUp: true,
      newLevel: 5,
    });
  });

  it("refuses an id that is not one, a quest not done and one already claimed", async () => {
    expect(await claimQuestFor("user-1", "nope", NOW)).toEqual({
      ok: false,
      error: QUEST_ERROR.invalid,
    });
    expect(m.findUnique).not.toHaveBeenCalled();

    m.findUnique.mockResolvedValue(row({ completed: false }));
    expect(await claimQuestFor("user-1", QUEST, NOW)).toEqual({
      ok: false,
      error: QUEST_ERROR.notCompleted,
    });

    m.findUnique.mockResolvedValue(null);
    expect((await claimQuestFor("user-1", QUEST, NOW)).error).toBe(QUEST_ERROR.notCompleted);

    m.findUnique.mockResolvedValue(row({ claimed: true }));
    expect((await claimQuestFor("user-1", QUEST, NOW)).error).toBe(QUEST_ERROR.alreadyClaimed);
    expect(m.creditXp).not.toHaveBeenCalled();
  });

  it("credits once when two claims race", async () => {
    m.txFindUnique.mockResolvedValue({ claimed: true });
    expect(await claimQuestFor("user-1", QUEST, NOW)).toEqual({
      ok: false,
      error: QUEST_ERROR.alreadyClaimed,
    });
    expect(m.creditXp).not.toHaveBeenCalled();
    expect(m.txUpdate).not.toHaveBeenCalled();
  });
});
