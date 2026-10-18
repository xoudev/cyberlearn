"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { classRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { checkLessonForSave, emDashInField, holdsNoEmDash } from "@cyberlearn/lib/mdx-authoring";
import {
  asTyped,
  describeLessonMdxProblem,
  editorProblemsOf,
  type LessonEditorProblem,
} from "@cyberlearn/lib/mdx-check";

/**
 * A teacher writing a lesson for their own class.
 *
 * The result is an ordinary Lesson row with audience CLASS, so progress, XP,
 * the review schedule and being assigned with a deadline all work on it
 * unchanged. What differs is who may see it, and that is one where clause,
 * defined once in lessonsVisibleTo.
 *
 * Authorisation is the same as everywhere else on this page: it asks whether
 * this account teaches this class, not what role it holds. The web app has no
 * admin gate, and a teacher of one class must not be able to publish into
 * another by knowing its id.
 */

const lessonSchema = z.object({
  classId: z.guid(),
  // Published with the lesson, under the rule its text keeps (authoring.ts).
  title: z.string().trim().min(3).max(200).refine(holdsNoEmDash, emDashInField("Le titre")),
  description: z
    .string()
    .trim()
    .min(10)
    .max(500)
    .refine(holdsNoEmDash, emDashInField("La description")),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: z.coerce.number().int().positive().max(600),
  // Capped well under the catalogue's 10000: a teacher setting their own
  // rewards sits on the same leaderboard as everyone else, and a lesson worth
  // a thousand points would make that ranking meaningless for their class.
  xpReward: z.coerce.number().int().nonnegative().max(200),
  // Trimmed, which is what is checked and stored, and as typed, which is
  // where the editor marks what the check found (asTyped).
  contentMdx: z
    .string()
    .transform((typed) => ({ typed, text: typed.trim() }))
    .pipe(z.object({ typed: z.string(), text: z.string().min(10).max(100_000) })),
});

export interface ClassLessonState {
  error?: string;
  ok?: boolean;
  slug?: string;
  /**
   * What the content check found, each at its line, for the editor to mark:
   * empty once it passed, absent when the form stopped before it.
   */
  problems?: LessonEditorProblem[];
}

/**
 * The content check the console's editors run on save: it renders, and it
 * keeps the catalogue's rules (authoring.ts). Its problems are placed in the
 * text as typed, which the schema trims before checking it.
 */
async function contentRefusal(contentMdx: {
  typed: string;
  text: string;
}): Promise<ClassLessonState | null> {
  const check = asTyped(await checkLessonForSave(contentMdx.text), contentMdx.typed);
  if (check.ok) return null;
  return { error: describeLessonMdxProblem(check), problems: editorProblemsOf(check) };
}

export async function createClassLessonAction(
  _prev: ClassLessonState,
  formData: FormData,
): Promise<ClassLessonState> {
  const user = await requireRequestUser();
  const parsed = lessonSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  if (!(await classRepository.canSetWorkFor(user.id, parsed.data.classId))) {
    return { error: "Tu ne suis pas cette classe." };
  }

  // Refused before it reaches the class: a lesson that does not render is a
  // lesson its students open onto an error. See checkLessonMdx.
  const refusal = await contentRefusal(parsed.data.contentMdx);
  if (refusal !== null) return refusal;

  const { classId, contentMdx, ...lesson } = parsed.data;
  const created = await classRepository.createClassLesson({
    classId,
    authorId: user.id,
    ...lesson,
    contentMdx: contentMdx.text,
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "class.lesson.create",
      targetType: "Lesson",
      targetId: created.id,
      metadata: { classId, title: lesson.title },
    },
  });

  revalidatePath("/my-class");
  // The content passed: the empty list takes down what an earlier save marked.
  return { ok: true, slug: created.slug, problems: [] };
}

const editSchema = lessonSchema.omit({ classId: true }).extend({ lessonId: z.guid() });

export async function updateClassLessonAction(
  _prev: ClassLessonState,
  formData: FormData,
): Promise<ClassLessonState> {
  const user = await requireRequestUser();
  const parsed = editSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  if (!(await classRepository.canEditClassLesson(user.id, parsed.data.lessonId))) {
    return { error: "Cette leçon n'est pas la tienne." };
  }

  const refusal = await contentRefusal(parsed.data.contentMdx);
  if (refusal !== null) return refusal;

  const { lessonId, contentMdx, ...data } = parsed.data;
  await classRepository.updateClassLesson(lessonId, { ...data, contentMdx: contentMdx.text });

  revalidatePath("/my-class");
  return { ok: true, problems: [] };
}

export async function deleteClassLessonAction(lessonId: string): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  if (!z.guid().safeParse(lessonId).success) return { ok: false };
  if (!(await classRepository.canEditClassLesson(user.id, lessonId))) return { ok: false };

  await classRepository.deleteClassLesson(lessonId);
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "class.lesson.delete",
      targetType: "Lesson",
      targetId: lessonId,
      metadata: {},
    },
  });

  revalidatePath("/my-class");
  return { ok: true };
}
