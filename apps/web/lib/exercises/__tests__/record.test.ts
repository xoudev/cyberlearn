import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findIdBySlug: vi.fn<(slug: string, viewerId: string) => Promise<string | null>>(),
  recordCompletion:
    vi.fn<
      (u: string, l: string, e: string, k: "TERMINAL" | "PYTHON") => Promise<{ created: boolean }>
    >(),
  transaction: vi.fn<(fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(),
  creditXp: vi.fn<(tx: unknown, u: string, amount: number, source: string) => Promise<unknown>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  lessonRepository: { findIdBySlug: m.findIdBySlug },
  exerciseRepository: { recordCompletion: m.recordCompletion },
  prisma: { $transaction: m.transaction },
}));
vi.mock("@/lib/xp/credit", () => ({ creditXp: m.creditXp }));

const { EXERCISE_XP, recordExerciseForUser } = await import("../record");

const LESSON = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.transaction.mockImplementation((fn) => fn({ tag: "tx" }));
  m.creditXp.mockResolvedValue({ xpGained: EXERCISE_XP });
});

describe("recordExerciseForUser", () => {
  it("records nothing for a lesson this reader may not open", async () => {
    m.findIdBySlug.mockResolvedValue(null);
    expect(await recordExerciseForUser("u1", "secret", "ex-1", "PYTHON")).toEqual({
      ok: false,
      created: false,
      xpGained: 0,
    });
    expect(m.recordCompletion).not.toHaveBeenCalled();
    expect(m.findIdBySlug).toHaveBeenCalledWith("secret", "u1");
  });

  it("pays a little XP the first time, inside a transaction", async () => {
    m.findIdBySlug.mockResolvedValue(LESSON);
    m.recordCompletion.mockResolvedValue({ created: true });
    expect(await recordExerciseForUser("u1", "linux-grep", "Trier les logs", "TERMINAL")).toEqual({
      ok: true,
      created: true,
      xpGained: EXERCISE_XP,
    });
    expect(m.recordCompletion).toHaveBeenCalledWith("u1", LESSON, "Trier les logs", "TERMINAL");
    expect(m.creditXp).toHaveBeenCalledWith({ tag: "tx" }, "u1", EXERCISE_XP, "EXERCISE");
  });

  it("pays nothing the second time", async () => {
    m.findIdBySlug.mockResolvedValue(LESSON);
    m.recordCompletion.mockResolvedValue({ created: false });
    expect(await recordExerciseForUser("u1", "linux-grep", "ex-1", "PYTHON")).toEqual({
      ok: true,
      created: false,
      xpGained: 0,
    });
    expect(m.creditXp).not.toHaveBeenCalled();
  });
});
