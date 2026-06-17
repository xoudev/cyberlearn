import { describe, expect, it } from "vitest";
import {
  applyDayBoundary,
  MAX_FREEZES,
  nextMilestone,
  registerActivity,
  type StreakState,
} from "../streak-state.js";

// 08:00 UTC on Apr 28 → 10:00 Paris → Paris day "2026-04-28".
const NOW = new Date("2026-04-28T08:00:00Z");

function state(over: Partial<StreakState> = {}): StreakState {
  return { currentStreak: 0, longestStreak: 0, lastActiveDay: null, freezes: 1, ...over };
}

describe("registerActivity", () => {
  it("starts a streak on first ever activity", () => {
    const r = registerActivity(state({ lastActiveDay: null, freezes: 1 }), NOW);
    expect(r.event).toBe("first");
    expect(r.state.currentStreak).toBe(1);
    expect(r.state.longestStreak).toBe(1);
    expect(r.state.lastActiveDay).toBe("2026-04-28");
  });

  it("is a no-op when already active today", () => {
    const s = state({
      currentStreak: 7,
      longestStreak: 9,
      lastActiveDay: "2026-04-28",
      freezes: 1,
    });
    const r = registerActivity(s, NOW);
    expect(r.event).toBe("same-day");
    expect(r.state).toBe(s);
  });

  it("increments on the next consecutive day", () => {
    const s = state({
      currentStreak: 7,
      longestStreak: 7,
      lastActiveDay: "2026-04-27",
      freezes: 0,
    });
    const r = registerActivity(s, NOW);
    expect(r.event).toBe("increment");
    expect(r.state.currentStreak).toBe(8);
    expect(r.state.longestStreak).toBe(8);
  });

  it("bridges a single missed day with a freeze", () => {
    const s = state({
      currentStreak: 7,
      longestStreak: 7,
      lastActiveDay: "2026-04-26",
      freezes: 1,
    });
    const r = registerActivity(s, NOW);
    expect(r.event).toBe("bridged");
    expect(r.freezeConsumed).toBe(true);
    expect(r.state.currentStreak).toBe(8);
    expect(r.state.freezes).toBe(0);
  });

  it("resets when a day is missed and no freeze is available", () => {
    const s = state({
      currentStreak: 12,
      longestStreak: 12,
      lastActiveDay: "2026-04-26",
      freezes: 0,
    });
    const r = registerActivity(s, NOW);
    expect(r.event).toBe("reset");
    expect(r.state.currentStreak).toBe(1);
    expect(r.state.longestStreak).toBe(12);
  });

  it("resets on a 2+ day gap even with freezes (a freeze only covers one day)", () => {
    const s = state({
      currentStreak: 9,
      longestStreak: 9,
      lastActiveDay: "2026-04-25",
      freezes: 2,
    });
    const r = registerActivity(s, NOW); // gap of 3
    expect(r.event).toBe("reset");
    expect(r.state.currentStreak).toBe(1);
    expect(r.state.freezes).toBe(2);
  });

  it("earns a freeze when crossing a 7-day milestone", () => {
    const s = state({
      currentStreak: 6,
      longestStreak: 6,
      lastActiveDay: "2026-04-27",
      freezes: 0,
    });
    const r = registerActivity(s, NOW);
    expect(r.state.currentStreak).toBe(7);
    expect(r.freezeEarned).toBe(1);
    expect(r.state.freezes).toBe(1);
  });

  it("caps freezes in reserve at MAX_FREEZES", () => {
    const s = state({
      currentStreak: 13,
      longestStreak: 13,
      lastActiveDay: "2026-04-27",
      freezes: MAX_FREEZES,
    });
    const r = registerActivity(s, NOW); // crosses 14 → would earn one
    expect(r.state.currentStreak).toBe(14);
    expect(r.state.freezes).toBe(MAX_FREEZES);
  });
});

describe("applyDayBoundary", () => {
  it("is safe when the user acted yesterday", () => {
    const s = state({
      currentStreak: 5,
      longestStreak: 5,
      lastActiveDay: "2026-04-27",
      freezes: 1,
    });
    const r = applyDayBoundary(s, NOW);
    expect(r.event).toBe("safe");
    expect(r.state).toBe(s);
  });

  it("freezes the streak when exactly yesterday was missed", () => {
    const s = state({
      currentStreak: 5,
      longestStreak: 5,
      lastActiveDay: "2026-04-26",
      freezes: 1,
    });
    const r = applyDayBoundary(s, NOW);
    expect(r.event).toBe("frozen");
    expect(r.state.currentStreak).toBe(5);
    expect(r.state.freezes).toBe(0);
    expect(r.state.lastActiveDay).toBe("2026-04-27");
  });

  it("breaks the streak when yesterday was missed and no freeze is held", () => {
    const s = state({
      currentStreak: 5,
      longestStreak: 5,
      lastActiveDay: "2026-04-26",
      freezes: 0,
    });
    const r = applyDayBoundary(s, NOW);
    expect(r.event).toBe("broken");
    expect(r.state.currentStreak).toBe(0);
  });

  it("breaks the streak on a 2+ day gap even with freezes", () => {
    const s = state({
      currentStreak: 5,
      longestStreak: 5,
      lastActiveDay: "2026-04-25",
      freezes: 2,
    });
    const r = applyDayBoundary(s, NOW);
    expect(r.event).toBe("broken");
    expect(r.state.currentStreak).toBe(0);
  });

  it("is safe for a zero streak", () => {
    const s = state({
      currentStreak: 0,
      longestStreak: 9,
      lastActiveDay: "2026-01-01",
      freezes: 0,
    });
    expect(applyDayBoundary(s, NOW).event).toBe("safe");
  });
});

describe("nextMilestone", () => {
  it("returns the next target above the current streak", () => {
    expect(nextMilestone(0)).toBe(7);
    expect(nextMilestone(7)).toBe(14);
    expect(nextMilestone(20)).toBe(30);
  });
  it("returns null past the top milestone", () => {
    expect(nextMilestone(400)).toBeNull();
  });
});
