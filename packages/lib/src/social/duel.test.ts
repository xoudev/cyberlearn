import { describe, expect, it } from "vitest";
import { sourceKey, type MockSource } from "../exam/mock";
import { randomFromText } from "../exercises/arrange";
import {
  DUEL_STATUS_LABELS,
  checkDuelAnswer,
  drawDuel,
  duelQuestions,
  duelWinner,
  isExpired,
  outcomeText,
  scoreLine,
  tallyFor,
} from "./duel";

/**
 * A duel over a small path: five questions drawn, no answer key in what is
 * shown, an answer checked and its right option revealed, each player's
 * tally, the winner (right answers, then who finished first), the expiry.
 */

function quiz(lessonId: string, quizId: string): MockSource {
  return {
    lessonId,
    quizId,
    domain: "Module 01",
    question: `Question ${lessonId}/${quizId} ?`,
    options: ["A", "B", "C"],
    correct: 2,
    explanation: null,
  };
}

const SOURCES = ["l1", "l2", "l3", "l4"].flatMap((l) => [quiz(l, "q1"), quiz(l, "q2")]);
const byKey = new Map(SOURCES.map((s) => [sourceKey(s.lessonId, s.quizId), s]));
const at = (s: number): Date => new Date(Date.UTC(2026, 9, 7, 12, 0, s));

describe("drawDuel and duelQuestions", () => {
  it("draws five distinct quizzes with shuffled options, the same for a given seed", () => {
    const refs = drawDuel(SOURCES, 5, randomFromText("duel-1"));
    expect(refs).toHaveLength(5);
    expect(new Set(refs.map((r) => sourceKey(r.lessonId, r.quizId))).size).toBe(5);
    for (const ref of refs) expect([...ref.order].sort()).toEqual([0, 1, 2]);
    expect(drawDuel(SOURCES, 5, randomFromText("duel-1"))).toEqual(refs);
    const shown = duelQuestions(refs, byKey);
    expect(shown).toHaveLength(5);
    expect(JSON.stringify(shown)).not.toContain('"correct"');
  });
});

describe("checkDuelAnswer", () => {
  const ref = { lessonId: "l1", quizId: "q1", domain: "Module 01", order: [2, 0, 1] };

  it("says whether the pick is right, and which shown option was", () => {
    expect(checkDuelAnswer(ref, byKey, 0)).toEqual({ correct: true, correctIndex: 0 });
    expect(checkDuelAnswer(ref, byKey, 2)).toEqual({ correct: false, correctIndex: 0 });
  });

  it("refuses a pick out of range and a quiz no longer in its lesson", () => {
    expect(checkDuelAnswer(ref, byKey, 3)).toBeNull();
    expect(checkDuelAnswer(ref, byKey, -1)).toBeNull();
    expect(checkDuelAnswer({ ...ref, quizId: "gone" }, byKey, 0)).toBeNull();
  });
});

describe("tallyFor and duelWinner", () => {
  const answers = [
    { userId: "a", index: 0, correct: true, answeredAt: at(5) },
    { userId: "a", index: 1, correct: false, answeredAt: at(9) },
    { userId: "a", index: 2, correct: true, answeredAt: at(14) },
    { userId: "b", index: 0, correct: true, answeredAt: at(4) },
    { userId: "b", index: 1, correct: true, answeredAt: at(8) },
  ];

  it("counts each player's answers, right answers and finish", () => {
    expect(tallyFor("a", answers, 3)).toEqual({ answered: 3, correct: 2, finishedAt: at(14) });
    expect(tallyFor("b", answers, 3)).toEqual({ answered: 2, correct: 2, finishedAt: null });
    expect(tallyFor("c", answers, 3)).toEqual({ answered: 0, correct: 0, finishedAt: null });
  });

  it("gives the duel to the most right answers, then to whoever finished first", () => {
    const a = { answered: 3, correct: 2, finishedAt: at(14) };
    expect(duelWinner(a, { answered: 3, correct: 1, finishedAt: at(10) })).toBe("challenger");
    expect(duelWinner(a, { answered: 3, correct: 2, finishedAt: at(12) })).toBe("opponent");
    expect(duelWinner(a, { answered: 2, correct: 2, finishedAt: null })).toBe("challenger");
    expect(
      duelWinner(
        { answered: 1, correct: 0, finishedAt: null },
        { answered: 0, correct: 0, finishedAt: null },
      ),
    ).toBe("draw");
  });

  it("writes the result and the score in the reader's words", () => {
    expect(outcomeText("challenger", true)).toBe("Victoire !");
    expect(outcomeText("challenger", false)).toBe("Défaite.");
    expect(outcomeText("draw", false)).toBe("Égalité.");
    expect(scoreLine({ answered: 5, correct: 3, finishedAt: null }, 5)).toBe("3 / 5");
    expect(DUEL_STATUS_LABELS.PENDING).toBe("En attente");
  });
});

describe("isExpired", () => {
  it("lapses a pending or active duel past its time, never a finished one", () => {
    expect(isExpired({ status: "PENDING", expiresAt: at(0) }, at(1))).toBe(true);
    expect(isExpired({ status: "ACTIVE", expiresAt: at(5) }, at(1))).toBe(false);
    expect(isExpired({ status: "FINISHED", expiresAt: at(0) }, at(1))).toBe(false);
  });
});
