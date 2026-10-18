import crypto from "node:crypto";
import { lessonFileRepository, type LessonFileRow } from "@cyberlearn/db";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import type {
  ImportValidationError,
  LessonFieldChange,
  LessonQuizImpact,
  LessonUpdatePreview,
} from "@cyberlearn/types";
import { diffHunks, diffLines, diffStats } from "@/lib/text-diff";
import { checkLessonFile, type LessonFileMetadata } from "./lesson-file-check";

/**
 * Writing a lesson file over the lesson that holds its refCode: what it
 * would change, shown first, then the write.
 *
 * Two doors lead here: the update from the repository (/lessons/sync), and
 * the import of a file whose refCode is taken (/lessons/import), which used
 * to refuse it. The database is what the site reads, so neither writes what
 * the admin has not seen: the comparison carries a fingerprint of the lesson
 * as shown, and the write is refused if the lesson moved since.
 */

const FIELD_LABELS = {
  title: "Titre",
  description: "Description",
  category: "Domaine",
  difficulty: "Difficulté",
  estimatedMinutes: "Durée (min)",
  xpReward: "XP",
  prerequisites: "Prérequis",
} as const;

type FieldKey = keyof typeof FIELD_LABELS;

/** The part of a lesson a file can change. Slug, status and cover stay the console's. */
export interface LessonFields {
  contentMdx: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  /** refCodes, sorted. */
  prerequisites: string[];
}

