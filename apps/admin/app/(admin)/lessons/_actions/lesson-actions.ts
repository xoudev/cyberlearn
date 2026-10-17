"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lessonRepository, pathRepository, prisma } from "@cyberlearn/db";
import type { ContentStatus } from "@cyberlearn/db";
import { lessonRefCodeSchema, UPLOADED_COVER_PREFIX } from "@cyberlearn/types";
import { requireAdminAction } from "@/lib/auth";
import { LESSON_LIMITS, LESSON_SLUG, LESSON_SLUG_HINT } from "@/lib/lesson-limits";
import { lessonRefCodeFor, nextLessonRefCode } from "@/lib/next-ref-code";
import { checkLessonMdx, describeLessonMdxProblem } from "@cyberlearn/lib/mdx-check";
import { readLessonLinks } from "./lesson-links";

const createLessonSchema = z.object({
  refCode: lessonRefCodeSchema,
  slug: z
    .string()
    .regex(LESSON_SLUG, LESSON_SLUG_HINT)
    .min(LESSON_LIMITS.slugMin)
    .max(LESSON_LIMITS.slugMax),
  title: z.string().trim().min(LESSON_LIMITS.titleMin).max(LESSON_LIMITS.titleMax),
  description: z
    .string()
    .trim()
    .min(LESSON_LIMITS.descriptionMin)
    .max(LESSON_LIMITS.descriptionMax),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: z.coerce.number().int().positive().max(LESSON_LIMITS.minutesMax),
  xpReward: z.coerce.number().int().nonnegative().max(LESSON_LIMITS.xpMax),
  contentMdx: z.string().trim().min(10),
  coverImageUrl: z
    .union([z.url(), z.string().startsWith(UPLOADED_COVER_PREFIX)])
    .optional()
    .or(z.literal("")),
  publishNow: z.coerce.boolean().optional(),
});

export interface CreateLessonState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
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

  // Refused before it reaches the database: see checkLessonMdx.
  const render = await checkLessonMdx(parsed.data.contentMdx);
  if (!render.ok) {
    return {
      error: "Le contenu ne s'affiche pas.",
      fieldErrors: { contentMdx: describeLessonMdxProblem(render) },
    };
  }

  const links = readLessonLinks(formData);
  if (!links.ok) return { error: links.error, fieldErrors: { [links.field]: links.error } };
  const { pathIds, prerequisiteIds } = links.links;

  // The console creates catalogue lessons, so only catalogue paths and
  // prerequisites: a class's would promise the lesson to people who cannot
  // open it, or close it to everyone outside that class.
  const [paths, prerequisites] = await Promise.all([
    pathIds.length === 0
      ? Promise.resolve([])
      : prisma.path.findMany({
          where: { id: { in: pathIds }, audience: "CATALOGUE" },
          select: { id: true, refCode: true },
        }),
    prerequisiteIds.length === 0
      ? Promise.resolve([])
      : prisma.lesson.findMany({
          where: { id: { in: prerequisiteIds }, audience: "CATALOGUE" },
          select: { id: true },
        }),
  ]);
  if (paths.length !== pathIds.length) {
    const error = "Un des parcours choisis n'existe plus.";
    return { error, fieldErrors: { pathIds: error } };
  }
  if (prerequisites.length !== prerequisiteIds.length) {
    const error = "Une des leçons choisies comme prérequis n'existe plus.";
    return { error, fieldErrors: { prerequisiteIds: error } };
  }
  const pathRefCode = new Map(paths.map((path) => [path.id, path.refCode]));

  const { coverImageUrl, publishNow, ...data } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: {
          ...data,
          coverImageUrl: coverImageUrl !== "" ? (coverImageUrl ?? null) : null,
          authorId: admin.id,
          status: publishNow ? "PUBLISHED" : "DRAFT",
          publishedAt: publishNow ? new Date() : null,
        },
      });

      // In the order chosen: each path takes the lesson at its end.
      for (const pathId of pathIds) await pathRepository.attachLesson(pathId, lesson.id, tx);
      await lessonRepository.replacePrerequisites(lesson.id, prerequisiteIds, tx);

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "lesson.create",
          targetType: "Lesson",
          targetId: lesson.id,
          metadata: {
            title: lesson.title,
            status: lesson.status,
            paths: pathIds.map((pathId) => pathRefCode.get(pathId) ?? pathId),
            prerequisites: prerequisiteIds.length,
          },
        },
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    if (msg.includes("Unique constraint") && msg.includes("refCode")) {
      return { error: "Ce refCode existe déjà.", fieldErrors: { refCode: "Déjà utilisé" } };
    }
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { error: "Ce slug existe déjà.", fieldErrors: { slug: "Déjà utilisé" } };
    }
    return { error: "Erreur lors de la création." };
  }

  redirect("/lessons");
}

// ── Next refCode ──────────────────────────────────────────────────────────────

/**
 * Proposes a refCode for the new-lesson form. Every lesson code is read, not
 * just the last one in string order: see nextLessonRefCode for why.
 *
 * With the first path chosen for the lesson, the code is that path's: its PP,
 * and the place the lesson will take at the end of it (lessonRefCodeFor).
 * Without one, or for a path that gives no PP, the next code of the catalogue.
 */
export async function getNextRefCodeAction(
  pathId?: string | null,
): Promise<{ nextRefCode: string }> {
  await requireAdminAction();

  const path = z.guid().safeParse(pathId);
  const [lessons, firstPath] = await Promise.all([
    prisma.lesson.findMany({
      where: { refCode: { startsWith: "CL-LSN-" } },
      select: { refCode: true },
    }),
    path.success
      ? prisma.path.findUnique({
          where: { id: path.data },
          select: { refCode: true, _count: { select: { lessons: true } } },
        })
      : Promise.resolve(null),
  ]);
  const taken = lessons.map((lesson) => lesson.refCode);
  const fromPath = firstPath
    ? lessonRefCodeFor(firstPath.refCode, firstPath._count.lessons + 1, taken)
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
