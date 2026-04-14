import { describe, expect, it } from "vitest";
import {
  placementAnswerSchema,
  placementSubmissionSchema,
  PLACEMENT_MASTERY_THRESHOLD,
  WAIVED_DIFFICULTIES,
} from "../placement-test.schema.js";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ─── placementAnswerSchema ────────────────────────────────────────────────────

describe("placementAnswerSchema", () => {
  it("accepts a valid answer with UUID questionId and option string", () => {
    const result = placementAnswerSchema.safeParse({
      questionId: VALID_UUID,
      selectedOptionId: "A",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID questionId", () => {
    const result = placementAnswerSchema.safeParse({
      questionId: "not-a-uuid",
      selectedOptionId: "A",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty selectedOptionId", () => {
    const result = placementAnswerSchema.safeParse({
      questionId: VALID_UUID,
      selectedOptionId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a selectedOptionId longer than 10 characters", () => {
    const result = placementAnswerSchema.safeParse({
      questionId: VALID_UUID,
      selectedOptionId: "A".repeat(11),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing questionId", () => {
    const result = placementAnswerSchema.safeParse({ selectedOptionId: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects missing selectedOptionId", () => {
    const result = placementAnswerSchema.safeParse({ questionId: VALID_UUID });
    expect(result.success).toBe(false);
  });
});

// ─── placementSubmissionSchema ────────────────────────────────────────────────

describe("placementSubmissionSchema", () => {
  const validAnswer = { questionId: VALID_UUID, selectedOptionId: "B" };

  it("accepts a submission with one or more answers", () => {
    expect(placementSubmissionSchema.safeParse({ answers: [validAnswer] }).success).toBe(true);
  });

  it("accepts a submission with multiple answers", () => {
    expect(
      placementSubmissionSchema.safeParse({ answers: [validAnswer, validAnswer] }).success,
    ).toBe(true);
  });

  it("rejects an empty answers array", () => {
    const result = placementSubmissionSchema.safeParse({ answers: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/at least one answer/i);
    }
  });

  it("rejects a submission with a missing answers field", () => {
    const result = placementSubmissionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a submission where one answer has an invalid questionId", () => {
    const result = placementSubmissionSchema.safeParse({
      answers: [{ questionId: "bad-id", selectedOptionId: "A" }],
    });
    expect(result.success).toBe(false);
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("placement test constants", () => {
  it("PLACEMENT_MASTERY_THRESHOLD is 70", () => {
    expect(PLACEMENT_MASTERY_THRESHOLD).toBe(70);
  });

  it("WAIVED_DIFFICULTIES includes BEGINNER and INTERMEDIATE only", () => {
    expect(WAIVED_DIFFICULTIES).toContain("BEGINNER");
    expect(WAIVED_DIFFICULTIES).toContain("INTERMEDIATE");
    expect(WAIVED_DIFFICULTIES).toHaveLength(2);
  });
});
