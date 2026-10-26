import { describe, expect, it } from "vitest";
import { criterionText, placementOptions } from "../reference-labels";
import {
  cosmeticQueryOf,
  parseCosmeticListParams,
  parsePlacementListParams,
  parseSeasonListParams,
  parseRatingListParams,
  parseSolveListParams,
  ratingQueryOf,
  referenceSearch,
  REFERENCE_PAGE_SIZE,
  seasonListSearch,
  solveQueryOf,
} from "../reference-params";

/**
 * The read-only reference lists and a tournament's flags read their filters
 * from the URL: a known value goes through, anything else is dropped, and the
 * links they build leave the defaults out.
 */

describe("the reference lists' parameters", () => {
  it("keep a known facet and drop an unknown one", () => {
    expect(parseCosmeticListParams({ type: "PROFILE_FRAME", q: " cadre ", page: "2" })).toEqual({
      q: "cadre",
      page: 2,
      type: "PROFILE_FRAME",
    });
    expect(parseCosmeticListParams({ type: "HAT" }).type).toBeUndefined();
    expect(parsePlacementListParams({ category: "NETWORK", difficulty: "GURU" })).toMatchObject({
      category: "NETWORK",
      difficulty: undefined,
    });
    expect(parseSeasonListParams({ status: "CLOSED", page: "-3" })).toEqual({
      status: "CLOSED",
      page: 1,
    });
  });

  it("build links without the defaults", () => {
    expect(referenceSearch({ q: "", page: 1 }, { type: undefined })).toEqual({});
    expect(referenceSearch({ q: "xp", page: 3 }, { type: "ACCENT_COLOR" })).toEqual({
      q: "xp",
      type: "ACCENT_COLOR",
      page: "3",
    });
    expect(seasonListSearch({ status: "ACTIVE", page: 1 })).toEqual({ status: "ACTIVE" });
  });

  it("ask the repository for a page of the console's size", () => {
    expect(cosmeticQueryOf({ q: "", page: 1, type: undefined })).toMatchObject({
      pageSize: REFERENCE_PAGE_SIZE,
    });
  });

  it("read a tournament's flags under a known status only", () => {
    const params = parseSolveListParams({ status: "disqualified", q: "@neo" });
    expect(solveQueryOf("t-1", params)).toEqual({
      tournamentId: "t-1",
      q: "@neo",
      page: 1,
      status: "disqualified",
      pageSize: REFERENCE_PAGE_SIZE,
    });
    expect(parseSolveListParams({ status: "banned" }).status).toBeUndefined();
  });
});

describe("the reference lists' words", () => {
  it("say what unlocks a cosmetic for the two kinds the seed writes", () => {
    expect(criterionText("LEVEL", { level: 5 })).toBe("Niveau 5");
    expect(criterionText("BADGE_EARNED", { badgeRefCode: "CL-BDG-009" })).toBe("Badge CL-BDG-009");
  });

  it("fall back on the kind for a shape they do not read", () => {
    expect(criterionText("LEVEL", null)).toBe("Niveau");
    expect(criterionText("XP_THRESHOLD", { xp: 1000 })).toBe("Seuil d'XP");
  });

  it("read a placement question's options, leaving out what is not one", () => {
    expect(
      placementOptions([{ id: "a", text: "TCP" }, { id: "b" }, "c", { id: 3, text: "UDP" }]),
    ).toEqual([
      { id: "a", text: "TCP" },
      { id: "3", text: "UDP" },
    ]);
    expect(placementOptions({ id: "a" })).toEqual([]);
  });
});

describe("a lesson's ratings' parameters", () => {
  it("reads a score from 1 to 5 as a number, and drops anything else", () => {
    const params = parseRatingListParams({ score: "2", q: " lent ", page: "3" });
    expect(params).toEqual({ q: "lent", page: 3, score: "2" });
    expect(ratingQueryOf("lesson-1", params)).toEqual({
      lessonId: "lesson-1",
      q: "lent",
      score: 2,
      page: 3,
      pageSize: REFERENCE_PAGE_SIZE,
    });
    expect(parseRatingListParams({ score: "6" }).score).toBeUndefined();
    expect(ratingQueryOf("lesson-1", parseRatingListParams({})).score).toBeUndefined();
  });
});
