import { describe, expect, it } from "vitest";
import { clockText, formatClock, minutesLabel, readTimer } from "../timer";

const MIN = 60_000;

describe("readTimer", () => {
  it("counts down from the start", () => {
    const r = readTimer(30 * MIN, 1_000, 1_000 + 10 * MIN, null);
    expect(r).toEqual({ elapsed: 10 * MIN, remaining: 20 * MIN, expired: false, finished: false });
  });

  it("expires at the limit, and never goes below zero", () => {
    expect(readTimer(30 * MIN, 0, 30 * MIN, null).expired).toBe(true);
    const late = readTimer(30 * MIN, 0, 45 * MIN, null);
    expect(late.remaining).toBe(0);
    expect(late.elapsed).toBe(45 * MIN);
  });

  it("freezes at the finish, whatever the time now", () => {
    const r = readTimer(30 * MIN, 0, 50 * MIN, 18 * MIN);
    expect(r).toEqual({ elapsed: 18 * MIN, remaining: 12 * MIN, expired: false, finished: true });
  });

  it("tells a finish past the limit", () => {
    const r = readTimer(30 * MIN, 0, 40 * MIN, 34 * MIN);
    expect(r.finished).toBe(true);
    expect(r.expired).toBe(true);
  });

  it("does not count a clock that went backwards", () => {
    expect(readTimer(30 * MIN, 5_000, 1_000, null).elapsed).toBe(0);
  });
});

describe("formatClock", () => {
  it.each([
    [0, "00:00"],
    [5, "00:05"],
    [65, "01:05"],
    [30 * 60, "30:00"],
    [3600 + 125, "1:02:05"],
    [12.9, "00:12"],
    [-3, "00:00"],
  ])("shows %s seconds as %s", (seconds, text) => {
    expect(formatClock(seconds)).toBe(text);
  });
});

describe("clockText", () => {
  it("starts on the full limit and rounds the time left up", () => {
    expect(clockText(readTimer(30 * MIN, 0, 0, null))).toBe("30:00");
    expect(clockText(readTimer(30 * MIN, 0, 400, null))).toBe("30:00");
    expect(clockText(readTimer(30 * MIN, 0, 30 * MIN - 1, null))).toBe("00:01");
    expect(clockText(readTimer(30 * MIN, 0, 30 * MIN, null))).toBe("00:00");
  });

  it("shows the time it took once finished", () => {
    expect(clockText(readTimer(30 * MIN, 0, 40 * MIN, 18 * MIN + 42_500))).toBe("18:42");
  });
});

describe("minutesLabel", () => {
  it("agrees in number", () => {
    expect(minutesLabel(1)).toBe("1 minute");
    expect(minutesLabel(30)).toBe("30 minutes");
  });
});
