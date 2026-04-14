"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const placement_test_schema_js_1 = require("../placement-test.schema.js");
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
// ─── placementAnswerSchema ────────────────────────────────────────────────────
(0, vitest_1.describe)("placementAnswerSchema", () => {
  (0, vitest_1.it)("accepts a valid answer with UUID questionId and option string", () => {
    const result = placement_test_schema_js_1.placementAnswerSchema.safeParse({
      questionId: VALID_UUID,
      selectedOptionId: "A",
    });
    (0, vitest_1.expect)(result.success).toBe(true);
  });
  (0, vitest_1.it)("rejects a non-UUID questionId", () => {
    const result = placement_test_schema_js_1.placementAnswerSchema.safeParse({
      questionId: "not-a-uuid",
      selectedOptionId: "A",
    });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects an empty selectedOptionId", () => {
    const result = placement_test_schema_js_1.placementAnswerSchema.safeParse({
      questionId: VALID_UUID,
      selectedOptionId: "",
    });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects a selectedOptionId longer than 10 characters", () => {
    const result = placement_test_schema_js_1.placementAnswerSchema.safeParse({
      questionId: VALID_UUID,
      selectedOptionId: "A".repeat(11),
    });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects missing questionId", () => {
    const result = placement_test_schema_js_1.placementAnswerSchema.safeParse({
      selectedOptionId: "A",
    });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects missing selectedOptionId", () => {
    const result = placement_test_schema_js_1.placementAnswerSchema.safeParse({
      questionId: VALID_UUID,
    });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
});
// ─── placementSubmissionSchema ────────────────────────────────────────────────
(0, vitest_1.describe)("placementSubmissionSchema", () => {
  const validAnswer = { questionId: VALID_UUID, selectedOptionId: "B" };
  (0, vitest_1.it)("accepts a submission with one or more answers", () => {
    (0, vitest_1.expect)(
      placement_test_schema_js_1.placementSubmissionSchema.safeParse({ answers: [validAnswer] })
        .success,
    ).toBe(true);
  });
  (0, vitest_1.it)("accepts a submission with multiple answers", () => {
    (0, vitest_1.expect)(
      placement_test_schema_js_1.placementSubmissionSchema.safeParse({
        answers: [validAnswer, validAnswer],
      }).success,
    ).toBe(true);
  });
  (0, vitest_1.it)("rejects an empty answers array", () => {
    const result = placement_test_schema_js_1.placementSubmissionSchema.safeParse({ answers: [] });
    (0, vitest_1.expect)(result.success).toBe(false);
    if (!result.success) {
      (0, vitest_1.expect)(result.error.issues[0]?.message).toMatch(/at least one answer/i);
    }
  });
  (0, vitest_1.it)("rejects a submission with a missing answers field", () => {
    const result = placement_test_schema_js_1.placementSubmissionSchema.safeParse({});
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects a submission where one answer has an invalid questionId", () => {
    const result = placement_test_schema_js_1.placementSubmissionSchema.safeParse({
      answers: [{ questionId: "bad-id", selectedOptionId: "A" }],
    });
    (0, vitest_1.expect)(result.success).toBe(false);
  });
});
// ─── Constants ────────────────────────────────────────────────────────────────
(0, vitest_1.describe)("placement test constants", () => {
  (0, vitest_1.it)("PLACEMENT_MASTERY_THRESHOLD is 70", () => {
    (0, vitest_1.expect)(placement_test_schema_js_1.PLACEMENT_MASTERY_THRESHOLD).toBe(70);
  });
  (0, vitest_1.it)("WAIVED_DIFFICULTIES includes BEGINNER and INTERMEDIATE only", () => {
    (0, vitest_1.expect)(placement_test_schema_js_1.WAIVED_DIFFICULTIES).toContain("BEGINNER");
    (0, vitest_1.expect)(placement_test_schema_js_1.WAIVED_DIFFICULTIES).toContain("INTERMEDIATE");
    (0, vitest_1.expect)(placement_test_schema_js_1.WAIVED_DIFFICULTIES).toHaveLength(2);
  });
});
//# sourceMappingURL=placement-test.schema.test.js.map
