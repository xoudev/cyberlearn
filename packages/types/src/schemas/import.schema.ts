import { z } from "zod";
import { authoredEnum } from "./authored-enum.js";
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
  category: authoredEnum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: authoredEnum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: z.number().int().positive().max(600),
  xpReward: z.number().int().nonnegative().max(10000),
  coverImageUrl: z.url().nullable().optional(),
  prerequisites: z.array(lessonRefCodeSchema).default([]),
});

export type ImportLessonMetadata = z.infer<typeof importLessonMetadataSchema>;

export interface ImportValidationError {
  field?: string;
  /**
   * 1-based line in the file, when the problem has a place. The message says
   * it too: this one is for the editor, which puts its cursor there.
   */
  line?: number;
  /** 1-based column on that line. */
  column?: number;
  message: string;
}

/** One line of a line diff: kept, taken out of the old text, or new in it. */
export type LessonDiffLine =
  | { kind: "same"; text: string; before: number; after: number }
  | { kind: "removed"; text: string; before: number }
  | { kind: "added"; text: string; after: number };

export interface LessonDiffHunk {
  /** 1-based first line of the hunk in the old and new text. */
  beforeStart: number;
  afterStart: number;
  lines: LessonDiffLine[];
}

/** A field of a lesson that a file changes, as shown: its label, then and now. */
export interface LessonFieldChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

/** A quiz of the lesson, already answered, that the file changes or takes out. */
export interface LessonQuizImpact {
  quizId: string;
  /** Answers already recorded, which were given to the old version. */
  answers: number;
  change: "modified" | "removed";
}

/**
 * What writing a file over the lesson that holds its refCode would change.
 * Shown before anything is written: the database is what the site reads, so
 * nothing in it is replaced unseen.
 */
export interface LessonUpdatePreview {
  lessonId: string;
  refCode: string;
  title: string;
  status: string;
  /** Fingerprint of the lesson as shown: the update is refused if it moved since. */
  hash: string;
  fields: LessonFieldChange[];
  hunks: LessonDiffHunk[];
  added: number;
  removed: number;
  quizImpacts: LessonQuizImpact[];
  /** Last edit in the console since the lesson last came from a file, if any. */
  editedInConsoleAt: Date | null;
  /** The slug is never changed by an update: links to the lesson would break. */
  slugDiffers: { database: string; file: string } | null;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: ImportValidationError[];
  warnings: string[];
  metadata?: ImportLessonMetadata;
  body?: string;
  /**
   * Set when a lesson already holds the file's refCode: the file can update
   * that lesson, once its differences are shown, and never creates another.
   */
  update?: LessonUpdatePreview;
}
