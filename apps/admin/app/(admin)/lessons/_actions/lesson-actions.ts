"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import type { ContentStatus } from "@cyberlearn/db";
import { lessonRefCodeSchema, UPLOADED_COVER_PREFIX } from "@cyberlearn/types";
import { requireAdminAction } from "@/lib/auth";
import { LESSON_LIMITS, LESSON_SLUG, LESSON_SLUG_HINT } from "@/lib/lesson-limits";
import { nextLessonRefCode } from "@/lib/next-ref-code";
import { checkLessonForSave, emDashInField, holdsNoEmDash } from "@cyberlearn/lib/mdx-authoring";
import {
  asTyped,
  describeLessonMdxProblem,
  editorProblemsOf,
  type LessonEditorProblem,
} from "@cyberlearn/lib/mdx-check";

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

  try {
    const lesson = await prisma.lesson.create({
      data: {
        ...data,
        contentMdx: contentMdx.text,
        coverImageUrl: coverImageUrl !== "" ? (coverImageUrl ?? null) : null,
        authorId: admin.id,
        status: publishNow ? "PUBLISHED" : "DRAFT",
        publishedAt: publishNow ? new Date() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "lesson.create",
        targetType: "Lesson",
        targetId: lesson.id,
        metadata: { title: lesson.title, status: lesson.status },
      },
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

  redirect("/lessons");
}

// ── Next refCode ──────────────────────────────────────────────────────────────

/**
 * Proposes a refCode for the new-lesson form. Every lesson code is read, not
 * just the last one in string order: see nextLessonRefCode for why.
 */
export async function getNextRefCodeAction(): Promise<{ nextRefCode: string }> {
  await requireAdminAction();

  const lessons = await prisma.lesson.findMany({
    where: { refCode: { startsWith: "CL-LSN-" } },
    select: { refCode: true },
  });
  return { nextRefCode: nextLessonRefCode(lessons.map((lesson) => lesson.refCode)) };
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
    prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, status: true },
    }),
  ]);
  if (!lesson) return { error: "Leçon introuvable." };

  const updateData: { status: ContentStatus; publishedAt?: Date } = { status };
  if (status === "PUBLISHED") updateData.publishedAt = new Date();

  await prisma.$transaction([
    prisma.lesson.update({ where: { id: lessonId }, data: updateData }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "lesson.status",
        targetType: "Lesson",
        targetId: lessonId,
        metadata: { from: lesson.status, to: status },
      },
    }),
  ]);

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

  const updateData: { status: ContentStatus; publishedAt?: Date } = { status: parsed.data.status };
  if (parsed.data.status === "PUBLISHED") updateData.publishedAt = new Date();

  const [result] = await prisma.$transaction([
    prisma.lesson.updateMany({
      where: { id: { in: parsed.data.lessonIds } },
      data: updateData,
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "lesson.status.bulk",
        targetType: "Lesson",
        targetId: parsed.data.lessonIds[0] ?? null,
        metadata: { to: parsed.data.status, count: parsed.data.lessonIds.length },
      },
    }),
  ]);

  revalidatePath("/lessons");
  revalidatePath("/lessons/archives");
  return { count: result.count };
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

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      status: true,
      _count: { select: { pathLessons: true } },
    },
  });

  if (!lesson) return { error: "Leçon introuvable." };
  if (lesson.status === "PUBLISHED") {
    return { error: "Impossible de supprimer une leçon publiée. Archivez-la d'abord." };
  }
  if (lesson._count.pathLessons > 0) {
    return { error: "Suppression bloquée : cette leçon appartient à un ou plusieurs parcours." };
  }

  try {
    await prisma.lesson.delete({ where: { id: lessonId } });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "lesson.delete",
        targetType: "Lesson",
        targetId: lessonId,
        metadata: { title: lesson.title, status: lesson.status },
      },
    });
  } catch {
    return { error: "Une erreur est survenue lors de la suppression." };
  }

  revalidatePath("/lessons");
  revalidatePath("/lessons/archives");
  return { success: true };
}
