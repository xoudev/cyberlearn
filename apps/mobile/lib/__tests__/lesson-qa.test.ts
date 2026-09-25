import { describe, expect, it } from "vitest";
import {
  answerCountLabel,
  answerDraftProblem,
  canAccept,
  canUpvote,
  questionCountLabel,
  questionDraftProblem,
  type QaAnswer,
  type QaQuestion,
} from "../lesson-qa";

function answer(overrides: Partial<QaAnswer> = {}): QaAnswer {
  return {
    id: "a",
    content: "Réponse",
    isAccepted: false,
    upvotes: 0,
    createdAt: "2026-09-21T08:00:00.000Z",
    mine: false,
    author: null,
    ...overrides,
  };
}

function question(overrides: Partial<QaQuestion> = {}): QaQuestion {
  return {
    id: "q",
    title: "Titre",
    content: "Contenu",
    isResolved: false,
    createdAt: "2026-09-20T08:00:00.000Z",
    mine: false,
    author: null,
    answerCount: 0,
    answers: [],
    ...overrides,
  };
}

describe("questionDraftProblem / answerDraftProblem", () => {
  it("uses the server's limits and words, counted without margins", () => {
    expect(questionDraftProblem("Pourquoi", "x".repeat(20))).toBe(
      "Un titre de 10 caractères au minimum.",
    );
    expect(questionDraftProblem("Pourquoi trois ?", "   court   ")).toBe(
      "Décris ta question en 20 caractères au minimum.",
    );
    expect(questionDraftProblem("t".repeat(201), "x".repeat(20))).not.toBeNull();
    expect(questionDraftProblem("t".repeat(10), "x".repeat(20))).toBeNull();
    expect(answerDraftProblem("Oui.")).toBe("Une réponse de 10 caractères au minimum.");
    expect(answerDraftProblem("x".repeat(5001))).not.toBeNull();
    expect(answerDraftProblem("x".repeat(10))).toBeNull();
  });
});

describe("canAccept / canUpvote", () => {
  it("lets only the question's author accept, an answer not accepted yet", () => {
    expect(canAccept(question({ mine: true }), answer())).toBe(true);
    expect(canAccept(question({ mine: true }), answer({ isAccepted: true }))).toBe(false);
    expect(canAccept(question(), answer())).toBe(false);
  });

  it("never offers to upvote one's own answer", () => {
    expect(canUpvote(answer())).toBe(true);
    expect(canUpvote(answer({ mine: true }))).toBe(false);
  });
});

describe("labels", () => {
  it("agrees in number, and says when there is nothing", () => {
    expect(answerCountLabel(1)).toBe("1 réponse");
    expect(answerCountLabel(3)).toBe("3 réponses");
    expect(questionCountLabel(0)).toBe("Aucune question pour l'instant");
    expect(questionCountLabel(2)).toBe("2 questions");
  });
});
