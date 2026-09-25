import { describe, expect, it } from "vitest";
import {
  PLACEMENT_CATEGORIES,
  PLACEMENT_CATEGORY_LABEL,
  PLACEMENT_COPY,
  isPlacementCategory,
  masteredPlacementDomains,
  placementAnswersFrom,
  placementLevelFor,
  placementMinutesFor,
  placementScoreOf,
  strongestPlacementDomain,
  unansweredPlacementQuestions,
} from "./placement.js";

describe("the placement test's words", () => {
  it("names the three domains, in the database's order", () => {
    expect(PLACEMENT_CATEGORIES).toEqual(["DEV", "CYBERSEC", "NETWORK"]);
    expect(PLACEMENT_CATEGORIES.map((c) => PLACEMENT_CATEGORY_LABEL[c])).toEqual([
      "Développement",
      "Cybersécurité",
      "Réseaux & Systèmes",
    ]);
    expect(isPlacementCategory("NETWORK")).toBe(true);
    expect(isPlacementCategory("EXPERT")).toBe(false);
  });

  it("reads a score as the result page does", () => {
    expect(placementLevelFor(100)).toBe("Avancé");
    expect(placementLevelFor(70)).toBe("Avancé");
    expect(placementLevelFor(69)).toBe("Intermédiaire");
    expect(placementLevelFor(40)).toBe("Intermédiaire");
    expect(placementLevelFor(39)).toBe("Débutant");
    expect(placementLevelFor(0)).toBe("Débutant");
  });

  it("estimates forty-five seconds a question, rounded up", () => {
    expect(placementMinutesFor(1)).toBe(1);
    expect(placementMinutesFor(12)).toBe(9);
    expect(placementMinutesFor(15)).toBe(12);
  });

  it("counts the questions in the intro", () => {
    expect(PLACEMENT_COPY.intro(15)).toMatch(/^15 questions rapides/);
  });
});

describe("the placement test's small rules", () => {
  const scores = { devScore: 40, cybersecScore: 90, networkScore: 90 };

  it("reads a domain's score", () => {
    expect(placementScoreOf(scores, "DEV")).toBe(40);
    expect(placementScoreOf(scores, "CYBERSEC")).toBe(90);
    expect(placementScoreOf(scores, "NETWORK")).toBe(90);
  });

  it("calls the highest domain the strong point, the first one on a tie", () => {
    expect(strongestPlacementDomain(scores)).toBe("CYBERSEC");
    expect(strongestPlacementDomain({ devScore: 0, cybersecScore: 0, networkScore: 0 })).toBe(
      "DEV",
    );
    expect(strongestPlacementDomain({ devScore: 10, cybersecScore: 5, networkScore: 60 })).toBe(
      "NETWORK",
    );
  });

  it("names the domains the waivers were granted for, from 70", () => {
    expect(masteredPlacementDomains(scores)).toEqual(["CYBERSEC", "NETWORK"]);
    expect(masteredPlacementDomains({ devScore: 70, cybersecScore: 69, networkScore: 0 })).toEqual([
      "DEV",
    ]);
    expect(masteredPlacementDomains({ devScore: 0, cybersecScore: 0, networkScore: 0 })).toEqual(
      [],
    );
  });

  it("lists what is still unanswered, in order", () => {
    expect(unansweredPlacementQuestions(["q1", "q2", "q3"], { q2: "a" })).toEqual(["q1", "q3"]);
    expect(unansweredPlacementQuestions(["q1"], { q1: "b" })).toEqual([]);
  });

  it("sends the choices as the server reads them", () => {
    expect(placementAnswersFrom({ q1: "a", q2: "c" })).toEqual([
      { questionId: "q1", selectedOptionId: "a" },
      { questionId: "q2", selectedOptionId: "c" },
    ]);
  });
});
