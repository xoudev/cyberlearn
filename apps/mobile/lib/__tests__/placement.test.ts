import { describe, expect, it } from "vitest";
import {
  PLACEMENT_COPY,
  masteredPlacementDomains,
  missingAnswersLabel,
  offersPlacementTest,
  placementAnswersFrom,
  placementQuestionHeading,
  unansweredPlacementQuestions,
  type PlacementQuestion,
} from "../placement";

function q(id: string, category: PlacementQuestion["category"]): PlacementQuestion {
  return {
    id,
    category,
    difficulty: "BEGINNER",
    question: `Question ${id}`,
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
  };
}

const QUESTIONS = [q("d1", "DEV"), q("d2", "DEV"), q("c1", "CYBERSEC"), q("n1", "NETWORK")];

describe("the placement test in the app", () => {
  it("is offered to somebody with a base, not to a beginner, as on the site", () => {
    expect(offersPlacementTest("NEW")).toBe(false);
    expect(offersPlacementTest("SOME")).toBe(true);
    expect(offersPlacementTest("PRACTICING")).toBe(true);
    expect(PLACEMENT_COPY.offer).toBe("Faire le test de positionnement");
  });

  it("heads each question with its domain and its rank in it", () => {
    expect(placementQuestionHeading(QUESTIONS, 1)).toEqual({
      category: "DEV",
      label: "Développement",
      position: 2,
      count: 2,
    });
    expect(placementQuestionHeading(QUESTIONS, 2)).toEqual({
      category: "CYBERSEC",
      label: "Cybersécurité",
      position: 1,
      count: 1,
    });
    expect(placementQuestionHeading(QUESTIONS, 9)).toBeNull();
  });

  it("sends nothing until every question is answered, and says how many are left", () => {
    const selected = { d1: "a", c1: "b" };
    const missing = unansweredPlacementQuestions(
      QUESTIONS.map((x) => x.id),
      selected,
    );
    expect(missing).toEqual(["d2", "n1"]);
    expect(missingAnswersLabel(missing.length)).toBe("Il reste 2 questions sans réponse.");
    expect(missingAnswersLabel(1)).toBe("Il reste une question sans réponse.");
    expect(missingAnswersLabel(0)).toBeNull();
  });

  it("sends the choices in the shape the server validates", () => {
    expect(placementAnswersFrom({ d1: "a" })).toEqual([
      { questionId: "d1", selectedOptionId: "a" },
    ]);
  });

  it("names the domains unlocked by the result", () => {
    expect(
      masteredPlacementDomains({ devScore: 100, cybersecScore: 50, networkScore: 70 }),
    ).toEqual(["DEV", "NETWORK"]);
  });
});
