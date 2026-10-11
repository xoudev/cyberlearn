import { describe, expect, it } from "vitest";
import {
  PERIOD_CHIPS,
  answeredPeriod,
  emptyBoardLabel,
  hasPodium,
  leaderboardPath,
  topListEyebrow,
  topListRows,
} from "../leaderboard";

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

  it("reads the period an answer is for, all time from a server without periods", () => {
    expect(answeredPeriod("week")).toBe("week");
    expect(answeredPeriod("month")).toBe("month");
    expect(answeredPeriod("all")).toBe("all");
    expect(answeredPeriod(undefined)).toBe("all");
    expect(answeredPeriod("year")).toBe("all");
  });
});

describe("the podium and the top list", () => {
  const board = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

  it("shows every player somewhere, however few the period has", () => {
    // [podium, list]: nobody left out, nobody shown twice.
    const split = (n: number): [boolean, number[]] => [hasPodium(board(n)), topListRows(board(n))];
    expect(split(0)).toEqual([false, []]);
    expect(split(1)).toEqual([false, [1]]);
    expect(split(2)).toEqual([false, [1, 2]]);
    expect(split(3)).toEqual([true, []]);
    expect(split(4)).toEqual([true, [4]]);
  });

  it("stops the list at the 25th row, under the podium as without it", () => {
    expect(topListRows(board(50))).toEqual(board(25).slice(3));
    expect(topListRows(board(2))).toHaveLength(2);
  });
});
