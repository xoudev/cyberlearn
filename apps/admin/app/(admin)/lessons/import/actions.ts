"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { requireAdminAction } from "@/lib/auth";
import { prisma } from "@cyberlearn/db";
import type { ImportValidationResult } from "@cyberlearn/types";
import { validateMdxContent, importValidatedLesson } from "@/lib/services/lesson-import.service";

export type ImportActionResult =
  | { status: "success"; lessonId: string; warnings: string[] }
  | { status: "validation_error"; result: ImportValidationResult }
  | { status: "rate_limited" }
  | { status: "forbidden" };

const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 10;

async function checkRateLimit(adminId: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const count = await prisma.auditLog.count({
    where: {
      actorId: adminId,
      action: { startsWith: "lesson.import" },
      createdAt: { gte: since },
    },
  });
  return count < RATE_MAX;
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
  const allowed = await checkRateLimit(admin.id);
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
