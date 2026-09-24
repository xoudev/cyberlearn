import { describe, expect, it } from "vitest";
import { quizOptionOrder, quizOrderSeed } from "@cyberlearn/lib/quiz/option-order";
import { firstUnanswered, letterOf, optionOrderFor, progressScore, scoreOf } from "../quiz";

describe("scoreOf", () => {
  it("counts right answers, and counts an unanswered quiz as not right", () => {
    expect(
      scoreOf(["q-1", "q-2", "q-3"], {
        "q-1": { selected: 1, correct: true },
        "q-2": { selected: 0, correct: false },
      }),
    ).toEqual({ correct: 1, total: 3 });
  });

  it("ignores an answer to a quiz the lesson no longer has", () => {
    expect(scoreOf(["q-1"], { "q-old": { selected: 0, correct: true } })).toEqual({
      correct: 0,
      total: 1,
    });
  });
});

describe("firstUnanswered", () => {
  it("resumes where the learner stopped", () => {
    expect(firstUnanswered(["a", "b", "c"], { a: { selected: 0, correct: true } })).toBe(1);
  });

  it("is past the end when every quiz is answered", () => {
    expect(firstUnanswered(["a"], { a: { selected: 0, correct: false } })).toBe(1);
  });
});

describe("progressScore", () => {
  it("reads a completed lesson's score", () => {
    expect(progressScore({ status: "COMPLETED", quizCorrect: 3, quizTotal: 5 })).toEqual({
      correct: 3,
      total: 5,
    });
  });

  it("is null before completion, and for a lesson without a recorded score", () => {
    expect(progressScore({ status: "IN_PROGRESS", quizCorrect: 3, quizTotal: 5 })).toBeNull();
    expect(progressScore({ status: "COMPLETED", quizCorrect: null, quizTotal: null })).toBeNull();
    expect(progressScore({ status: "COMPLETED", quizCorrect: 0, quizTotal: 0 })).toBeNull();
  });
});

describe("the order of a quiz's options", () => {
  const quiz = { id: "q-1", options: ["12", "15", "8", "Une erreur"] };

  it("is the site's order for the same learner, lesson and quiz", () => {
    expect(optionOrderFor("user-1", "lesson-1", quiz)).toEqual(
      quizOptionOrder(quiz.options, quizOrderSeed("user-1", "lesson-1", "q-1")),
    );
    // The value the site's own test pins: both apps show the same order.
    expect(optionOrderFor("user-1", "lesson-1", quiz)).toEqual([0, 2, 1, 3]);
  });

  it("keeps the written order without a signed-in user", () => {
    expect(optionOrderFor(undefined, "lesson-1", quiz)).toEqual([0, 1, 2, 3]);
  });

  it("names an option by the letter it is shown under", () => {
    const order = [0, 2, 1, 3];
    expect(letterOf(order, 1)).toBe("C");
    expect(letterOf(order, 2)).toBe("B");
    expect(letterOf(order, 9)).toBe("?");
  });
});
