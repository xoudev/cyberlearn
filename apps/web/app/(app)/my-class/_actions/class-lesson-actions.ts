"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { classRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

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
  classId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(500),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: z.coerce.number().int().positive().max(600),
  // Capped well under the catalogue's 10000: a teacher setting their own
  // rewards sits on the same leaderboard as everyone else, and a lesson worth
  // a thousand points would make that ranking meaningless for their class.
  xpReward: z.coerce.number().int().nonnegative().max(200),
  contentMdx: z.string().trim().min(10).max(100_000),
});

export interface ClassLessonState {
  error?: string;
  ok?: boolean;
  slug?: string;
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

  const { classId, ...lesson } = parsed.data;
  const created = await classRepository.createClassLesson({
    classId,
    authorId: user.id,
    ...lesson,
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
  return { ok: true, slug: created.slug };
}

const editSchema = lessonSchema.omit({ classId: true }).extend({ lessonId: z.string().uuid() });

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

  const { lessonId, ...data } = parsed.data;
  await classRepository.updateClassLesson(lessonId, data);

  revalidatePath("/my-class");
  return { ok: true };
}

export async function deleteClassLessonAction(lessonId: string): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  if (!z.string().uuid().safeParse(lessonId).success) return { ok: false };
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
