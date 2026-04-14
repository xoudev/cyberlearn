import { z } from "zod";
export declare const placementAnswerSchema: z.ZodObject<
  {
    questionId: z.ZodString;
    selectedOptionId: z.ZodString;
  },
  "strip",
  z.ZodTypeAny,
  {
    questionId: string;
    selectedOptionId: string;
  },
  {
    questionId: string;
    selectedOptionId: string;
  }
>;
export type PlacementAnswer = z.infer<typeof placementAnswerSchema>;
export declare const placementSubmissionSchema: z.ZodObject<
  {
    answers: z.ZodArray<
      z.ZodObject<
        {
          questionId: z.ZodString;
          selectedOptionId: z.ZodString;
        },
        "strip",
        z.ZodTypeAny,
        {
          questionId: string;
          selectedOptionId: string;
        },
        {
          questionId: string;
          selectedOptionId: string;
        }
      >,
      "many"
    >;
  },
  "strip",
  z.ZodTypeAny,
  {
    answers: {
      questionId: string;
      selectedOptionId: string;
    }[];
  },
  {
    answers: {
      questionId: string;
      selectedOptionId: string;
    }[];
  }
>;
export type PlacementSubmission = z.infer<typeof placementSubmissionSchema>;
export declare const placementScoreSchema: z.ZodObject<
  {
    devScore: z.ZodNumber;
    cybersecScore: z.ZodNumber;
    networkScore: z.ZodNumber;
  },
  "strip",
  z.ZodTypeAny,
  {
    devScore: number;
    cybersecScore: number;
    networkScore: number;
  },
  {
    devScore: number;
    cybersecScore: number;
    networkScore: number;
  }
>;
export type PlacementScore = z.infer<typeof placementScoreSchema>;
export declare const PLACEMENT_MASTERY_THRESHOLD: 70;
export declare const WAIVED_DIFFICULTIES: readonly ["BEGINNER", "INTERMEDIATE"];
//# sourceMappingURL=placement-test.schema.d.ts.map
