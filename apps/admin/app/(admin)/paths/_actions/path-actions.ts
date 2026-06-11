"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import type { ContentStatus } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

const createPathSchema = z.object({
  refCode: z.string().regex(/^CL-PATH-\d{3}-V\d{2}$/, "Format: CL-PATH-001-V01"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(3)
    .max(100),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(1000),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedHours: z.coerce.number().int().positive().max(500),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  publishNow: z.coerce.boolean().optional(),
});

export interface CreatePathState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export async function createPathAction(
  _prev: CreatePathState,
  formData: FormData,
): Promise<CreatePathState> {
  const admin = await requireAdminAction();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createPathSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: CreatePathState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[field] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const { coverImageUrl, publishNow, ...data } = parsed.data;

  // Parse ordered lesson IDs from the hidden JSON input; cap at 500 to prevent oversized transactions
  const lessonIdsRaw = formData.get("lessonIds");
  let orderedLessonIds: string[] = [];
  if (typeof lessonIdsRaw === "string" && lessonIdsRaw.length > 2) {
    try {
      // SAFETY: JSON.parse returns any; validated as string array below
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(lessonIdsRaw);
      if (Array.isArray(parsed)) {
        orderedLessonIds = (parsed as unknown[])
          .filter((v): v is string => typeof v === "string")
          .slice(0, 500);
      }
    } catch {
      /* ignore parse errors */
    }
  }

  try {
    const path = await prisma.path.create({
      data: {
        ...data,
        coverImageUrl: coverImageUrl !== "" ? (coverImageUrl ?? null) : null,
        status: publishNow ? "PUBLISHED" : "DRAFT",
        publishedAt: publishNow ? new Date() : null,
        ...(orderedLessonIds.length > 0
          ? {
              lessons: {
                create: orderedLessonIds.map((lessonId, position) => ({
                  lessonId,
                  position,
                  isRequired: true,
                })),
              },
            }
          : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "path.create",
        targetType: "Path",
        targetId: path.id,
        metadata: { title: path.title, status: path.status, lessonCount: orderedLessonIds.length },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint") && msg.includes("refCode")) {
      return { error: "Ce refCode existe déjà.", fieldErrors: { refCode: "Déjà utilisé" } };
    }
    if (msg.includes("Unique constraint") && msg.includes("slug")) {
      return { error: "Ce slug existe déjà.", fieldErrors: { slug: "Déjà utilisé" } };
    }
    return { error: "Erreur lors de la création." };
  }

  redirect("/paths");
}

// ── Update status ─────────────────────────────────────────────────────────────

export async function updatePathStatusAction(
  pathId: string,
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(pathId).success) return { error: "ID invalide." };
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) return { error: "Statut invalide." };

  const [admin, path] = await Promise.all([
    requireAdminAction(),
    prisma.path.findUnique({
      where: { id: pathId },
      select: { id: true, status: true },
    }),
  ]);
  if (!path) return { error: "Parcours introuvable." };

  const updateData: { status: ContentStatus; publishedAt?: Date } = { status };
  if (status === "PUBLISHED") updateData.publishedAt = new Date();

  await prisma.$transaction([
    prisma.path.update({ where: { id: pathId }, data: updateData }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "path.status",
        targetType: "Path",
        targetId: pathId,
        metadata: { from: path.status, to: status },
      },
    }),
  ]);

  revalidatePath("/paths");
  return {};
}

// ── Delete ──────────────────────────────────────────────────────────────────────

export interface DeletePathState {
  error?: string;
  success?: boolean;
}

export async function deletePathAction(
  _prev: DeletePathState,
  formData: FormData,
): Promise<DeletePathState> {
  const admin = await requireAdminAction();

  const pathId = formData.get("pathId");
  if (typeof pathId !== "string" || !pathId) return { error: "Identifiant invalide." };
  const parsed = z.string().uuid().safeParse(pathId);
  if (!parsed.success) return { error: "Identifiant invalide." };

  const path = await prisma.path.findUnique({
    where: { id: parsed.data },
    select: { id: true, title: true, status: true },
  });

  if (!path) return { error: "Parcours introuvable." };
  if (path.status === "PUBLISHED") {
    return { error: "Impossible de supprimer un parcours publié. Archivez-le d'abord." };
  }

  try {
    await prisma.path.delete({ where: { id: parsed.data } });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "path.delete",
        targetType: "Path",
        targetId: parsed.data,
        metadata: { title: path.title, status: path.status },
      },
    });
  } catch {
    return { error: "Une erreur est survenue lors de la suppression." };
  }

  revalidatePath("/paths");
  return { success: true };
}
