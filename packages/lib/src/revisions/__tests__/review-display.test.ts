import { describe, expect, it } from "vitest";
import {
  REVIEW_GRADES,
  outcomeOf,
  reviewDueLabel,
  reviewMinutes,
  reviewOutcomeText,
  reviewXpFor,
} from "../review-display.js";

const NOW = new Date("2026-09-24T10:00:00Z");
const inHours = (h: number): Date => new Date(NOW.getTime() + h * 3_600_000);

describe("reviewDueLabel", () => {
  it("calls anything past or present due today", () => {
    expect(reviewDueLabel(inHours(-72), NOW)).toEqual({ text: "Dû aujourd'hui", kind: "today" });
    expect(reviewDueLabel(NOW, NOW).kind).toBe("today");
  });

  it("says tomorrow within a day, and counts days after that", () => {
    expect(reviewDueLabel(inHours(20), NOW)).toEqual({ text: "Dû demain", kind: "tomorrow" });
    expect(reviewDueLabel(inHours(24 * 3 + 1), NOW)).toEqual({
      text: "Dans 4 jours",
      kind: "soon",
    });
  });
});

describe("reviewMinutes and reviewXpFor", () => {
  it("scales the time with the difficulty, three minutes when unknown", () => {
    expect(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT", "?"].map(reviewMinutes)).toEqual([
      2, 3, 5, 8, 3,
    ]);
  });

  it("pays a tenth of the lesson's XP, rounded down", () => {
    expect(reviewXpFor(50)).toBe(5);
    expect(reviewXpFor(125)).toBe(12);
    expect(reviewXpFor(5)).toBe(0);
  });
});

describe("grades and outcomes", () => {
  it("offers forgot, hard and easy, in that order", () => {
    expect(REVIEW_GRADES.map((g) => [g.quality, g.outcome])).toEqual([
      [1, "forgot"],
      [3, "hard"],
      [5, "easy"],
    ]);
    expect(REVIEW_GRADES.every((g) => outcomeOf(g.quality) === g.outcome)).toBe(true);
  });

  it("words what each grade did", () => {
    expect(reviewOutcomeText("easy", 5)).toBe("Bien mémorisé · +5 XP");
    expect(reviewOutcomeText("hard", 5)).toBe("Encore fragile · +5 XP · à revoir demain");
    expect(reviewOutcomeText("forgot", 0)).toBe("Oublié · retour en révision demain");
  });
});
