import { z } from "zod";
export declare const importLessonMetadataSchema: z.ZodObject<
  {
    refCode: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["DEV", "CYBERSEC", "NETWORK"]>;
    difficulty: z.ZodEnum<["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]>;
    estimatedMinutes: z.ZodNumber;
    xpReward: z.ZodNumber;
    coverImageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
  },
  "strip",
  z.ZodTypeAny,
  {
    refCode: string;
    slug: string;
    title: string;
    description: string;
    category: "DEV" | "CYBERSEC" | "NETWORK";
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
    estimatedMinutes: number;
    xpReward: number;
    prerequisites: string[];
    coverImageUrl?: string | null | undefined;
  },
  {
    refCode: string;
    slug: string;
    title: string;
    description: string;
    category: "DEV" | "CYBERSEC" | "NETWORK";
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
    estimatedMinutes: number;
    xpReward: number;
    coverImageUrl?: string | null | undefined;
    prerequisites?: string[] | undefined;
  }
>;
export type ImportLessonMetadata = z.infer<typeof importLessonMetadataSchema>;
export interface ImportValidationError {
  field?: string;
  line?: number;
  message: string;
}
export interface ImportValidationResult {
  valid: boolean;
  errors: ImportValidationError[];
  warnings: string[];
  metadata?: ImportLessonMetadata;
  body?: string;
}
//# sourceMappingURL=import.schema.d.ts.map
