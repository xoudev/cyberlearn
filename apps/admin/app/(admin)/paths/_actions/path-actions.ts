"use server";

import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

export type CreatePathState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

export async function createPathAction(
  _prev: CreatePathState,
  formData: FormData,
): Promise<CreatePathState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const jwtRole = user.app_metadata?.["user_role"] as string | undefined;
  let role = jwtRole;
  if (!role) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    role = dbUser?.role ?? undefined;
  }
  if (role !== "ADMIN") notFound();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createPathSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: CreatePathState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[field] = errs?.[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const { coverImageUrl, publishNow, ...data } = parsed.data;

  // Parse ordered lesson IDs from the hidden JSON input
  const lessonIdsRaw = formData.get("lessonIds");
  let orderedLessonIds: string[] = [];
  if (typeof lessonIdsRaw === "string" && lessonIdsRaw.length > 2) {
    try {
      // SAFETY: JSON.parse returns any; validated as string array below
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(lessonIdsRaw);
      if (Array.isArray(parsed)) {
        orderedLessonIds = (parsed as unknown[]).filter((v): v is string => typeof v === "string");
      }
    } catch {
      /* ignore parse errors */
    }
  }

  try {
    const path = await prisma.path.create({
      data: {
        ...data,
        coverImageUrl: coverImageUrl || null,
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
        actorId: user.id,
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

// ── Delete ──────────────────────────────────────────────────────────────────────

export type DeletePathState = {
  error?: string;
  success?: boolean;
};

export async function deletePathAction(
  _prev: DeletePathState,
  formData: FormData,
): Promise<DeletePathState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const jwtRole = user.app_metadata?.["user_role"] as string | undefined;
  let role = jwtRole;
  if (!role) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
    role = dbUser?.role ?? undefined;
  }
  if (role !== "ADMIN") notFound();

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
        actorId: user.id,
        action: "path.delete",
        targetType: "Path",
        targetId: parsed.data,
        metadata: { title: path.title, status: path.status },
      },
    });
  } catch (e) {
    return {
      error: `Erreur lors de la suppression : ${e instanceof Error ? e.message : "inconnue"}`,
    };
  }

  revalidatePath("/paths");
  return { success: true };
}
