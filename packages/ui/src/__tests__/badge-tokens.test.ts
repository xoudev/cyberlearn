import { describe, expect, it } from "vitest";
import {
  BADGE_RARITY_GRADIENT,
  BADGE_RARITY_LABELS,
  BADGE_RARITY_ORDER,
  BADGE_RARITY_VAR,
  rarestOf,
  toBadgeRarity,
} from "../components/badge-tokens.js";

describe("the badge rarity tokens", () => {
  it("know the four rarities, rarest first, each with its variable, label and ring", () => {
    expect(BADGE_RARITY_ORDER).toEqual(["LEGENDARY", "EPIC", "RARE", "COMMON"]);
    for (const rarity of BADGE_RARITY_ORDER) {
      expect(BADGE_RARITY_VAR[rarity]).toMatch(/^var\(--color-rarity-/);
      expect(BADGE_RARITY_LABELS[rarity]).not.toBe("");
      expect(BADGE_RARITY_GRADIENT[rarity]).toMatch(/^linear-gradient/);
    }
  });

  it("narrow a stored value to a rarity, common when unknown", () => {
    expect(toBadgeRarity("EPIC")).toBe("EPIC");
    expect(toBadgeRarity("MYTHIC")).toBe("COMMON");
  });

  it("pick the rarest of what was earned, common when nothing was", () => {
    expect(rarestOf(["COMMON", "RARE", "EPIC"])).toBe("EPIC");
    expect(rarestOf(["RARE", "LEGENDARY"])).toBe("LEGENDARY");
    expect(rarestOf([])).toBe("COMMON");
  });
});
