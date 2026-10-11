import { describe, expect, it } from "vitest";
import { averageLine, formatAverage, ratingLabel } from "../rating.js";

describe("averageLine", () => {
  it("writes the average the French way, with the number of reviews", () => {
    expect(averageLine(4.25, 12)).toBe("4,3 · 12 avis");
    expect(averageLine(5, 1)).toBe("5,0 · 1 avis");
  });

  it("groups a large count with a narrow no-break space", () => {
    expect(averageLine(3.9, 1250)).toBe("3,9 · 1 250 avis");
  });

  it("says nothing while nobody has rated", () => {
    expect(averageLine(null, 0)).toBeNull();
    expect(averageLine(null, 3)).toBeNull();
    expect(averageLine(4, 0)).toBeNull();
  });
});

describe("formatAverage", () => {
  it("keeps one decimal and a comma", () => {
    expect(formatAverage(4)).toBe("4,0");
    expect(formatAverage(4.44)).toBe("4,4");
    expect(formatAverage(3.96)).toBe("4,0");
  });
});

describe("ratingLabel", () => {
  it("names each score from 1 to 5", () => {
    expect([1, 2, 3, 4, 5].map(ratingLabel)).toEqual([
      "Difficile à suivre",
      "Peut mieux faire",
      "Correct",
      "Bien",
      "Excellent",
    ]);
  });

  it("names nothing outside the scale", () => {
    expect(ratingLabel(0)).toBe("");
    expect(ratingLabel(6)).toBe("");
  });
});
