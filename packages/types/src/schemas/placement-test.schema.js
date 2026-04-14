"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WAIVED_DIFFICULTIES =
  exports.PLACEMENT_MASTERY_THRESHOLD =
  exports.placementScoreSchema =
  exports.placementSubmissionSchema =
  exports.placementAnswerSchema =
    void 0;
const zod_1 = require("zod");
// ─── Answer submission ─────────────────────────────────────────────────────
// A single answer to a placement question
exports.placementAnswerSchema = zod_1.z.object({
  questionId: zod_1.z.string().uuid("Invalid question ID"),
  selectedOptionId: zod_1.z.string().min(1).max(10, "Invalid option ID"),
});
// The full submission payload: at least 1 answer required
exports.placementSubmissionSchema = zod_1.z.object({
  answers: zod_1.z.array(exports.placementAnswerSchema).min(1, "At least one answer is required"),
});
// ─── Score result (returned by the server action) ─────────────────────────
exports.placementScoreSchema = zod_1.z.object({
  devScore: zod_1.z.number().int().min(0).max(100),
  cybersecScore: zod_1.z.number().int().min(0).max(100),
  networkScore: zod_1.z.number().int().min(0).max(100),
});
// Threshold above which a category is considered "mastered" → skip waivers granted
exports.PLACEMENT_MASTERY_THRESHOLD = 70;
// Category scores above this threshold get BEGINNER + INTERMEDIATE lessons waived
exports.WAIVED_DIFFICULTIES = ["BEGINNER", "INTERMEDIATE"];
//# sourceMappingURL=placement-test.schema.js.map