/** The fingerprint an update is checked against. */
export function lessonHash(fields: LessonFields): string {
  return crypto.createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

export function normalizeBody(body: string): string {
  return body.replace(/\r\n?/g, "\n").trim();
}

export function fieldsOfRow(row: LessonFileRow): LessonFields {
  return {
    contentMdx: normalizeBody(row.contentMdx),
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimatedMinutes,
    xpReward: row.xpReward,
    prerequisites: row.prerequisites.map((p) => p.prerequisite.refCode).sort(),
  };
}

export function fieldsOfFile(
  metadata: Omit<LessonFileMetadata, "refCode" | "slug" | "coverImageUrl">,
  body: string,
): LessonFields {
  return {
    contentMdx: normalizeBody(body),
    title: metadata.title,
    description: metadata.description,
    category: metadata.category,
    difficulty: metadata.difficulty,
    estimatedMinutes: metadata.estimatedMinutes,
    xpReward: metadata.xpReward,
    prerequisites: [...metadata.prerequisites].sort(),
  };
}

function fieldChanges(before: LessonFields, after: LessonFields): LessonFieldChange[] {
  // SAFETY: the keys of a const object literal, which Object.keys widens to string.
  const keys = Object.keys(FIELD_LABELS) as FieldKey[];
  return keys.flatMap((field) => {
    const b = before[field];
    const a = after[field];
    const bs = Array.isArray(b) ? b.join(", ") : String(b);
    const as = Array.isArray(a) ? a.join(", ") : String(a);
    return bs === as
      ? []
      : [{ field, label: FIELD_LABELS[field], before: bs || "aucun", after: as || "aucun" }];
  });
}

/** Quizzes whose options or answer key the update changes. */
function changedQuizzes(before: string, after: string): Map<string, LessonQuizImpact["change"]> {
  const next = new Map(extractLessonQuizzes(after).map((q) => [q.id, q]));
  const out = new Map<string, LessonQuizImpact["change"]>();
  for (const q of extractLessonQuizzes(before)) {
    const n = next.get(q.id);
    if (!n) out.set(q.id, "removed");
    else if (n.correct !== q.correct || JSON.stringify(n.options) !== JSON.stringify(q.options)) {
      out.set(q.id, "modified");
    }
  }
  return out;
}

/** What the comparison needs to know of a lesson besides its row. */
export interface LessonUpdateContext {
  /** Answers already recorded, per quiz id. Empty for a lesson nobody answered. */
  answers: ReadonlyMap<string, number>;
  /** Last edit in the console since the lesson last came from a file. */
  editedInConsoleAt: Date | null;
}

/** A file, as compared: its slug (never written) and the fields it would write. */
export interface LessonFileFields {
  slug: string;
  fields: LessonFields;
}

/**
 * What writing the file over the lesson would change. Pure: the database's
 * part comes in `context`, read once for a whole page of lessons.
 */
export function compareLesson(
  row: LessonFileRow,
  file: LessonFileFields,
  context: LessonUpdateContext,
): LessonUpdatePreview {
  const before = fieldsOfRow(row);
  const after = file.fields;
  const { added, removed } = diffStats(diffLines(before.contentMdx, after.contentMdx));
  // Reading a lesson's quizzes parses its MDX, twice: only worth it where
  // somebody answered one. On 189 changed lessons, parsing them all took most
  // of a ten-second page load.
  const quizImpacts: LessonQuizImpact[] = [];
  if (context.answers.size > 0) {
    for (const [quizId, change] of changedQuizzes(before.contentMdx, after.contentMdx)) {
      const answers = context.answers.get(quizId) ?? 0;
      if (answers > 0) quizImpacts.push({ quizId, answers, change });
    }
  }
  return {
    lessonId: row.id,
    refCode: row.refCode,
    title: row.title,
    status: row.status,
    hash: lessonHash(before),
    fields: fieldChanges(before, after),
    hunks: diffHunks(before.contentMdx, after.contentMdx, 2),
    added,
    removed,
    quizImpacts,
    editedInConsoleAt: context.editedInConsoleAt,
    slugDiffers: row.slug === file.slug ? null : { database: row.slug, file: file.slug },
  };
}

/** The comparison for one lesson, reading what it needs: the import's. */
export async function previewLessonUpdate(
  row: LessonFileRow,
  file: LessonFileFields,
): Promise<LessonUpdatePreview> {
  const [counts, edits] = await Promise.all([
    lessonFileRepository.quizAnswerCounts([row.id]),
    lessonFileRepository.consoleEditsSinceFile([row.id]),
  ]);
  return compareLesson(row, file, {
    answers: new Map(counts.map((c) => [c.quizId, c.answers])),
    editedInConsoleAt: edits.get(row.id) ?? null,
  });
}

/** Where the file comes from: the repository, or a file dropped on the import page. */
export type LessonFileSource =
  | { kind: "repository"; file: string }
  | { kind: "import"; file: string };

export type ApplyResult =
  | { ok: true; lessonId: string }
  | {
      ok: false;
      reason: "unavailable" | "not_found" | "stale" | "invalid" | "prerequisite";
      message: string;
      errors?: ImportValidationError[];
    };

/** How each door words a refusal: the sync page reloads, the import page validates again. */
const REFUSALS = {
  repository: {
    invalid: (file: string) => `${file} ne passe pas les contrôles de l'import.`,
    notFound: (refCode: string) => `${refCode} n'est pas en base : importe-la d'abord.`,
    stale:
      "La leçon a changé depuis l'affichage. Recharge la page pour voir les différences à jour.",
    moved: "La leçon a été modifiée pendant la mise à jour. Recharge la page.",
  },
  import: {
    invalid: (file: string) => `${file} ne passe pas les contrôles de l'import.`,
    notFound: (refCode: string) =>
      `${refCode} n'est plus en base : valide de nouveau le lot pour l'importer.`,
    stale:
      "La leçon a changé depuis la validation. Valide de nouveau le lot pour voir les différences à jour.",
    moved: "La leçon a été modifiée pendant la mise à jour. Valide de nouveau le lot.",
  },
} as const;

/**
 * Writes a lesson file over the lesson that holds its refCode, after the same
 * checks as an import.
 *
 * `expectedHash` is the fingerprint the admin saw: if the lesson changed
 * since (an edit in another tab), nothing is written. The write itself is
 * conditioned on the row's updatedAt, in the same statement, so an edit
 * landing between the check and the write cannot be overwritten either.
 */
export async function applyLessonContentUpdate(
  content: string,
  expectedHash: string,
  actorId: string,
  source: LessonFileSource,
): Promise<ApplyResult> {
  const words = REFUSALS[source.kind];
  const check = await checkLessonFile(content);
  if (!check.ok) {
    return {
      ok: false,
      reason: "invalid",
      message: words.invalid(source.file),
      errors: check.errors,
    };
  }

  const m = check.metadata;
  const row = await lessonFileRepository.findByRefCode(m.refCode);
  if (!row) return { ok: false, reason: "not_found", message: words.notFound(m.refCode) };
  if (lessonHash(fieldsOfRow(row)) !== expectedHash) {
    return { ok: false, reason: "stale", message: words.stale };
  }

  const prereqs = await lessonFileRepository.findByRefCodesForLinks(m.prerequisites);
  const missing = m.prerequisites.filter((r) => !prereqs.some((p) => p.refCode === r));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: "prerequisite",
      message: `Prérequis absent de la base : ${missing.join(", ")}. Importe-le d'abord.`,
    };
  }

  const body = normalizeBody(check.body);
  const contentHash = crypto.createHash("sha256").update(body).digest("hex");
  const written = await lessonFileRepository.writeFromFile({
    lessonId: row.id,
    expectedUpdatedAt: row.updatedAt,
    fields: {
      contentMdx: body,
      title: m.title,
      description: m.description,
      category: m.category,
      difficulty: m.difficulty,
      estimatedMinutes: m.estimatedMinutes,
      xpReward: m.xpReward,
    },
    prerequisiteIds: prereqs.map((p) => p.id),
    audit:
      source.kind === "repository"
        ? {
            actorId,
            action: "lesson.sync",
            metadata: { refCode: m.refCode, file: source.file, contentHash },
          }
        : {
            actorId,
            action: "lesson.import.update",
            metadata: { refCode: m.refCode, file: source.file, contentHash, source: "import" },
          },
  });
  if (!written) return { ok: false, reason: "stale", message: words.moved };
  return { ok: true, lessonId: row.id };
}
