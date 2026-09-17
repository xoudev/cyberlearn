"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { classRepository, lessonsVisibleTo, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

/**
 * A teacher building a path for their own class.
 *
 * A path is an ordered set of lessons, so the ordering is what is being
 * authored and the lessons themselves are only referenced. Two things therefore
 * have to be checked, not one: that this account may set work for the class,
 * and that every lesson it put in the path is a lesson it may actually see.
 * Without the second, a teacher could assemble a path out of another class's
 * private material by pasting ids, and the class would then be able to open
 * every one of them.
 *
 * Authorisation is the same as everywhere else on this page: it asks whether
 * this account teaches this class, not what role it holds.
 */

const pathSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(1000),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedHours: z.coerce.number().int().positive().max(200),
});

export interface ClassPathState {
  error?: string;
  ok?: boolean;
  slug?: string;
}

/** The ordered lesson list arrives as one comma-separated field, in order. */
function parseLessonIds(raw: FormDataEntryValue | null): string[] | null {
  if (typeof raw !== "string") return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (ids.length === 0 || ids.length > 60) return null;
  if (new Set(ids).size !== ids.length) return null;
  if (!ids.every((id) => z.string().uuid().safeParse(id).success)) return null;
  return ids;
}

/**
 * Every id in the list is a lesson this account may open.
 *
 * lessonsVisibleTo is the same rule the catalogue and the lesson page read, so
 * a path cannot be used to smuggle another class's material to a class that is
 * not entitled to it.
 */
async function allLessonsVisible(userId: string, lessonIds: string[]): Promise<boolean> {
  const count = await prisma.lesson.count({
    where: { id: { in: lessonIds }, ...lessonsVisibleTo(userId) },
  });
  return count === lessonIds.length;
}

export async function createClassPathAction(
  _prev: ClassPathState,
  formData: FormData,
): Promise<ClassPathState> {
  const user = await requireRequestUser();

  const classId = formData.get("classId");
  if (typeof classId !== "string" || !z.string().uuid().safeParse(classId).success) {
    return { error: "Classe invalide." };
  }
  const parsed = pathSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const lessonIds = parseLessonIds(formData.get("lessonIds"));
  if (lessonIds === null) return { error: "Choisis au moins une leçon (60 au maximum)." };

  if (!(await classRepository.canSetWorkFor(user.id, classId))) {
    return { error: "Tu ne suis pas cette classe." };
  }
  if (!(await allLessonsVisible(user.id, lessonIds))) {
    return { error: "Une des leçons choisies ne t'est pas accessible." };
  }

  const created = await classRepository.createClassPath({
    classId,
    authorId: user.id,
    ...parsed.data,
    lessonIds,
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "class.path.create",
      targetType: "Path",
      targetId: created.id,
      metadata: { classId, title: parsed.data.title, lessons: lessonIds.length },
    },
  });

  revalidatePath("/my-class");
  return { ok: true, slug: created.slug };
}

export async function updateClassPathAction(
  _prev: ClassPathState,
  formData: FormData,
): Promise<ClassPathState> {
  const user = await requireRequestUser();

  const pathId = formData.get("pathId");
  if (typeof pathId !== "string" || !z.string().uuid().safeParse(pathId).success) {
    return { error: "Parcours invalide." };
  }
  const parsed = pathSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const lessonIds = parseLessonIds(formData.get("lessonIds"));
  if (lessonIds === null) return { error: "Choisis au moins une leçon (60 au maximum)." };

  if (!(await classRepository.canEditClassPath(user.id, pathId))) {
    return { error: "Ce parcours n'est pas le tien." };
  }
  if (!(await allLessonsVisible(user.id, lessonIds))) {
    return { error: "Une des leçons choisies ne t'est pas accessible." };
  }

  await classRepository.updateClassPath(pathId, { ...parsed.data, lessonIds });

  revalidatePath("/my-class");
  return { ok: true };
}

export async function deleteClassPathAction(pathId: string): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  if (!z.string().uuid().safeParse(pathId).success) return { ok: false };
  if (!(await classRepository.canEditClassPath(user.id, pathId))) return { ok: false };

  await classRepository.deleteClassPath(pathId);
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "class.path.delete",
      targetType: "Path",
      targetId: pathId,
      metadata: {},
    },
  });

  revalidatePath("/my-class");
  return { ok: true };
}
