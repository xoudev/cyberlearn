import { describe, expect, it } from "vitest";
import { computeNewStreak } from "../streak.js";

// Use local-time Date constructors so tests are timezone-agnostic.
// computeNewStreak uses setHours() (local time) for calendar-day comparison.
// new Date(y, m, d, h) creates a date in local time - consistent with the implementation.

// ── Same calendar day ─────────────────────────────────────────────────────────

describe("same calendar day", () => {
  it("streak unchanged if called twice on same day", () => {
    const now = new Date(2026, 3, 28, 14, 0, 0); // Apr 28, 14:00 local
    const lastActive = new Date(2026, 3, 28, 9, 0, 0); // Apr 28, 09:00 local
    const result = computeNewStreak(7, lastActive, now);
    expect(result.streakDays).toBe(7);
    expect(result.lastActiveAt).toBe(lastActive);
  });

  it("returns same lastActiveAt reference (no mutation)", () => {
    const now = new Date(2026, 3, 28, 22, 0, 0); // Apr 28, 22:00 local
    const lastActive = new Date(2026, 3, 28, 1, 0, 0); // Apr 28, 01:00 local
    const result = computeNewStreak(3, lastActive, now);
    expect(result.lastActiveAt).toBe(lastActive);
  });
});

// ── Consecutive day (streak +1) ───────────────────────────────────────────────

describe("consecutive calendar day", () => {
  it("increments streak on the next calendar day", () => {
    const now = new Date(2026, 3, 28, 8, 0, 0); // Apr 28, 08:00 local
    const lastActive = new Date(2026, 3, 27, 22, 0, 0); // Apr 27, 22:00 local
    const result = computeNewStreak(5, lastActive, now);
    expect(result.streakDays).toBe(6);
    expect(result.lastActiveAt).toBe(now);
  });

  it("increments streak from 0 to 1 on first activity after new day", () => {
    const now = new Date(2026, 3, 28, 0, 1, 0); // Apr 28, 00:01 local
    const lastActive = new Date(2026, 3, 27, 23, 59, 0); // Apr 27, 23:59 local
    const result = computeNewStreak(0, lastActive, now);
    expect(result.streakDays).toBe(1);
  });

  it("midnight edge: 23:59 yesterday and 00:01 today count as consecutive", () => {
    const lastActive = new Date(2026, 3, 27, 23, 59, 59); // Apr 27, 23:59:59 local
    const now = new Date(2026, 3, 28, 0, 0, 1); // Apr 28, 00:00:01 local
    const result = computeNewStreak(10, lastActive, now);
    expect(result.streakDays).toBe(11);
  });
});

// ── Gap > 1 day (streak reset) ────────────────────────────────────────────────

describe("gap greater than 1 day", () => {
  it("resets streak to 1 after a 2-day gap", () => {
    const now = new Date(2026, 3, 28, 12, 0, 0); // Apr 28 local
    const lastActive = new Date(2026, 3, 26, 12, 0, 0); // Apr 26 local
    const result = computeNewStreak(15, lastActive, now);
    expect(result.streakDays).toBe(1);
    expect(result.lastActiveAt).toBe(now);
  });

  it("resets streak to 1 after a 7-day gap", () => {
    const now = new Date(2026, 3, 28, 10, 0, 0); // Apr 28 local
    const lastActive = new Date(2026, 3, 21, 10, 0, 0); // Apr 21 local
    const result = computeNewStreak(100, lastActive, now);
    expect(result.streakDays).toBe(1);
  });

  it("resets a 1-day streak after missing a day", () => {
    const now = new Date(2026, 3, 28, 10, 0, 0); // Apr 28 local
    const lastActive = new Date(2026, 3, 26, 10, 0, 0); // Apr 26 local
    const result = computeNewStreak(1, lastActive, now);
    expect(result.streakDays).toBe(1);
  });
});

// ── Default `now` parameter ───────────────────────────────────────────────────

describe("default now parameter", () => {
  it("uses current time when now is omitted", () => {
    const longAgo = new Date(1970, 0, 1); // Jan 1, 1970 local - gap is certainly > 1 day
    const result = computeNewStreak(999, longAgo);
    expect(result.streakDays).toBe(1);
  });
});
