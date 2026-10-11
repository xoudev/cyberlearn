import { describe, expect, it } from "vitest";
import { PERIOD_CHIPS, emptyBoardLabel, leaderboardPath, topListEyebrow } from "../leaderboard";

describe("the leaderboard's periods in the app", () => {
  it("offers the site's three periods, in its order and words", () => {
    expect(PERIOD_CHIPS).toEqual([
      { id: "all", label: "Depuis toujours" },
      { id: "month", label: "Ce mois" },
      { id: "week", label: "Cette semaine" },
    ]);
  });

  it("asks all time the way every older build did, without a parameter", () => {
    expect(leaderboardPath("all")).toBe("/api/mobile/leaderboard");
    expect(leaderboardPath("week")).toBe("/api/mobile/leaderboard?period=week");
    expect(leaderboardPath("month")).toBe("/api/mobile/leaderboard?period=month");
  });

  it("words the top list and its empty state by period", () => {
    expect(topListEyebrow("all")).toBe("Général");
    expect(topListEyebrow("week")).toBe("Cette semaine");
    expect(emptyBoardLabel("all")).toMatch(/pour le moment/);
    expect(emptyBoardLabel("month")).toMatch(/sur cette période/);
  });
});
