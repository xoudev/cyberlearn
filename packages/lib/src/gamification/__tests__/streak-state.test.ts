import { describe, expect, it } from "vitest";
import {
  applyDayBoundary,
  correctStreak,
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

  it("starts fresh at 1 when the streak is zero, even with a stale lastActiveDay today", () => {
    // New user: lastActiveAt defaults to the signup day while streak is still 0.
    const s = state({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDay: "2026-04-28",
      freezes: 1,
    });
    const r = registerActivity(s, NOW);
    expect(r.event).toBe("first");
    expect(r.state.currentStreak).toBe(1);
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

describe("correctStreak", () => {
  it("keeps the last active day of a streak still alive, so today's activity still counts", () => {
    const s = state({ currentStreak: 3, longestStreak: 3, lastActiveDay: "2026-04-27" });
    const r = correctStreak(s, { currentStreak: 30 }, NOW);
    expect(r.movedToToday).toBe(false);
    expect(r.state).toEqual({
      currentStreak: 30,
      longestStreak: 30,
      lastActiveDay: "2026-04-27",
      freezes: 1,
    });
    // The learner acts today: the corrected streak goes on.
    expect(registerActivity(r.state, NOW).state.currentStreak).toBe(31);
  });

  it("moves a broken streak's last day to today, so tomorrow extends it", () => {
    const s = state({ currentStreak: 0, longestStreak: 12, lastActiveDay: "2026-04-20" });
    const r = correctStreak(s, { currentStreak: 12 }, NOW);
    expect(r.movedToToday).toBe(true);
    expect(r.state.lastActiveDay).toBe("2026-04-28");
    // Tonight's check leaves it, and the next day's activity extends it.
    expect(applyDayBoundary(r.state, new Date("2026-04-29T08:00:00Z")).event).toBe("safe");
    expect(registerActivity(r.state, new Date("2026-04-29T08:00:00Z")).state.currentStreak).toBe(
      13,
    );
  });

  it("raises the record with the streak, never lowers it", () => {
    const s = state({ currentStreak: 40, longestStreak: 40, lastActiveDay: "2026-04-28" });
    expect(correctStreak(s, { currentStreak: 5 }, NOW).state.longestStreak).toBe(40);
    expect(correctStreak(s, { currentStreak: 50 }, NOW).state.longestStreak).toBe(50);
  });

  it("leaves the last day alone when the streak is set to zero", () => {
    const s = state({ currentStreak: 9, longestStreak: 9, lastActiveDay: "2026-04-10" });
    const r = correctStreak(s, { currentStreak: 0 }, NOW);
    expect(r.movedToToday).toBe(false);
    expect(r.state.lastActiveDay).toBe("2026-04-10");
    expect(r.state.currentStreak).toBe(0);
  });

  it("starts a streak for an account never active", () => {
    const r = correctStreak(state({ lastActiveDay: null }), { currentStreak: 2 }, NOW);
    expect(r.movedToToday).toBe(true);
    expect(r.state.lastActiveDay).toBe("2026-04-28");
  });

  it("keeps the freezes unless told, and keeps them within the reserve", () => {
    const s = state({ currentStreak: 3, lastActiveDay: "2026-04-28", freezes: 1 });
    expect(correctStreak(s, { currentStreak: 3 }, NOW).state.freezes).toBe(1);
    expect(correctStreak(s, { currentStreak: 3, freezes: 0 }, NOW).state.freezes).toBe(0);
    expect(correctStreak(s, { currentStreak: 3, freezes: 9 }, NOW).state.freezes).toBe(MAX_FREEZES);
    expect(correctStreak(s, { currentStreak: -4, freezes: -1 }, NOW).state).toMatchObject({
      currentStreak: 0,
      freezes: 0,
    });
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
