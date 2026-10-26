"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditLogRepository, lessonRepository, pathRepository } from "@cyberlearn/db";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";
import { lessonRefCodeSchema, UPLOADED_COVER_PREFIX } from "@cyberlearn/types";
import { requireAdminAction } from "@/lib/auth";
import { withSavedNotice } from "@/lib/saved-notice";
import { LESSON_LIMITS, LESSON_SLUG, LESSON_SLUG_HINT } from "@/lib/lesson-limits";
import { lessonRefCodeFor, nextLessonRefCode, nextPathLessonNumber } from "@/lib/next-ref-code";
import { checkLessonForSave, emDashInField, holdsNoEmDash } from "@cyberlearn/lib/mdx-authoring";
import {
  asTyped,
  describeLessonMdxProblem,
  editorProblemsOf,
  type LessonEditorProblem,
} from "@cyberlearn/lib/mdx-check";
import { readLessonLinks } from "./lesson-links";

const createLessonSchema = z.object({
  refCode: lessonRefCodeSchema,
  slug: z
    .string()
    .regex(LESSON_SLUG, LESSON_SLUG_HINT)
    .min(LESSON_LIMITS.slugMin)
    .max(LESSON_LIMITS.slugMax),
  title: z
    .string()
    .trim()
    .min(LESSON_LIMITS.titleMin)
    .max(LESSON_LIMITS.titleMax)
    .refine(holdsNoEmDash, emDashInField("Le titre")),
  description: z
    .string()
    .trim()
    .min(LESSON_LIMITS.descriptionMin)
    .max(LESSON_LIMITS.descriptionMax)
    .refine(holdsNoEmDash, emDashInField("La description")),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: z.coerce.number().int().positive().max(LESSON_LIMITS.minutesMax),
  xpReward: z.coerce.number().int().nonnegative().max(LESSON_LIMITS.xpMax),
  // Trimmed, which is what is checked and stored, and as typed, which is
  // where the editor marks what the check found (asTyped).
  contentMdx: z
    .string()
    .transform((typed) => ({ typed, text: typed.trim() }))
    .pipe(z.object({ typed: z.string(), text: z.string().min(10) })),
  coverImageUrl: z
    .union([z.url(), z.string().startsWith(UPLOADED_COVER_PREFIX)])
    .optional()
    .or(z.literal("")),
  publishNow: z.coerce.boolean().optional(),
});

export interface CreateLessonState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /**
   * What the content check found, each at its line, for the editor to mark:
   * empty once it passed, absent when the form stopped before it.
   */
  problems?: LessonEditorProblem[];
}

