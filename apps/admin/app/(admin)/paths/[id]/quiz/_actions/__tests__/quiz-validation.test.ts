import { describe, expect, it } from "vitest";
import { questionSchema, quizSettingsSchema } from "../quiz-validation";

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
