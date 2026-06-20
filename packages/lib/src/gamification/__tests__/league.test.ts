import { describe, expect, it } from "vitest";
import { divisionDown, divisionUp, pickPod } from "../league";

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
