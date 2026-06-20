import { describe, expect, it } from "vitest";
import { divisionDown, divisionUp, pickPod, podOutcome } from "../league";

describe("pickPod", () => {
  it("fills the lowest pod that still has room", () => {
    expect(
      pickPod([
        { pod: 1, count: 15 },
        { pod: 2, count: 10 },
      ]),
    ).toBe(2);
  });

  it("opens a fresh pod when all are full", () => {
    expect(
      pickPod([
        { pod: 1, count: 15 },
        { pod: 2, count: 15 },
      ]),
    ).toBe(3);
  });

  it("starts at pod 1 when there are none", () => {
    expect(pickPod([])).toBe(1);
  });

  it("respects a custom pod size", () => {
    expect(pickPod([{ pod: 1, count: 3 }], 3)).toBe(2);
  });
});

describe("division movement", () => {
  it("moves up the ladder, null at the top", () => {
    expect(divisionUp("BRONZE")).toBe("ARGENT");
    expect(divisionUp("PLATINE")).toBe("DIAMANT");
    expect(divisionUp("DIAMANT")).toBeNull();
  });

  it("moves down the ladder, null at the bottom", () => {
    expect(divisionDown("DIAMANT")).toBe("PLATINE");
    expect(divisionDown("ARGENT")).toBe("BRONZE");
    expect(divisionDown("BRONZE")).toBeNull();
  });
});

describe("podOutcome", () => {
  it("promotes 4 / relegates 3 in a full pod", () => {
    expect(podOutcome(15)).toEqual({ promote: 4, relegate: 3 });
    expect(podOutcome(12)).toEqual({ promote: 4, relegate: 3 });
  });

  it("shrinks the relegation zone first, never overlapping promotion", () => {
    expect(podOutcome(6)).toEqual({ promote: 4, relegate: 2 });
    expect(podOutcome(5)).toEqual({ promote: 4, relegate: 1 });
    expect(podOutcome(4)).toEqual({ promote: 4, relegate: 0 });
  });

  it("promotes everyone when the pod is below the promotion count", () => {
    expect(podOutcome(3)).toEqual({ promote: 3, relegate: 0 });
    expect(podOutcome(1)).toEqual({ promote: 1, relegate: 0 });
    expect(podOutcome(0)).toEqual({ promote: 0, relegate: 0 });
  });
});
