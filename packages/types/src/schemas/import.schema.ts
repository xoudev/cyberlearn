import { z } from "zod";
import { lessonRefCodeSchema } from "./ref-code.schema.js";

export const importLessonMetadataSchema = z.object({
  refCode: lessonRefCodeSchema,
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug: lettres minuscules, chiffres et tirets uniquement")
    .min(3)
    .max(100),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(500),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: z.number().int().positive().max(600),
  xpReward: z.number().int().nonnegative().max(10000),
  coverImageUrl: z.url().nullable().optional(),
  prerequisites: z.array(lessonRefCodeSchema).default([]),
});

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