export async function createLessonAction(
  _prev: CreateLessonState,
  formData: FormData,
): Promise<CreateLessonState> {
  const admin = await requireAdminAction();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createLessonSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: CreateLessonState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
      fieldErrors[field] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const { coverImageUrl, publishNow, contentMdx, ...data } = parsed.data;

  // Refused before it reaches the database: see checkLessonMdx and authoring.ts.
  const render = asTyped(await checkLessonForSave(contentMdx.text), contentMdx.typed);
  if (!render.ok) {
    return {
      error:
        render.kind === undefined ? "Le contenu ne s'affiche pas." : "Le contenu est à corriger.",
      fieldErrors: { contentMdx: describeLessonMdxProblem(render) },
      problems: editorProblemsOf(render),
    };
  }
  // From here the content passed: a refusal says so with an empty list, which
  // takes down what the editor marked from an earlier save.

  const links = readLessonLinks(formData);
  if (!links.ok) {
    return { error: links.error, fieldErrors: { [links.field]: links.error }, problems: [] };
  }
  const { pathIds, prerequisiteIds } = links.links;

  // The console creates catalogue lessons, so only catalogue paths and
  // prerequisites: a class's would promise the lesson to people who cannot
  // open it, or close it to everyone outside that class.
  const [paths, prerequisites] = await Promise.all([
    pathRepository.findCatalogueRefCodes(pathIds),
    lessonRepository.findCatalogueIds(prerequisiteIds),
  ]);
  if (paths.length !== pathIds.length) {
    const error = "Un des parcours choisis n'existe plus.";
    return { error, fieldErrors: { pathIds: error }, problems: [] };
  }
  if (prerequisites.length !== prerequisiteIds.length) {
    const error = "Une des leçons choisies comme prérequis n'existe plus.";
    return { error, fieldErrors: { prerequisiteIds: error }, problems: [] };
  }
  const pathRefCode = new Map(paths.map((path) => [path.id, path.refCode]));

  let createdId: string;
  try {
    // The lesson, its paths, its prerequisites and its `lesson.create` row,
    // in one transaction.
    createdId = await lessonRepository.createFromConsole({
      fields: {
        ...data,
        contentMdx: contentMdx.text,
        coverImageUrl: coverImageUrl !== "" ? (coverImageUrl ?? null) : null,
      },
      publish: publishNow === true,
      actorId: admin.id,
      paths: pathIds.map((id) => ({ id, refCode: pathRefCode.get(id) ?? id })),
      prerequisiteIds,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    if (msg.includes("Unique constraint") && msg.includes("refCode")) {
      return {
        error: "Ce refCode existe déjà.",
        fieldErrors: { refCode: "Déjà utilisé" },
        problems: [],
      };
    }
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { error: "Ce slug existe déjà.", fieldErrors: { slug: "Déjà utilisé" }, problems: [] };
    }
    return { error: "Erreur lors de la création.", problems: [] };
  }

  // Into its studio: a lesson is created to be written, and the list said
  // nothing of where it had gone.
  redirect(withSavedNotice(`/lessons/${createdId}`, "created"));
}

// ── Next refCode ──────────────────────────────────────────────────────────────

/**
 * Proposes a refCode for the new-lesson form. Every lesson code is read, not
 * just the last one in string order: see nextLessonRefCode for why.
 *
 * With the first path chosen for the lesson, the code is that path's: its PP,
 * and the rank the lesson will take at the end of it, recaps not counted
 * (nextPathLessonNumber, lessonRefCodeFor). Without one, or for a path that
 * gives no PP, the next code of the catalogue.
 */
export async function getNextRefCodeAction(
  pathId?: string | null,
): Promise<{ nextRefCode: string }> {
  await requireAdminAction();

  const path = z.guid().safeParse(pathId);
  const [taken, firstPath] = await Promise.all([
    lessonRepository.findLessonRefCodes(),
    path.success ? pathRepository.findLessonRefCodes(path.data) : Promise.resolve(null),
  ]);
  // Appended at the end: every lesson of the path comes before it.
  const fromPath = firstPath
    ? lessonRefCodeFor(
        firstPath.refCode,
        nextPathLessonNumber(firstPath.refCode, firstPath.lessonRefCodes),
        taken,
      )
    : null;
  return { nextRefCode: fromPath ?? nextLessonRefCode(taken) };
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function updateLessonStatusAction(
  lessonId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
): Promise<{ error?: string }> {
  if (!z.guid().safeParse(lessonId).success) return { error: "ID invalide." };
  if (!z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).safeParse(status).success) {
    return { error: "Statut invalide." };
  }

  const [admin, lesson] = await Promise.all([
    requireAdminAction(),
    lessonRepository.findStatus(lessonId),
  ]);
  if (!lesson) return { error: "Leçon introuvable." };

  // The status and its `lesson.status` row, in one transaction.
  await lessonRepository.changeStatus({
    lessonId,
    from: lesson.status,
    to: status,
    actorId: admin.id,
  });

  revalidatePath("/lessons");
  revalidatePath("/lessons/archives");
  return {};
}

// ── Bulk status update ────────────────────────────────────────────────────────

const bulkStatusSchema = z.object({
  lessonIds: z.array(z.guid()).min(1).max(500),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export interface BulkStatusState {
  error?: string;
  count?: number;
}

/**
 * Applies a single status to many lessons at once (bulk publish/draft/archive
 * from the lessons list). Mirrors updateLessonStatusAction but for a selection.
 */
export async function bulkUpdateLessonStatusAction(
  lessonIds: string[],
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
): Promise<BulkStatusState> {
  const parsed = bulkStatusSchema.safeParse({ lessonIds, status });
  if (!parsed.success) return { error: "Sélection ou statut invalide." };

  const admin = await requireAdminAction();

  const count = await lessonRepository.changeStatuses({
    lessonIds: parsed.data.lessonIds,
    to: parsed.data.status,
    actorId: admin.id,
  });

  revalidatePath("/lessons");
  revalidatePath("/lessons/archives");
  return { count };
}

// ── Delete ──────────────────────────────────────────────────────────────────────

const deleteLessonSchema = z.object({
  lessonId: z.guid(),
});

export interface DeleteLessonState {
  error?: string;
  success?: boolean;
}

export async function deleteLessonAction(
  _prev: DeleteLessonState,
  formData: FormData,
): Promise<DeleteLessonState> {
  const admin = await requireAdminAction();

  const parsed = deleteLessonSchema.safeParse({ lessonId: formData.get("lessonId") });
  if (!parsed.success) return { error: "Identifiant invalide." };

  const { lessonId } = parsed.data;

  const lesson = await lessonRepository.findForDeletion(lessonId);

  if (!lesson) return { error: "Leçon introuvable." };
  if (lesson.status === "PUBLISHED") {
    return { error: "Impossible de supprimer une leçon publiée. Archivez-la d'abord." };
  }
  if (lesson.pathCount > 0) {
    return { error: "Suppression bloquée : cette leçon appartient à un ou plusieurs parcours." };
  }

  try {
    await lessonRepository.delete(lessonId);

    await auditLogRepository.record({
      actorId: admin.id,
      action: AUDIT_ACTION.lesson.delete,
      targetType: "Lesson",
      targetId: lessonId,
      metadata: { title: lesson.title, status: lesson.status },
    });
  } catch {
    return { error: "Une erreur est survenue lors de la suppression." };
  }

  revalidatePath("/lessons");
  revalidatePath("/lessons/archives");
  return { success: true };
}
