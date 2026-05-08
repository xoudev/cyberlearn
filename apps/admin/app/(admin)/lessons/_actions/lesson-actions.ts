"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
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
