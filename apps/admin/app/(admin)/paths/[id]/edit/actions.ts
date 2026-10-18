"use server";

import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { pathRepository, prisma } from "@cyberlearn/db";
import { pathRefCodeSchema, UPLOADED_COVER_PREFIX } from "@cyberlearn/types";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { requireAdminAction } from "@/lib/auth";
import { withSavedNotice } from "@/lib/saved-notice";
import { readPathLessonIds } from "../../_actions/lesson-ids";

const updatePathSchema = z.object({
  refCode: pathRefCodeSchema,
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(3)
    .max(100),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(1000),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  // Orthogonal to category: what the path is for, not what it covers.
  track: z.enum(["SKILL", "CAREER"]).default("SKILL"),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedHours: z.coerce.number().int().positive().max(500),
  // The upload field's marker, as on a lesson; a URL pasted before it existed.
  coverImageUrl: z
    .union([z.url(), z.string().startsWith(UPLOADED_COVER_PREFIX)])
    .optional()
    .or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

/**
 * How long the save may hold its transaction. replaceLessons writes the path's
 * lessons one row after the other, and a path holds up to MAX_PATH_LESSONS of
 * them: Linux has 90, Réseaux 92. Prisma's default of 5 s can run out on the
 * remote database before the last row, and the whole save is then lost. The
 * sync runs the same loop and allows itself two minutes (path-sync.ts). Not
 * exported: a "use server" module exports its actions only.
 */
const SAVE_PATH_TIMEOUT_MS = 60_000;

export interface UpdatePathState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

export async function updatePathAction(
  id: string,
  _prev: UpdatePathState,
  formData: FormData,
): Promise<UpdatePathState> {
  // Bound by the page, but sent back by the browser like any other argument.
  if (!z.guid().safeParse(id).success) notFound();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updatePathSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: UpdatePathState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
      fieldErrors[field] = errs[0];
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }

  const lessonIds = readPathLessonIds(formData);
  if (!lessonIds.ok) return { error: lessonIds.error, fieldErrors: { lessonIds: lessonIds.error } };
  const orderedLessonIds = lessonIds.ids;

  const [admin, existing] = await Promise.all([
    requireAdminAction(),
    prisma.path.findUnique({
      where: { id },
      select: { id: true, refCode: true, slug: true, status: true, publishedAt: true },
    }),
  ]);
  if (!existing) notFound();

  const { coverImageUrl, status, ...data } = parsed.data;

  const refCodeChanged = data.refCode !== existing.refCode;
  const slugChanged = data.slug !== existing.slug;

  if (refCodeChanged || slugChanged) {
    const [refConflict, slugConflict] = await Promise.all([
      refCodeChanged
        ? prisma.path.findFirst({
            where: { refCode: data.refCode, NOT: { id } },
            select: { id: true },
          })
        : Promise.resolve(null),
      slugChanged
        ? prisma.path.findFirst({
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
    await prisma.$transaction(
      async (tx) => {
        await tx.path.update({
          where: { id },
          data: {
            ...data,
            coverImageUrl: coverImageUrl !== "" ? (coverImageUrl ?? null) : null,
            status,
            publishedAt,
          },
        });
        // Not a delete and a recreate: that dropped every lesson's module and
        // flag, so one save emptied the modules the sync had filled.
        await pathRepository.replaceLessons(id, orderedLessonIds, tx);
        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "path.update",
            targetType: "Path",
            targetId: id,
            metadata: { title: data.title, status, lessonCount: orderedLessonIds.length },
          },
        });
      },
      { timeout: SAVE_PATH_TIMEOUT_MS },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    if (msg.includes("Unique constraint") && msg.includes("refCode"))
      return { error: "Ce refCode existe déjà.", fieldErrors: { refCode: "Déjà utilisé" } };
    if (msg.includes("Unique constraint") && msg.includes("slug"))
      return { error: "Ce slug existe déjà.", fieldErrors: { slug: "Déjà utilisé" } };
    logger.error({ scope: "admin", err: errorMessage(e) }, "path update failed");
    return { error: "Erreur lors de la mise à jour." };
  }

  redirect(withSavedNotice("/paths"));
}
