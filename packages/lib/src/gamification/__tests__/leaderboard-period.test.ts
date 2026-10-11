import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_PERIODS,
  isLeaderboardPeriod,
  leaderboardPeriodSince,
  leaderboardPeriodStart,
} from "../leaderboard-period.js";

/**
 * The windows the period boards read the ledger from. Every expectation is a
 * UTC instant: Paris is UTC+2 in summer time (until the last Sunday of
 * October, 2026-10-25) and UTC+1 in winter time.
 */

const iso = (date: Date | null): string | null => (date === null ? null : date.toISOString());

describe("leaderboardPeriodStart: the week", () => {
  it("opens on Monday at midnight, Paris time", () => {
    // Wednesday 14 October 2026, summer time: Monday 12 at 00:00 Paris.
    expect(iso(leaderboardPeriodStart("week", new Date("2026-10-14T10:00:00Z")))).toBe(
      "2026-10-11T22:00:00.000Z",
    );
  });

  it("keeps Sunday late in the evening in the week it ends", () => {
    // Sunday 18 October, 23:30 Paris = 21:30 UTC: still the week of the 12th.
    expect(iso(leaderboardPeriodStart("week", new Date("2026-10-18T21:30:00Z")))).toBe(
      "2026-10-11T22:00:00.000Z",
    );
  });

  it("turns at Paris midnight, not at UTC midnight", () => {
    // 22:30 UTC on Sunday 18 is 00:30 Paris on Monday 19: a new week.
    expect(iso(leaderboardPeriodStart("week", new Date("2026-10-18T22:30:00Z")))).toBe(
      "2026-10-18T22:00:00.000Z",
    );
  });

  it("is Monday itself on a Monday", () => {
    expect(iso(leaderboardPeriodStart("week", new Date("2026-10-12T08:00:00Z")))).toBe(
      "2026-10-11T22:00:00.000Z",
    );
  });

  it("reads the offset of the Monday, not the offset of today", () => {
    // Wednesday 28 October is winter time, its Monday the 26th too: UTC+1.
    expect(iso(leaderboardPeriodStart("week", new Date("2026-10-28T10:00:00Z")))).toBe(
      "2026-10-25T23:00:00.000Z",
    );
    // Monday 30 March 2026 opens in summer time, the day after the change.
    expect(iso(leaderboardPeriodStart("week", new Date("2026-04-01T10:00:00Z")))).toBe(
      "2026-03-29T22:00:00.000Z",
    );
  });

  it("crosses a year", () => {
    // Friday 1 January 2027: its week opened on Monday 28 December 2026.
    expect(iso(leaderboardPeriodStart("week", new Date("2027-01-01T12:00:00Z")))).toBe(
      "2026-12-27T23:00:00.000Z",
    );
  });
});

describe("leaderboardPeriodStart: the month", () => {
  it("opens on the 1st at midnight, Paris time", () => {
    expect(iso(leaderboardPeriodStart("month", new Date("2026-10-14T10:00:00Z")))).toBe(
      "2026-09-30T22:00:00.000Z",
    );
  });

  it("turns at Paris midnight on the 1st", () => {
    // 22:30 UTC on 31 October is 23:30 Paris (winter time): still October.
    expect(iso(leaderboardPeriodStart("month", new Date("2026-10-31T22:30:00Z")))).toBe(
      "2026-09-30T22:00:00.000Z",
    );
    // 23:30 UTC is 00:30 Paris on 1 November: November has begun.
    expect(iso(leaderboardPeriodStart("month", new Date("2026-10-31T23:30:00Z")))).toBe(
      "2026-10-31T23:00:00.000Z",
    );
  });

  it("opens a summer month at UTC+2 and a winter one at UTC+1", () => {
    expect(iso(leaderboardPeriodStart("month", new Date("2026-07-20T12:00:00Z")))).toBe(
      "2026-06-30T22:00:00.000Z",
    );
    expect(iso(leaderboardPeriodStart("month", new Date("2026-02-20T12:00:00Z")))).toBe(
      "2026-01-31T23:00:00.000Z",
    );
  });
});

describe("leaderboardPeriodStart: all time", () => {
  it("has no start", () => {
    expect(leaderboardPeriodStart("all", new Date("2026-10-14T10:00:00Z"))).toBeNull();
  });
});

describe("leaderboardPeriodSince", () => {
  it("names the Monday of a week, in Paris", () => {
    // 22:00 UTC on Sunday 11 is Monday 12 at midnight in Paris.
    expect(leaderboardPeriodSince("week", new Date("2026-10-11T22:00:00Z"))).toBe(
      "depuis lundi 12 octobre",
    );
  });

  it("names the month from its 1st", () => {
    expect(leaderboardPeriodSince("month", new Date("2026-09-30T22:00:00Z"))).toBe(
      "depuis le 1er octobre",
    );
  });

  it("says nothing for all time", () => {
    expect(leaderboardPeriodSince("all", new Date("2026-10-11T22:00:00Z"))).toBeNull();
  });
});

describe("isLeaderboardPeriod", () => {
  it("accepts the three periods and nothing else", () => {
    for (const period of LEADERBOARD_PERIODS) expect(isLeaderboardPeriod(period)).toBe(true);
    expect(isLeaderboardPeriod("year")).toBe(false);
    expect(isLeaderboardPeriod("WEEK")).toBe(false);
    expect(isLeaderboardPeriod(undefined)).toBe(false);
  });
});
