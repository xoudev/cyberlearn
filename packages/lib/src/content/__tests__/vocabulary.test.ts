import { describe, expect, it } from "vitest";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  categoryMeta,
  difficultyMeta,
  isContentCategory,
  isContentDifficulty,
} from "../vocabulary.js";

describe("content vocabulary", () => {
  it("names every category three ways, and every difficulty once", () => {
    for (const key of CATEGORY_ORDER) {
      const meta = CATEGORY_META[key];
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.short.length).toBeLessThanOrEqual(meta.label.length);
      expect(meta.slug).toBe(meta.slug.toLowerCase());
      expect(meta.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(DIFFICULTY_ORDER.map((d) => DIFFICULTY_META[d].level)).toEqual([1, 2, 3, 4]);
    expect(DIFFICULTY_META.BEGINNER.label).toBe("Débutant");
    expect(CATEGORY_META.NETWORK.label).toBe("Réseau");
  });

  it("recognises the known values and no other", () => {
    expect(isContentCategory("DEV")).toBe(true);
    expect(isContentCategory("dev")).toBe(false);
    expect(isContentDifficulty("EXPERT")).toBe(true);
    expect(isContentDifficulty("HARD")).toBe(false);
  });

  it("answers a value it does not know with the value itself, in grey", () => {
    expect(categoryMeta("CYBERSEC")).toBe(CATEGORY_META.CYBERSEC);
    expect(categoryMeta("ROBOTICS")).toEqual({
      label: "ROBOTICS",
      short: "ROBOTICS",
      slug: "robotics",
      color: "#B8B5D1",
    });
    expect(difficultyMeta("ADVANCED")).toBe(DIFFICULTY_META.ADVANCED);
    expect(difficultyMeta("HARD")).toEqual({ label: "HARD", level: 1, color: "#B8B5D1" });
  });
});
