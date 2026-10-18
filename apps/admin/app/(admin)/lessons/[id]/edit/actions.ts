"use server";

import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@cyberlearn/db";
import { lessonRefCodeSchema, UPLOADED_COVER_PREFIX } from "@cyberlearn/types";
import { requireAdminAction } from "@/lib/auth";
import { withSavedNotice } from "@/lib/saved-notice";
import { LESSON_LIMITS, LESSON_SLUG, LESSON_SLUG_HINT } from "@/lib/lesson-limits";
import { checkLessonForSave, emDashInField, holdsNoEmDash } from "@cyberlearn/lib/mdx-authoring";
import {
  asTyped,
  describeLessonMdxProblem,
  editorProblemsOf,
  type LessonEditorProblem,
} from "@cyberlearn/lib/mdx-check";

const updateLessonSchema = z.object({
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
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export interface UpdateLessonState {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /**
   * What the content check found, each at its line, for the editor to mark:
   * empty once it passed, absent when the form stopped before it.
   */
  problems?: LessonEditorProblem[];
}

export async function updateLessonAction(
  id: string,
  _prev: UpdateLessonState,
  formData: FormData,
): Promise<UpdateLessonState> {
  // Bound by the page, but sent back by the browser like any other argument.
  if (!z.guid().safeParse(id).success) notFound();

  const raw = Object.fromEntries(formData.entries());
  const parsed = updateLessonSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: UpdateLessonState["fieldErrors"] = {};
    for (const [field, errs] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
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
  // opened it (Sentry JAVASCRIPT-NEXTJS-14 and -15). The catalogue's rules,
  // which CI applied to content/ alone, are applied here too (authoring.ts).
  const { coverImageUrl, status, contentMdx, ...data } = parsed.data;
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
      return {
        error: "Ce refCode existe déjà.",
        fieldErrors: { refCode: "Déjà utilisé" },
        problems: [],
      };
    if (slugConflict)
      return { error: "Ce slug existe déjà.", fieldErrors: { slug: "Déjà utilisé" }, problems: [] };
  }

  const publishedAt =
    status === "PUBLISHED" && existing.status !== "PUBLISHED" ? new Date() : existing.publishedAt;

  try {
    await prisma.$transaction([
      prisma.lesson.update({
        where: { id },
        data: {
          ...data,
          contentMdx: contentMdx.text,
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
      return {
        error: "Ce refCode existe déjà.",
        fieldErrors: { refCode: "Déjà utilisé" },
        problems: [],
      };
    if (msg.includes("Unique constraint") && msg.includes("slug"))
      return { error: "Ce slug existe déjà.", fieldErrors: { slug: "Déjà utilisé" }, problems: [] };
    return { error: "Erreur lors de la mise à jour.", problems: [] };
  }

  redirect(withSavedNotice("/lessons"));
}
