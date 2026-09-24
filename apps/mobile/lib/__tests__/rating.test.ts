import { describe, expect, it } from "vitest";
import { averageLine, ratingLabel } from "../rating";

describe("averageLine", () => {
  it("writes the average the French way, with the number of reviews", () => {
    expect(averageLine(4.25, 12)).toBe("4,3 · 12 avis");
  });

  it("says nothing while nobody has rated", () => {
    expect(averageLine(null, 0)).toBeNull();
    expect(averageLine(4, 0)).toBeNull();
  });
});

describe("ratingLabel", () => {
  it("names each score as the site does", () => {
    expect(ratingLabel(1)).toBe("Difficile à suivre");
    expect(ratingLabel(5)).toBe("Excellent");
    expect(ratingLabel(0)).toBe("");
  });
});
