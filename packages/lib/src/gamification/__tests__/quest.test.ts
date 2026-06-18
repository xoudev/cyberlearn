import { describe, expect, it } from "vitest";
import { nextQuestProgress } from "../quest.js";

describe("nextQuestProgress", () => {
  it("increments a counter and clamps to the target", () => {
    expect(nextQuestProgress(0, 3, { amount: 1 })).toBe(1);
    expect(nextQuestProgress(2, 3, { amount: 1 })).toBe(3);
    expect(nextQuestProgress(3, 3, { amount: 1 })).toBe(3); // already at target
  });

  it("defaults the counter amount to 1", () => {
    expect(nextQuestProgress(0, 1, {})).toBe(1);
  });

  it("is monotonic for setTo (streak never drops within the week)", () => {
    expect(nextQuestProgress(3, 5, { setTo: 4 })).toBe(4); // streak grew
    expect(nextQuestProgress(4, 5, { setTo: 2 })).toBe(4); // streak broke → keep best
    expect(nextQuestProgress(4, 5, { setTo: 9 })).toBe(5); // clamped to target
  });
});
