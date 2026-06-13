"use server";

import crypto from "node:crypto";
import matter from "gray-matter";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth";
import { prisma } from "@cyberlearn/db";
import type { ImportValidationResult } from "@cyberlearn/types";
import {
  validateMdxContent,
  importValidatedLesson,
  orderBatchByPrerequisites,
} from "@/lib/services/lesson-import.service";

export type ImportActionResult =
  | { status: "success"; lessonId: string; warnings: string[] }
  | { status: "validation_error"; result: ImportValidationResult }
  | { status: "rate_limited" }
  | { status: "forbidden" };

// ── Batch types ────────────────────────────────────────────────────────────────

export interface BatchFileInput {
  name: string;
  content: string;
}

export interface BatchValidateItem {
  name: string;
  result: ImportValidationResult;
}

export type BatchFileOutcome =
  | { name: string; status: "success"; lessonId: string; warnings: string[] }
  | { name: string; status: "validation_error"; result: ImportValidationResult }
  | { name: string; status: "skipped"; reason: string };

export type BatchImportResult =
  | { status: "done"; outcomes: BatchFileOutcome[] }
  | { status: "rate_limited"; remaining: number }
  | { status: "invalid_input"; message: string };

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
// Per-lesson budget per hour: raised to 250 for the initial bulk content load
// (16 paths / ~192 lessons). Lower back toward 30 once the catalog is seeded to
// keep capping runaway automation on an admin-only surface.
const RATE_MAX = 250;
const BATCH_MAX_FILES = 30;
// Aggregate cap, mirrored client-side: stays under the server-action body
// size limit configured in next.config.ts so oversized batches fail with a
// readable error instead of a transport-level one.
const BATCH_MAX_TOTAL_BYTES = 4 * 1024 * 1024;

async function importsRemaining(adminId: string): Promise<number> {
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  // Only SUCCESSFUL imports consume budget: counting refusals or rejections
  // would let a failing batch (or the refusal write itself) burn the hourly
  // budget and self-extend the lockout.
  const count = await prisma.auditLog.count({
    where: {
      actorId: adminId,
      action: "lesson.import.success",
      createdAt: { gte: since },
    },
  });
  return Math.max(0, RATE_MAX - count);
}

const fileContentSchema = z.string().max(512 * 1024, "Fichier trop grand (max 500 Ko)");
const batchInputSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(200),
      content: fileContentSchema,
    }),
  )
  .min(1)
  .max(BATCH_MAX_FILES)
  .refine((arr) => new Set(arr.map((f) => f.name)).size === arr.length, {
    message: "Noms de fichiers en double dans le lot",
  })
  .refine((arr) => arr.reduce((sum, f) => sum + f.content.length, 0) <= BATCH_MAX_TOTAL_BYTES, {
    message: "Lot trop volumineux (max 4 Mo au total)",
  });

/**
 * Best-effort refCode extraction for batch awareness (duplicates, intra-batch
 * prerequisites, ordering). Files whose frontmatter does not parse simply
 * contribute nothing here; the real per-file validation reports their errors.
 */
function peekBatchMeta(files: { name: string; content: string }[]): {
  refCode: string | null;
  slug: string | null;
  prerequisites: string[];
}[] {
  return files.map((f) => {
    try {
      const data: unknown = matter(f.content).data;
      const obj = (data ?? {}) as Record<string, unknown>;
      const prereqRaw = obj.prerequisites;
      return {
        refCode: typeof obj.refCode === "string" ? obj.refCode : null,
        slug: typeof obj.slug === "string" ? obj.slug : null,
        prerequisites: Array.isArray(prereqRaw)
          ? prereqRaw.filter((p): p is string => typeof p === "string")
          : [],
      };
    } catch {
      return { refCode: null, slug: null, prerequisites: [] };
    }
  });
}

/** Errors for refCodes/slugs declared by more than one file of the batch. */
function intraBatchDuplicateErrors(
  index: number,
  metas: { refCode: string | null; slug: string | null }[],
): ImportValidationResult["errors"] {
  const errors: ImportValidationResult["errors"] = [];
  const me = metas[index];
  if (!me) return errors;
  for (let i = 0; i < metas.length; i++) {
    if (i === index) continue;
    const other = metas[i];
    if (!other) continue;
    if (me.refCode !== null && other.refCode === me.refCode) {
      errors.push({
        field: "refCode",
        message: `Doublon dans le lot: un autre fichier déclare le refCode ${me.refCode}`,
      });
      break;
    }
  }
  for (let i = 0; i < metas.length; i++) {
    if (i === index) continue;
    const other = metas[i];
    if (!other) continue;
    if (me.slug !== null && other.slug === me.slug) {
      errors.push({
        field: "slug",
        message: `Doublon dans le lot: un autre fichier déclare le slug ${me.slug}`,
      });
      break;
    }
  }
  return errors;
}

