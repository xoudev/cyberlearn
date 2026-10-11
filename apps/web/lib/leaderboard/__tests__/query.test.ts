import { describe, expect, it } from "vitest";
import { leaderboardHref, parseLeaderboardQuery } from "../query";

describe("parseLeaderboardQuery", () => {
  it("reads a period and a tab", () => {
    expect(parseLeaderboardQuery({ period: "week", board: "friends" })).toEqual({
      period: "week",
      board: "friends",
    });
  });

  it("opens the all-time global board on a bare address", () => {
    expect(parseLeaderboardQuery({})).toEqual({ period: "all", board: "global" });
  });

  it("falls back field by field on a value it does not know", () => {
    expect(parseLeaderboardQuery({ period: "year", board: "league" })).toEqual({
      period: "all",
      board: "league",
    });
    expect(parseLeaderboardQuery({ period: "month", board: "admins" })).toEqual({
      period: "month",
      board: "global",
    });
  });

  it("takes the first of a repeated parameter", () => {
    expect(parseLeaderboardQuery({ period: ["month", "week"] }).period).toBe("month");
  });
});

describe("leaderboardHref", () => {
  it("leaves the defaults out of the address", () => {
    expect(leaderboardHref("global", "all")).toBe("/leaderboard");
    expect(leaderboardHref("global", "week")).toBe("/leaderboard?period=week");
    expect(leaderboardHref("friends", "all")).toBe("/leaderboard?board=friends");
    expect(leaderboardHref("friends", "month")).toBe("/leaderboard?board=friends&period=month");
  });

  it("round-trips through the parser", () => {
    const href = leaderboardHref("league", "week");
    const params = Object.fromEntries(new URL(href, "https://cyberlearn.fr").searchParams);
    expect(parseLeaderboardQuery(params)).toEqual({ period: "week", board: "league" });
  });
});
