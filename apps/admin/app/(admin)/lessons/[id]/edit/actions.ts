"use server";

import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { UPLOADED_COVER_PREFIX } from "@cyberlearn/types";
import { requireAdminAction } from "@/lib/auth";
import { checkLessonMdx, describeLessonMdxProblem } from "@cyberlearn/lib/mdx-check";

const updateLessonSchema = z.object({
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
  coverImageUrl: z
    .union([z.string().url(), z.string().startsWith(UPLOADED_COVER_PREFIX)])
    .optional()
    .or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export interface UpdateLessonState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export async function updateLessonAction(
  id: string,
  _prev: UpdateLessonState,
  formData: FormData,
): Promise<UpdateLessonState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = updateLessonSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: UpdateLessonState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      fieldErrors[field] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const [admin, existing] = await Promise.all([
    requireAdminAction(),
    prisma.lesson.findUnique({
      where: { id },
      select: { id: true, refCode: true, slug: true, status: true, publishedAt: true },
    }),
  ]);
  if (!existing) notFound();

  // Refused before it reaches the database. The editor used to save anything,
  // and on 22 September two saves in a row broke a lesson for everyone who
  // opened it (Sentry JAVASCRIPT-NEXTJS-14 and -15).
  const render = await checkLessonMdx(parsed.data.contentMdx);
  if (!render.ok) {
    return {
      error: "Le contenu ne s'affiche pas.",
      fieldErrors: { contentMdx: describeLessonMdxProblem(render) },
    };
  }

  const { coverImageUrl, status, ...data } = parsed.data;

  const refCodeChanged = data.refCode !== existing.refCode;
  const slugChanged = data.slug !== existing.slug;

  if (refCodeChanged || slugChanged) {
    const [refConflict, slugConflict] = await Promise.all([
      refCodeChanged
        ? prisma.lesson.findFirst({
            where: { refCode: data.refCode, NOT: { id } },
            select: { id: true },
          })
        : Promise.resolve(null),
      slugChanged
        ? prisma.lesson.findFirst({
            where: { slug: data.slug, NOT: { id } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    if (refConflict)
      return { error: "Ce refCode existe déjà.", fieldErrors: { refCode: "Déjà utilisé" } };
    if (slugConflict)
      return { error: "Ce slug existe déjà.", fieldErrors: { slug: "Déjà utilisé" } };
  }

  const publishedAt =
    status === "PUBLISHED" && existing.status !== "PUBLISHED" ? new Date() : existing.publishedAt;

  try {
    await prisma.$transaction([
      prisma.lesson.update({
        where: { id },
        data: {
          ...data,
          coverImageUrl: coverImageUrl !== "" ? (coverImageUrl ?? null) : null,
          status,
          publishedAt,
        },
      }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "lesson.update",
          targetType: "Lesson",
          targetId: id,
          metadata: { title: data.title, status },
        },
      }),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    if (msg.includes("Unique constraint") && msg.includes("refCode"))
      return { error: "Ce refCode existe déjà.", fieldErrors: { refCode: "Déjà utilisé" } };
    if (msg.includes("Unique constraint") && msg.includes("slug"))
      return { error: "Ce slug existe déjà.", fieldErrors: { slug: "Déjà utilisé" } };
    return { error: "Erreur lors de la mise à jour." };
  }

  redirect("/lessons");
}