async function writeAuditLog(
  actorId: string,
  action: string,
  targetId: string | undefined,
  metadata: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType: "lesson",
      targetId: targetId ?? null,
      metadata: metadata as object,
    },
  });
}

/** Validates the MDX content and returns the result without persisting. */
export async function validateImportAction(fileContent: string): Promise<ImportValidationResult> {
  await requireAdminAction();

  const fileSizeSchema = z.string().max(512 * 1024, "Fichier trop grand (max 500 Ko)");
  const sizeCheck = fileSizeSchema.safeParse(fileContent);
  if (!sizeCheck.success) {
    return {
      valid: false,
      errors: [{ message: sizeCheck.error.issues[0]?.message ?? "Fichier invalide." }],
      warnings: [],
    };
  }

  return validateMdxContent(fileContent);
}

/** Validates + imports a lesson into the DB as DRAFT. */
export async function importLessonAction(fileContent: string): Promise<ImportActionResult> {
  const admin = await requireAdminAction();

  // Size check
  const fileSizeSchema = z.string().max(512 * 1024, "Fichier trop grand (max 500 Ko)");
  if (!fileSizeSchema.safeParse(fileContent).success) {
    return {
      status: "validation_error",
      result: {
        valid: false,
        errors: [{ message: "Fichier trop grand (max 500 Ko)" }],
        warnings: [],
      },
    };
  }

  // Rate limiting
  const allowed = (await importsRemaining(admin.id)) > 0;
  if (!allowed) {
    await writeAuditLog(admin.id, "lesson.import.rate_limited", undefined, {});
    return { status: "rate_limited" };
  }

  // Full validation pipeline
  const validationResult = await validateMdxContent(fileContent);
  const contentHash = crypto.createHash("sha256").update(fileContent).digest("hex");

  if (!validationResult.valid || !validationResult.metadata || !validationResult.body) {
    await writeAuditLog(admin.id, "lesson.import.rejected", undefined, {
      contentHash,
      errorCount: validationResult.errors.length,
      firstError: validationResult.errors[0]?.message ?? "unknown",
    });
    return { status: "validation_error", result: validationResult };
  }

  // Import
  const { lessonId, refCode } = await importValidatedLesson(
    validationResult.metadata,
    validationResult.body,
    admin.id,
  );

  await writeAuditLog(admin.id, "lesson.import.success", lessonId, {
    refCode,
    contentHash,
  });

  return { status: "success", lessonId, warnings: validationResult.warnings };
}

// ── Batch actions ──────────────────────────────────────────────────────────────

/**
 * Validates a whole batch without persisting anything. Batch-aware: flags
 * intra-batch refCode/slug duplicates as errors, and downgrades "prerequisite
 * not in database" to a warning when a sibling file provides it.
 */
export async function validateImportBatchAction(
  files: BatchFileInput[],
): Promise<BatchValidateItem[] | { status: "invalid_input"; message: string }> {
  await requireAdminAction();

  const parsed = batchInputSchema.safeParse(files);
  if (!parsed.success) {
    return {
      status: "invalid_input",
      message:
        parsed.error.issues[0]?.message ?? `Lot invalide (max ${String(BATCH_MAX_FILES)} fichiers)`,
    };
  }

  const metas = peekBatchMeta(parsed.data);
  const results: BatchValidateItem[] = [];
  for (let i = 0; i < parsed.data.length; i++) {
    const file = parsed.data[i];
    if (!file) continue;
    const peerRefCodes = metas
      .filter((_, j) => j !== i)
      .map((m) => m.refCode)
      .filter((r): r is string => r !== null);
    const result = await validateMdxContent(file.content, { peerRefCodes });
    const duplicates = intraBatchDuplicateErrors(i, metas);
    if (duplicates.length > 0) {
      results.push({
        name: file.name,
        result: {
          ...result,
          valid: false,
          errors: [...result.errors, ...duplicates],
        },
      });
    } else {
      results.push({ name: file.name, result });
    }
  }

  // A prerequisite downgraded to "provided by the batch" only holds if the
  // providing sibling is itself importable: escalate back to an error when
  // the provider failed validation (its import will never happen, so the
  // dependent's import is guaranteed to fail too).
  const validityByRefCode = new Map<string, boolean>();
  for (let i = 0; i < results.length; i++) {
    const refCode = metas[i]?.refCode;
    if (refCode !== null && refCode !== undefined) {
      validityByRefCode.set(refCode, results[i]?.result.valid === true);
    }
  }
  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const meta = metas[i];
    if (!item || !meta || !item.result.valid) continue;
    // Only escalate prerequisites the database does NOT satisfy: those carry
    // the "fourni par le lot" warning. A prerequisite that exists in the DB
    // is fine even if a sibling re-declares it and fails.
    const brokenProviders = meta.prerequisites.filter(
      (p) =>
        validityByRefCode.get(p) === false &&
        item.result.warnings.some((w) => w.includes(p) && w.includes("fourni par le lot")),
    );
    if (brokenProviders.length === 0) continue;
    item.result = {
      ...item.result,
      valid: false,
      warnings: item.result.warnings.filter((w) => !brokenProviders.some((p) => w.includes(p))),
      errors: [
        ...item.result.errors,
        ...brokenProviders.map((p) => ({
          field: "prerequisites",
          message: `Prérequis ${p} fourni par un fichier du lot en erreur: import impossible`,
        })),
      ],
    };
  }
  return results;
}

