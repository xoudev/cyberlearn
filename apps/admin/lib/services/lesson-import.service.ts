import crypto from "node:crypto";
import type { ImportValidationResult, ImportValidationError } from "@cyberlearn/types";
import { lessonFileRepository, type Prisma } from "@cyberlearn/db";
import { checkLessonFile } from "./lesson-file-check";
import {
  fieldsOfFile,
  prerequisiteLoop,
  prerequisiteLoopMessage,
  previewLessonUpdate,
} from "./lesson-update.service";

/** Batch awareness for multi-file imports. */
export interface BatchValidationContext {
  /** refCodes declared by the OTHER files of the same batch. */
  peerRefCodes: readonly string[];
}

/**
 * Four-layer validation pipeline for MDX lesson import: the file's own
 * checks (checkLessonFile), then
 *
 * Layer 4 - Business rules: a slug another lesson has, prerequisites exist,
 *           and for a lesson already in the database, none leads back to it
 *
 * A refCode already in the database is not a refusal: the file can update
 * that lesson, and the result carries what it would change (`update`) for the
 * admin to see before anything is written. The update keeps the lesson's
 * slug, so only a new lesson needs its slug free.
 *
 * With a batch context, a prerequisite that is missing from the database but
 * declared by a sibling file downgrades to a warning: the batch import orders
 * files topologically, so the sibling lands first.
 */
export async function validateMdxContent(
  fileContent: string,
  batch?: BatchValidationContext,
): Promise<ImportValidationResult> {
  const file = await checkLessonFile(fileContent);
  if (!file.ok) return { valid: false, errors: file.errors, warnings: file.warnings };
  const { metadata, body } = file;
  const errors: ImportValidationError[] = [];
  const warnings = [...file.warnings];

  // ── Layer 4: Business validation ─────────────────────────────────────────
  const [existing, slugOwner] = await Promise.all([
    lessonFileRepository.findByRefCode(metadata.refCode),
    lessonFileRepository.findIdBySlug(metadata.slug),
  ]);

  if (existing === null && slugOwner !== null) {
    errors.push({
      field: "slug",
      message: `Conflit: une leçon avec ce slug existe déjà (ID: ${slugOwner})`,
    });
  }

  const prereqLessons =
    metadata.prerequisites.length > 0
      ? await lessonFileRepository.findByRefCodesForLinks(metadata.prerequisites)
      : [];
  if (metadata.prerequisites.length > 0) {
    const foundRefCodes = new Set(prereqLessons.map((l) => l.refCode));
    const peerRefCodes = new Set(batch?.peerRefCodes ?? []);
    for (const prereq of metadata.prerequisites) {
      if (foundRefCodes.has(prereq)) continue;
      if (peerRefCodes.has(prereq)) {
        warnings.push(
          `Prérequis ${prereq} absent de la base mais fourni par le lot (il sera importé avant)`,
        );
        continue;
      }
      errors.push({
        field: "prerequisites",
        message: `Prerequis introuvable: ${prereq}`,
      });
    }
  }

  // A lesson already in the database can be required by others: its new
  // prerequisites must not lead back to it. A new lesson cannot close a loop
  // with the database, nothing in it requires a lesson it does not hold.
  if (existing !== null && errors.length === 0) {
    const loop = await prerequisiteLoop(
      existing.id,
      prereqLessons.map((l) => l.id),
    );
    if (loop !== null) {
      errors.push({ field: "prerequisites", message: prerequisiteLoopMessage(loop) });
    }
  }

  if (errors.length > 0) return { valid: false, errors, warnings };

  if (existing !== null) {
    const update = await previewLessonUpdate(existing, {
      slug: metadata.slug,
      fields: fieldsOfFile(metadata, body),
    });
    return { valid: true, errors: [], warnings, metadata, body, update };
  }

  return { valid: true, errors: [], warnings, metadata, body };
}

export interface ImportResult {
  lessonId: string;
  refCode: string;
  contentHash: string;
}

/**
 * Atomically imports a validated MDX lesson into the database: the lesson in
 * DRAFT status, its prerequisite links, its first version and its
 * `lesson.import.success` audit row, in one transaction
 * (lessonFileRepository.createFromFile). `auditMetadata` is what that row
 * says of where the file came from.
 */
export async function importValidatedLesson(
  metadata: Awaited<ReturnType<typeof validateMdxContent>>["metadata"] & NonNullable<unknown>,
  body: string,
  authorId: string,
  // Prisma's JSON input type: what the audit row's column takes.
  auditMetadata: Prisma.InputJsonObject,
): Promise<ImportResult> {
  const contentHash = crypto.createHash("sha256").update(body).digest("hex");

  const lesson = await lessonFileRepository.createFromFile({
    fields: {
      refCode: metadata.refCode,
      slug: metadata.slug,
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      difficulty: metadata.difficulty,
      estimatedMinutes: metadata.estimatedMinutes,
      xpReward: metadata.xpReward,
      coverImageUrl: metadata.coverImageUrl ?? null,
      contentMdx: body,
    },
    actorId: authorId,
    prerequisiteRefCodes: metadata.prerequisites,
    auditMetadata,
  });

  return { lessonId: lesson.lessonId, refCode: lesson.refCode, contentHash };
}

// ── Batch ordering ────────────────────────────────────────────────────────────

export interface BatchOrderItem {
  /** Stable identifier of the file inside the batch (e.g. its name). */
  id: string;
  refCode: string;
  prerequisites: readonly string[];
}

export interface BatchOrderResult {
  /** Item ids in a prerequisite-safe import order (dependencies first). */
  ordered: string[];
  /** Item ids stuck in a prerequisite cycle inside the batch. */
  cyclic: string[];
}

/**
 * Orders a batch so that any file whose prerequisites are provided by sibling
 * files imports AFTER them (Kahn's algorithm on the intra-batch edges only;
 * prerequisites already in the database are irrelevant to the ordering).
 * Files stuck behind an intra-batch prerequisite cycle (members of the cycle
 * AND their dependents) are reported in `cyclic` instead of ordered.
 *
 * Precondition: refCodes are unique across items. Callers must reject
 * intra-batch duplicates beforehand (last declarer wins in the edge map).
 */
export function orderBatchByPrerequisites(items: readonly BatchOrderItem[]): BatchOrderResult {
  const byRefCode = new Map(items.map((it) => [it.refCode, it]));
  const indegree = new Map<string, number>(items.map((it) => [it.id, 0]));
  const dependents = new Map<string, string[]>(items.map((it) => [it.id, []]));

  for (const item of items) {
    for (const prereq of item.prerequisites) {
      const provider = byRefCode.get(prereq);
      if (provider === undefined || provider.id === item.id) continue;
      indegree.set(item.id, (indegree.get(item.id) ?? 0) + 1);
      dependents.get(provider.id)?.push(item.id);
    }
  }

  const queue = items.filter((it) => (indegree.get(it.id) ?? 0) === 0).map((it) => it.id);
  const ordered: string[] = [];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    ordered.push(id);
    for (const dep of dependents.get(id) ?? []) {
      const next = (indegree.get(dep) ?? 0) - 1;
      indegree.set(dep, next);
      if (next === 0) queue.push(dep);
    }
  }

  const orderedSet = new Set(ordered);
  const cyclic = items.filter((it) => !orderedSet.has(it.id)).map((it) => it.id);
  return { ordered, cyclic };
}
