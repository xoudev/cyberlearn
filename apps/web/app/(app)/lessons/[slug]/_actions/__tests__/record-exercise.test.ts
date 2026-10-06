import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn<() => Promise<{ id: string }>>(),
  recordExerciseForUser:
    vi.fn<
      (
        u: string,
        slug: string,
        e: string,
        k: string,
      ) => Promise<{ ok: boolean; created: boolean; xpGained: number }>
    >(),
}));

vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@/lib/exercises/record", () => ({ recordExerciseForUser: m.recordExerciseForUser }));

const { recordExerciseAction } = await import("../record-exercise");

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.requireRequestUser.mockResolvedValue({ id: "u1" });
  m.recordExerciseForUser.mockResolvedValue({ ok: true, created: true, xpGained: 10 });
});

describe("recordExerciseAction", () => {
  it("reads the input before the session, and records nothing it cannot read", async () => {
    for (const raw of [
      null,
      {},
      { slug: "x", exerciseId: "", kind: "PYTHON" },
      { slug: "x", exerciseId: "e", kind: "SQL" },
      { slug: "x".repeat(121), exerciseId: "e", kind: "PYTHON" },
    ]) {
      expect(await recordExerciseAction(raw)).toEqual({ ok: false, created: false, xpGained: 0 });
    }
    expect(m.requireRequestUser).not.toHaveBeenCalled();
    expect(m.recordExerciseForUser).not.toHaveBeenCalled();
  });

  it("records the exercise for the signed-in reader", async () => {
    const result = await recordExerciseAction({
      slug: " linux-grep ",
      exerciseId: "grep-logs",
      kind: "TERMINAL",
    });
    expect(result).toEqual({ ok: true, created: true, xpGained: 10 });
    expect(m.recordExerciseForUser).toHaveBeenCalledWith(
      "u1",
      "linux-grep",
      "grep-logs",
      "TERMINAL",
    );
  });
});
