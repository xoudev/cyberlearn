import { describe, expect, it } from "vitest";
import {
  newQuestionTargetSchema,
  questionSchema,
  questionTargetSchema,
  quizSettingsSchema,
  quizTargetSchema,
} from "../quiz-validation";

describe("quizSettingsSchema", () => {
  it("accepts valid settings", () => {
    expect(
      quizSettingsSchema.safeParse({ passThreshold: 70, questionsToDraw: 5, isActive: true })
        .success,
    ).toBe(true);
  });
  it("rejects passThreshold outside 0–100", () => {
    expect(
      quizSettingsSchema.safeParse({ passThreshold: 101, questionsToDraw: 5, isActive: true })
        .success,
    ).toBe(false);
  });
  it("rejects questionsToDraw < 1", () => {
    expect(
      quizSettingsSchema.safeParse({ passThreshold: 70, questionsToDraw: 0, isActive: true })
        .success,
    ).toBe(false);
  });
});

describe("questionSchema", () => {
  const base = {
    question: "Quelle est la réponse ?",
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    correctOptionId: "a",
    orderIndex: 0,
    isActive: true,
  };

  it("accepts a valid question", () => {
    expect(questionSchema.safeParse(base).success).toBe(true);
  });
  it("rejects a correctOptionId that is not one of the options", () => {
    expect(questionSchema.safeParse({ ...base, correctOptionId: "z" }).success).toBe(false);
  });
  it("rejects fewer than 2 options", () => {
    expect(questionSchema.safeParse({ ...base, options: [{ id: "a", text: "A" }] }).success).toBe(
      false,
    );
  });
  it("rejects duplicate option ids", () => {
    expect(
      questionSchema.safeParse({
        ...base,
        options: [
          { id: "a", text: "A" },
          { id: "a", text: "B" },
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects empty option text", () => {
    expect(
      questionSchema.safeParse({
        ...base,
        options: [
          { id: "a", text: "" },
          { id: "b", text: "B" },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("booleans", () => {
  // A string such as "false" is truthy: coerced, it would switch a quiz on.
  it("takes isActive as a boolean, never a string", () => {
    expect(
      quizSettingsSchema.safeParse({ passThreshold: 70, questionsToDraw: 5, isActive: "false" })
        .success,
    ).toBe(false);
  });
});

describe("the ids an action is called with", () => {
  const PATH = "6f1c2a1e-1b2c-4d3e-8f40-5a6b7c8d9e01";
  const OTHER = "6f1c2a1e-1b2c-4d3e-8f40-5a6b7c8d9e02";

  it("accepts ids", () => {
    expect(quizTargetSchema.safeParse({ pathId: PATH }).success).toBe(true);
    expect(newQuestionTargetSchema.safeParse({ pathId: PATH, quizId: OTHER }).success).toBe(true);
    expect(questionTargetSchema.safeParse({ pathId: PATH, questionId: OTHER }).success).toBe(true);
  });

  it("refuses anything else, the path included since it lands in a revalidated URL", () => {
    expect(quizTargetSchema.safeParse({ pathId: "../lessons" }).success).toBe(false);
    expect(newQuestionTargetSchema.safeParse({ pathId: PATH }).success).toBe(false);
    expect(questionTargetSchema.safeParse({ pathId: PATH, questionId: 1 }).success).toBe(false);
  });
});
