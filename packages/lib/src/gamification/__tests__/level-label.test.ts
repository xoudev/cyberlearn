import { describe, expect, it } from "vitest";
import { levelLabel } from "../level-label.js";

describe("levelLabel", () => {
  it("writes a level the French way, with its abbreviation", () => {
    expect(levelLabel(7)).toBe("Niv. 7");
    expect(levelLabel(42)).toBe("Niv. 42");
  });
});
