import { describe, expect, it } from "vitest";
import { duelResultLine, nextQuestion, type DuelView } from "../duels";

/** A duel's line in the list, and the next question for the reader. */

const VIEW: DuelView = {
  id: "d1",
  status: "ACTIVE",
  pathTitle: "Linux",
  pathSlug: "linux",
  reader: { id: "me", name: "Moi", username: "moi" },
  other: { id: "alex", name: "Alex", username: "alex" },
  readerIsChallenger: true,
  questionCount: 2,
  readerScore: { answered: 1, correct: 1 },
  otherScore: { answered: 0, correct: 0 },
  winner: null,
  createdAt: "2026-10-08T10:00:00.000Z",
  expiresAt: "2026-10-09T10:00:00.000Z",
  questions: [
    { index: 0, domain: "M1", question: "Un ?", options: ["A", "B"] },
    { index: 1, domain: "M1", question: "Deux ?", options: ["A", "B"] },
  ],
  readerAnswers: [{ index: 0, selected: 1, correct: true, correctIndex: 1 }],
};

describe("duels in the app", () => {
  it("gives the next question the reader has not answered", () => {
    expect(nextQuestion(VIEW)?.question).toBe("Deux ?");
    expect(
      nextQuestion({
        ...VIEW,
        readerAnswers: [
          ...VIEW.readerAnswers,
          { index: 1, selected: 0, correct: false, correctIndex: 1 },
        ],
      }),
    ).toBeNull();
  });

  it("writes a settled duel's result, and nothing for one still open", () => {
    expect(duelResultLine(VIEW)).toBeNull();
    expect(
      duelResultLine({
        ...VIEW,
        status: "FINISHED",
        winner: "reader",
        otherScore: { answered: 2, correct: 0 },
      }),
    ).toBe("Victoire, 1 à 0");
    expect(duelResultLine({ ...VIEW, status: "FINISHED", winner: "draw" })).toBe("Égalité, 1 à 0");
  });
});
