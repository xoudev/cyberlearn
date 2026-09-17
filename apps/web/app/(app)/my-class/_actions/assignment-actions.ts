"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { classRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { announceAssignedWork } from "@/lib/classes/work-assigned-notice";

/**
 * Setting work for a class, from the site rather than from the console.
 *
 * A teacher is an ordinary signed-in user here - the admin app is gated on
 * role ADMIN and a TOTP challenge, and a teacher has neither. So every action
 * below authorises against the class tables: canSetWorkFor asks whether this
 * account teaches this class, which is the fact that matters, rather than
 * asking what role it holds. A teacher of one class must not be able to set
 * work for another by knowing its id.
 */

const assignSchema = z.object({
  classId: z.string().uuid(),
  lessonId: z.string().uuid(),
  // A date input sends "" when left empty, and an assignment with no deadline
  // is ordinary - "do this", rather than "do this by never".
  dueAt: z.string().trim().optional().or(z.literal("")),
  instructions: z.string().trim().max(1000).optional().or(z.literal("")),
});

export interface AssignState {
  error?: string;
  ok?: boolean;
  /** True when the class was told about work it had not seen before. */
  notified?: number;
}

export async function assignLessonAction(
  _prev: AssignState,
  formData: FormData,
): Promise<AssignState> {
  const user = await requireRequestUser();
  const parsed = assignSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Formulaire invalide." };

  if (!(await classRepository.canSetWorkFor(user.id, parsed.data.classId))) {
    return { error: "Tu ne suis pas cette classe." };
  }

  let dueAt: Date | null = null;
  if (parsed.data.dueAt !== undefined && parsed.data.dueAt !== "") {
    const parsedDate = new Date(parsed.data.dueAt);
    if (Number.isNaN(parsedDate.getTime())) return { error: "Date invalide." };
    // End of the chosen day: a deadline of "the 20th" means the 20th is still
    // on time, not that it expired as the 20th began.
    parsedDate.setHours(23, 59, 59, 999);
    dueAt = parsedDate;
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    select: { id: true, title: true, slug: true, status: true },
  });
  if (!lesson) return { error: "Leçon introuvable." };
  // Setting a draft would send the class to a page they cannot open.
  if (lesson.status !== "PUBLISHED") return { error: "Cette leçon n'est pas publiée." };

  const { created } = await classRepository.assignLesson({
    classId: parsed.data.classId,
    lessonId: lesson.id,
    assignedById: user.id,
    dueAt,
    instructions: parsed.data.instructions === "" ? null : (parsed.data.instructions ?? null),
  });

  // Only new work is announced. Moving a deadline by a day is not worth a
  // notification each, and a teacher adjusting dates would otherwise ring
  // twenty-eight bells for nothing.
  let notified = 0;
  if (created) {
    // The auth user carries an id, not a name; the e-mail says who set the
    // work, so the name comes from the row rather than from the session.
    const [klass, teacher] = await Promise.all([
      prisma.class.findUnique({ where: { id: parsed.data.classId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true } }),
    ]);
    notified = await announceAssignedWork({
      classId: parsed.data.classId,
      className: klass?.name ?? "ta classe",
      kind: "lesson",
      workTitle: lesson.title,
      workPath: `/lessons/${lesson.slug}`,
      teacherName: teacher?.displayName ?? "Ton professeur",
      dueAt,
      instructions: parsed.data.instructions === "" ? null : (parsed.data.instructions ?? null),
    });
  }

  revalidatePath("/my-class");
  return { ok: true, notified };
}

export async function unassignLessonAction(
  classId: string,
  lessonId: string,
): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  if (!z.string().uuid().safeParse(classId).success) return { ok: false };
  if (!z.string().uuid().safeParse(lessonId).success) return { ok: false };
  if (!(await classRepository.canSetWorkFor(user.id, classId))) return { ok: false };

  await classRepository.unassignLesson(classId, lessonId);
  revalidatePath("/my-class");
  return { ok: true };
}
