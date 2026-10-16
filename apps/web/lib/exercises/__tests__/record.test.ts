import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findBySlug:
    vi.fn<(slug: string, viewerId: string) => Promise<{ id: string; contentMdx: string } | null>>(),
  recordCompletion:
    vi.fn<
      (u: string, l: string, e: string, k: "TERMINAL" | "PYTHON") => Promise<{ created: boolean }>
    >(),
  transaction: vi.fn<(fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>>(),
  creditXp: vi.fn<(tx: unknown, u: string, amount: number, source: string) => Promise<unknown>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  lessonRepository: { findBySlug: m.findBySlug },
  exerciseRepository: { recordCompletion: m.recordCompletion },
  prisma: { $transaction: m.transaction },
}));
vi.mock("@/lib/xp/credit", () => ({ creditXp: m.creditXp }));

const { EXERCISE_XP, recordExerciseForUser } = await import("../record");

const LESSON = "11111111-1111-4111-8111-111111111111";

/** A lesson with one terminal, keyed by its title, and one Python challenge. */
const CONTENT = [
  "## Les logs",
  "",
  '<LinuxTerminal title="Trier les logs" expectedCommands={["sort app.log"]} />',
  "",
  '<PythonChallenge id="ex-1" tests={[{ input: "solution(1)", expected: "1" }]} />',
].join("\n");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.findBySlug.mockResolvedValue({ id: LESSON, contentMdx: CONTENT });
  m.transaction.mockImplementation((fn) => fn({ tag: "tx" }));
  m.creditXp.mockResolvedValue({ xpGained: EXERCISE_XP });
});

describe("recordExerciseForUser", () => {
  it("records nothing for a lesson this reader may not open", async () => {
    m.findBySlug.mockResolvedValue(null);
    expect(await recordExerciseForUser("u1", "secret", "ex-1", "PYTHON")).toEqual({
      ok: false,
      created: false,
      xpGained: 0,
    });
    expect(m.recordCompletion).not.toHaveBeenCalled();
    expect(m.findBySlug).toHaveBeenCalledWith("secret", "u1");
  });

  it("pays a little XP the first time, inside a transaction", async () => {
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
    m.recordCompletion.mockResolvedValue({ created: false });
    expect(await recordExerciseForUser("u1", "linux-grep", "ex-1", "PYTHON")).toEqual({
      ok: true,
      created: false,
      xpGained: 0,
    });
    expect(m.creditXp).not.toHaveBeenCalled();
  });

  it("records and pays nothing for an exercise the lesson does not have", async () => {
    // Replayed with made-up identifiers, the action used to pay for each one.
    for (const id of ["a1", "a2", "a3"]) {
      expect(await recordExerciseForUser("u1", "linux-grep", id, "PYTHON")).toEqual({
        ok: false,
        created: false,
        xpGained: 0,
      });
    }
    expect(m.recordCompletion).not.toHaveBeenCalled();
    expect(m.creditXp).not.toHaveBeenCalled();
  });

  it("does not take a challenge's key for a terminal's", async () => {
    expect((await recordExerciseForUser("u1", "linux-grep", "ex-1", "TERMINAL")).ok).toBe(false);
    expect(m.recordCompletion).not.toHaveBeenCalled();
  });
});
