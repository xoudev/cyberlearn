import { describe, expect, it } from "vitest";
import { computeTier } from "../tier";

describe("computeTier", () => {
  it("maps levels to the right tier at each threshold", () => {
    expect(computeTier(1).tier.code).toBe("BRONZE");
    expect(computeTier(4).tier.code).toBe("BRONZE");
    expect(computeTier(5).tier.code).toBe("ARGENT");
    expect(computeTier(9).tier.code).toBe("ARGENT");
    expect(computeTier(10).tier.code).toBe("OR");
    expect(computeTier(14).tier.code).toBe("OR");
    expect(computeTier(15).tier.code).toBe("PLATINE");
    expect(computeTier(21).tier.code).toBe("PLATINE");
    expect(computeTier(22).tier.code).toBe("DIAMANT");
    expect(computeTier(29).tier.code).toBe("DIAMANT");
    expect(computeTier(30).tier.code).toBe("ELITE");
    expect(computeTier(99).tier.code).toBe("ELITE");
  });

  it("reports the next tier and the levels remaining", () => {
    const d = computeTier(22);
    expect(d.next?.code).toBe("ELITE");
    expect(d.levelsToNext).toBe(8); // 30 - 22
  });

  it("has no next tier at the top", () => {
    const e = computeTier(30);
    expect(e.next).toBeNull();
    expect(e.levelsToNext).toBeNull();
  });

  it("clamps levels below the first threshold to Bronze", () => {
    expect(computeTier(0).tier.code).toBe("BRONZE");
    expect(computeTier(0).index).toBe(0);
  });
});
