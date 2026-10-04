import { describe, expect, it } from "vitest";
import { isComplete, keepRight, remaining, shownOrder, verdicts } from "./arrange";

describe("shownOrder", () => {
  it("is a permutation with no item at its own place, the same for a seed", () => {
    for (let count = 2; count <= 10; count++) {
      for (const seed of ["ordre-osi", "ports-services", "x", "y"]) {
        const order = shownOrder(count, seed);
        expect([...order].sort((a, b) => a - b)).toEqual(
          Array.from({ length: count }, (_, i) => i),
        );
        expect(order.some((index, position) => index === position)).toBe(false);
        expect(shownOrder(count, seed)).toEqual(order);
      }
    }
  });

  it("differs from one seed to another, and leaves a single item alone", () => {
    expect(shownOrder(7, "ordre-osi")).not.toEqual(shownOrder(7, "ordre-tcp"));
    expect(shownOrder(1, "seul")).toEqual([0]);
    expect(shownOrder(0, "rien")).toEqual([]);
  });
});

describe("reading the slots", () => {
  it("says when every slot is filled", () => {
    expect(isComplete([2, 0, 1])).toBe(true);
    expect(isComplete([2, null, 1])).toBe(false);
  });

  it("judges each slot by the index that belongs there", () => {
    expect(verdicts([0, 2, 1, 3])).toEqual([true, false, false, true]);
    expect(verdicts([null, 1])).toEqual([false, true]);
  });

  it("keeps the right slots and empties the wrong ones", () => {
    expect(keepRight([0, 2, 1, 3])).toEqual([0, null, null, 3]);
  });

  it("lists what is left to place, in the shown order", () => {
    expect(remaining([2, 0, 3, 1], [0, null, null, 3])).toEqual([2, 1]);
    expect(remaining([2, 0, 1], [0, 1, 2])).toEqual([]);
  });
});
