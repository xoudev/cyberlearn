import { describe, expect, it } from "vitest";
import { attemptDay, handedInSince, type MockHistoryItem } from "../mock-exam";

/** The mock exam's history, as the screen reads it: its dates, and a copy that went in unanswered. */

describe("attemptDay", () => {
  it("names the day and the month in full", () => {
    expect(attemptDay("2026-10-01T10:00:00.000Z")).toBe("1 octobre");
  });
});

describe("handedInSince", () => {
  const handed = (submittedAt: string): MockHistoryItem => ({
    submittedAt,
    score: 50,
    late: false,
    domains: [],
  });
  const startedAt = "2026-10-01T10:00:00.000Z";

  it("finds the copy when the newest attempt was handed in after this one started", () => {
    expect(handedInSince([handed("2026-10-01T10:15:00.000Z")], startedAt)).toBe(true);
  });

  it("does not take an older attempt for this one, nor an empty history", () => {
    expect(handedInSince([handed("2026-09-30T18:00:00.000Z")], startedAt)).toBe(false);
    expect(handedInSince([], startedAt)).toBe(false);
  });
});
