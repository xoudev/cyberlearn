import { describe, expect, it } from "vitest";
import { attemptsLeft, takesFlag } from "../challenges";

describe("takesFlag", () => {
  it("takes a flag for a CTF and a script, a click for a puzzle or a lab", () => {
    const types = ["CTF", "SCRIPT", "PUZZLE", "LAB"] as const;
    expect(types.map((t) => takesFlag(t))).toEqual([true, true, false, false]);
  });
});

describe("attemptsLeft", () => {
  it("counts what is left, never below zero", () => {
    expect(attemptsLeft({ maxAttempts: 10, userAttempts: 3 })).toBe(7);
    expect(attemptsLeft({ maxAttempts: 3, userAttempts: 5 })).toBe(0);
  });
});
