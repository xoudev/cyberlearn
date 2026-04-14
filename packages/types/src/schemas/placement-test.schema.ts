import { z } from "zod";

// ─── Answer submission ─────────────────────────────────────────────────────

// A single answer to a placement question
export const placementAnswerSchema = z.object({
  questionId: z.string().uuid("Invalid question ID"),
  selectedOptionId: z.string().min(1).max(10, "Invalid option ID"),
});

export type PlacementAnswer = z.infer<typeof placementAnswerSchema>;

// The full submission payload: at least 1 answer required
export const placementSubmissionSchema = z.object({
  answers: z.array(placementAnswerSchema).min(1, "At least one answer is required"),
});

export type PlacementSubmission = z.infer<typeof placementSubmissionSchema>;

// ─── Score result (returned by the server action) ─────────────────────────

export const placementScoreSchema = z.object({
  devScore: z.number().int().min(0).max(100),
  cybersecScore: z.number().int().min(0).max(100),
  networkScore: z.number().int().min(0).max(100),
});

export type PlacementScore = z.infer<typeof placementScoreSchema>;

// Threshold above which a category is considered "mastered" → skip waivers granted
export const PLACEMENT_MASTERY_THRESHOLD = 70 as const;

// Category scores above this threshold get BEGINNER + INTERMEDIATE lessons waived
export const WAIVED_DIFFICULTIES = ["BEGINNER", "INTERMEDIATE"] as const;
