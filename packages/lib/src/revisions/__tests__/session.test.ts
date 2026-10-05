import { describe, expect, it } from "vitest";
import { computeSm2 } from "../../sm2.js";
import {
  isMastered,
  prioritizeReviews,
  REVIEW_SESSION_SIZE,
  reviewSession,
  sessionSize,
  waitingText,
} from "../session.js";

const NOW = Date.parse("2026-10-05T10:00:00Z");
const daysAgo = (days: number, easeFactor = 2.5): { nextReviewAt: Date; easeFactor: number } => ({
  nextReviewAt: new Date(NOW - days * 86_400_000),
  easeFactor,
});

describe("prioritizeReviews", () => {
  it("takes the longest overdue first, and among equals the shakiest", () => {
    const ordered = prioritizeReviews([
      { id: "fresh", ...daysAgo(0, 2.5) },
      { id: "old-easy", ...daysAgo(9, 2.8) },
      { id: "old-hard", ...daysAgo(9, 1.3) },
      { id: "older", ...daysAgo(20, 2.5) },
    ]);
    expect(ordered.map((r) => r.id)).toEqual(["older", "old-hard", "old-easy", "fresh"]);
  });

  it("reads a date the app hands it as text the same way", () => {
    const ordered = prioritizeReviews([
      { id: "b", nextReviewAt: "2026-10-04T10:00:00.000Z", easeFactor: 2.5 },
      { id: "a", nextReviewAt: new Date("2026-10-01T10:00:00Z"), easeFactor: 2.5 },
    ]);
    expect(ordered.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("reviewSession", () => {
  it("asks for five at most and counts the rest as waiting", () => {
    const due = Array.from({ length: 12 }, (_, i) => ({ id: String(i), ...daysAgo(i) }));
    const { session, waiting } = reviewSession(due);
    expect(session).toHaveLength(REVIEW_SESSION_SIZE);
    expect(session.map((r) => r.id)).toEqual(["11", "10", "9", "8", "7"]);
    expect(waiting).toBe(7);
  });

  it("asks for everything when there is less than a session", () => {
    const { session, waiting } = reviewSession([daysAgo(1), daysAgo(2)]);
    expect(session).toHaveLength(2);
    expect(waiting).toBe(0);
    expect(reviewSession([])).toEqual({ session: [], waiting: 0 });
  });

  it("counts the same way without the rows", () => {
    expect(sessionSize(0)).toBe(0);
    expect(sessionSize(3)).toBe(3);
    expect(sessionSize(60)).toBe(REVIEW_SESSION_SIZE);
  });
});

describe("isMastered", () => {
  function gradeUntilHeld(quality: 3 | 5, limit = 12): number {
    let state = { easeFactor: 2.5, intervalDays: 1, repetitions: 0 };
    for (let grade = 1; grade <= limit; grade += 1) {
      state = computeSm2(quality, state);
      if (isMastered(state)) return grade;
    }
    return Number.POSITIVE_INFINITY;
  }

  it("holds a lesson found easy five times running, over about two months", () => {
    expect(gradeUntilHeld(5)).toBe(5);
  });

  it("takes a review more for a lesson that is always hard, and never gives up on it", () => {
    expect(gradeUntilHeld(3)).toBe(6);
  });

  it("is undone by forgetting: SM-2 starts the lesson over", () => {
    let state = { easeFactor: 2.5, intervalDays: 1, repetitions: 0 };
    for (let i = 0; i < 4; i += 1) state = computeSm2(5, state);
    expect(isMastered(computeSm2(1, state))).toBe(false);
  });

  it("asks for repetitions as well as the interval", () => {
    expect(isMastered({ intervalDays: 90, repetitions: 1 })).toBe(false);
    expect(isMastered({ intervalDays: 59, repetitions: 6 })).toBe(false);
    expect(isMastered({ intervalDays: 60, repetitions: 3 })).toBe(true);
  });
});

describe("waitingText", () => {
  it("says nothing when nothing waits, and counts otherwise", () => {
    expect(waitingText(0)).toBeNull();
    expect(waitingText(1)).toContain("Une autre leçon");
    expect(waitingText(12)).toBe("12 autres leçons attendent leur tour, 5 par jour au plus.");
  });
});
