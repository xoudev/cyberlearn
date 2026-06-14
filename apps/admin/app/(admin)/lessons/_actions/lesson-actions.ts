"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import type { ContentStatus } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

const createLessonSchema = z.object({
  refCode: z.string().regex(/^CL-LSN-\d{3}-V\d{2}$/, "Format: CL-LSN-001-V01"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(3)
    .max(100),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(500),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: z.coerce.number().int().positive().max(600),
  xpReward: z.coerce.number().int().nonnegative().max(10000),
  contentMdx: z.string().trim().min(10),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
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
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[field] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const { coverImageUrl, publishNow, ...data } = parsed.data;

  try {
    const lesson = await prisma.lesson.create({
      data: {
        ...data,
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

export async function getNextRefCodeAction(): Promise<{ nextRefCode: string }> {
  await requireAdminAction();

  const last = await prisma.lesson.findFirst({
    orderBy: { refCode: "desc" },
    select: { refCode: true },
  });

  if (!last) return { nextRefCode: "CL-LSN-001-V01" };

  const match = /^CL-LSN-(\d{3})-V\d{2}$/.exec(last.refCode);
  if (!match?.[1]) return { nextRefCode: "CL-LSN-001-V01" };

  const next = parseInt(match[1], 10) + 1;
  return { nextRefCode: `CL-LSN-${String(next).padStart(3, "0")}-V01` };
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function updateLessonStatusAction(
  lessonId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(lessonId).success) return { error: "ID invalide." };
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) return { error: "Statut invalide." };

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
  return {};
}

// ── Bulk status update ────────────────────────────────────────────────────────

const bulkStatusSchema = z.object({
  lessonIds: z.array(z.string().uuid()).min(1).max(500),
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
  return { count: result.count };
}

// ── Delete ──────────────────────────────────────────────────────────────────────

const deleteLessonSchema = z.object({
  lessonId: z.string().uuid(),
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
  return { success: true };
}