/**
 * Imports a batch as DRAFT lessons, ordered so intra-batch prerequisites land
 * before their dependents, continuing on per-file failures. Every file is
 * revalidated right before its own import (by then its batch prerequisites
 * are genuinely in the database).
 */
export async function importLessonBatchAction(files: BatchFileInput[]): Promise<BatchImportResult> {
  const admin = await requireAdminAction();

  const parsed = batchInputSchema.safeParse(files);
  if (!parsed.success) {
    return {
      status: "invalid_input",
      message:
        parsed.error.issues[0]?.message ?? `Lot invalide (max ${String(BATCH_MAX_FILES)} fichiers)`,
    };
  }

  const remaining = await importsRemaining(admin.id);
  if (parsed.data.length > remaining) {
    await writeAuditLog(admin.id, "lesson.import.rate_limited", undefined, {
      requested: parsed.data.length,
      remaining,
    });
    return { status: "rate_limited", remaining };
  }

  const metas = peekBatchMeta(parsed.data);
  const items = parsed.data.map((f, i) => ({
    id: f.name,
    refCode: metas[i]?.refCode ?? `__no_refcode_${String(i)}`,
    prerequisites: metas[i]?.prerequisites ?? [],
  }));
  const { ordered, cyclic } = orderBatchByPrerequisites(items);

  const byName = new Map(parsed.data.map((f) => [f.name, f]));
  const outcomes: BatchFileOutcome[] = [];

  for (const name of cyclic) {
    outcomes.push({
      name,
      status: "validation_error",
      result: {
        valid: false,
        errors: [
          {
            field: "prerequisites",
            message:
              "Cycle de prérequis dans le lot (ou dépendance bloquée par un cycle): import impossible",
          },
        ],
        warnings: [],
      },
    });
  }

  let aborted = false;
  for (const name of ordered) {
    const file = byName.get(name);
    if (!file) continue;
    if (aborted) {
      outcomes.push({
        name,
        status: "skipped",
        reason: "Non traité: limite d'import atteinte en cours de lot",
      });
      continue;
    }
    const duplicates = intraBatchDuplicateErrors(parsed.data.indexOf(file), metas);
    if (duplicates.length > 0) {
      outcomes.push({
        name,
        status: "validation_error",
        result: { valid: false, errors: duplicates, warnings: [] },
      });
      continue;
    }
    const single = await importLessonAction(file.content);
    if (single.status === "success") {
      outcomes.push({
        name,
        status: "success",
        lessonId: single.lessonId,
        warnings: single.warnings,
      });
    } else if (single.status === "validation_error") {
      outcomes.push({ name, status: "validation_error", result: single.result });
    } else {
      // Concurrent budget consumption (another tab) tripped the per-file
      // check mid-batch: stop importing, report the rest untouched.
      aborted = true;
      outcomes.push({
        name,
        status: "skipped",
        reason: "Non traité: limite d'import atteinte en cours de lot",
      });
    }
  }

  // Restore the caller's file order for display.
  const orderIndex = new Map(parsed.data.map((f, i) => [f.name, i]));
  outcomes.sort((a, b) => (orderIndex.get(a.name) ?? 0) - (orderIndex.get(b.name) ?? 0));
  return { status: "done", outcomes };
}
