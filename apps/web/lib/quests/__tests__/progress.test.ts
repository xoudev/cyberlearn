import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { progress: number; completed: boolean } | null;

const m = vi.hoisted(() => ({
  ensureWeek: vi.fn<(week: string, previous: string) => Promise<unknown[]>>(),
  findUnique: vi.fn<(args: unknown) => Promise<Row>>(),
  upsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: m.captureException }));
vi.mock("@cyberlearn/db", () => ({
  questRepository: { ensureWeek: m.ensureWeek },
  prisma: {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ userQuestProgress: { findUnique: m.findUnique, upsert: m.upsert } }),
  },
}));

const { recordQuestProgress } = await import("../progress");

const NOW = new Date("2026-10-27T10:00:00Z");
const WEEK = [
  { id: "q-lessons", type: "LESSON_COMPLETED", target: 2 },
  { id: "q-recall", type: "DAILY_RECALL", target: 2 },
  { id: "q-bonus", type: "WEEKLY_BONUS", target: 4 },
];

/** The questIds written, in order. */
const written = (): string[] =>
  m.upsert.mock.calls.map(
    // SAFETY: the shape progress.ts passes to upsert.
    (call) => (call[0] as { create: { questId: string } }).create.questId,
  );

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.ensureWeek.mockResolvedValue(WEEK);
  m.findUnique.mockResolvedValue(null);
});

describe("recordQuestProgress", () => {
  it("asks for this week's draw, leaving out last week's quests", async () => {
    await recordQuestProgress("user-1", "LESSON_COMPLETED", NOW, { amount: 1 });
    expect(m.ensureWeek).toHaveBeenCalledWith("2026-W44", "2026-W43");
  });

  it("counts for the quest the week drew of that kind", async () => {
    await recordQuestProgress("user-1", "DAILY_RECALL", NOW, { amount: 1 });
    expect(written()).toEqual(["q-recall"]);
  });

  it("counts for nothing when the week did not draw that kind", async () => {
    await recordQuestProgress("user-1", "CHALLENGE_SOLVED", NOW, { amount: 1 });
    expect(m.upsert).not.toHaveBeenCalled();
  });

  it("moves the bonus on when a quest of the week gets done", async () => {
    m.findUnique.mockResolvedValueOnce({ progress: 1, completed: false }).mockResolvedValue(null);
    await recordQuestProgress("user-1", "LESSON_COMPLETED", NOW, { amount: 1 });
    expect(written()).toEqual(["q-lessons", "q-bonus"]);
  });

  it("never breaks the action that triggered it", async () => {
    m.ensureWeek.mockRejectedValue(new Error("db down"));
    await expect(
      recordQuestProgress("user-1", "LESSON_COMPLETED", NOW, { amount: 1 }),
    ).resolves.toBeUndefined();
    expect(m.captureException).toHaveBeenCalled();
  });
});
