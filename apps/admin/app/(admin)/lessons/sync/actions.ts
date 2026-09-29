"use server";

import { z } from "zod";
import { lessonRefCodeSchema, pathRefCodeSchema } from "@cyberlearn/types";
import { requireAdminAction } from "@/lib/auth";
import { applyLessonUpdate } from "@/lib/services/lesson-sync.service";
import {
  importLessonFromRepository,
  publishCatalogueDrafts,
  syncPathFromRepository,
  syncQuizFromRepository,
} from "@/lib/services/repository-import.service";

const inputSchema = z.object({
  refCode: lessonRefCodeSchema,
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type SyncActionResult = { ok: true } | { ok: false; message: string; details: string[] };

/**
 * Updates one lesson from its file in the repository.
 *
 * Only the refCode and the fingerprint the admin saw come from the browser:
 * the content is read from the repository on the server, never sent. No
 * revalidation here: "update all" calls this once per lesson, and the page
 * refreshes itself once at the end rather than rebuilding every diff each time.
 */
export async function updateLessonFromRepositoryAction(input: {
  refCode: string;
  hash: string;
}): Promise<SyncActionResult> {
  const admin = await requireAdminAction();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Demande invalide.", details: [] };

  const result = await applyLessonUpdate(parsed.data.refCode, parsed.data.hash, admin.id);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      details: (result.errors ?? []).map((e) =>
        e.field ? `${e.field} : ${e.message}` : e.message,
      ),
    };
  }
  return { ok: true };
}

const importSchema = z.object({ refCode: lessonRefCodeSchema });

/**
 * Imports, as DRAFT, the lesson a repository file declares. The browser sends
 * a refCode and nothing else: the file is read on the server. "Import all"
 * calls this once per lesson, in prerequisite order.
 */
export async function importLessonFromRepositoryAction(input: {
  refCode: string;
}): Promise<SyncActionResult> {
  const admin = await requireAdminAction();
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Demande invalide.", details: [] };

  const result = await importLessonFromRepository(parsed.data.refCode, admin.id);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      details: (result.errors ?? []).map((e) =>
        e.field ? `${e.field} : ${e.message}` : e.message,
      ),
    };
  }
  return { ok: true };
}

const pathSchema = z.object({ refCode: pathRefCodeSchema });

/** Writes one path of content/paths, its modules and its lesson links. */
export async function syncPathFromRepositoryAction(input: {
  refCode: string;
}): Promise<SyncActionResult> {
  const admin = await requireAdminAction();
  const parsed = pathSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Demande invalide.", details: [] };

  const result = await syncPathFromRepository(parsed.data.refCode, admin.id);
  if (!result.ok) return { ok: false, message: result.message, details: result.details };
  return { ok: true };
}

// The slug rule of a path manifest: the file content/quizzes/<slug>.json.
const quizSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(3)
    .max(100),
});

/** Writes one path's final exam from content/quizzes/<slug>.json. */
export async function syncQuizFromRepositoryAction(input: {
  slug: string;
}): Promise<SyncActionResult> {
  const admin = await requireAdminAction();
  const parsed = quizSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Demande invalide.", details: [] };

  const result = await syncQuizFromRepository(parsed.data.slug, admin.id);
  if (!result.ok) return { ok: false, message: result.message, details: result.details };
  return { ok: true };
}

/**
 * Publishes the catalogue's drafts: the lessons and paths content/paths lists.
 * Nothing comes from the browser; the server reads the manifests again.
 */
export async function publishCatalogueFromRepositoryAction(): Promise<{
  lessons: number;
  paths: number;
}> {
  const admin = await requireAdminAction();
  return publishCatalogueDrafts(admin.id);
}
