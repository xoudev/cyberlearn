"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { classRepository, prisma } from "@cyberlearn/db";
import type { Prisma } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";
import { notifyEnrolledInClass } from "@/lib/class-enrolment-notice";

/**
 * Composing the school tree: establishments, promotions, classes, and who is in
 * them. Every action here goes through requireAdminAction, which checks the
 * role against the database and a completed TOTP challenge.
 */

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/, "Minuscules, chiffres et tirets uniquement")
  .min(2)
  .max(80);

const establishmentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug,
  city: z.string().trim().max(120).optional().or(z.literal("")),
});

const promotionSchema = z.object({
  establishmentId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  slug,
  startYear: z.coerce.number().int().min(1900).max(2200).optional(),
});

const classSchema = z.object({
  promotionId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  slug,
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

// Editing is the same shape as creating, plus which row. Extending the create
// schemas rather than restating the fields is what keeps a rule like the slug
// pattern from applying on the way in and not on the way back.
const establishmentEditSchema = establishmentSchema.extend({ id: z.string().uuid() });
const promotionEditSchema = promotionSchema
  .omit({ establishmentId: true })
  .extend({ id: z.string().uuid() });
const classEditSchema = classSchema.omit({ promotionId: true }).extend({ id: z.string().uuid() });

export interface ActionState {
  error?: string;
  ok?: boolean;
}

export async function createEstablishmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const parsed = establishmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  try {
    const created = await prisma.establishment.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        city: parsed.data.city === "" ? null : (parsed.data.city ?? null),
      },
      select: { id: true },
    });
    await audit(admin.id, "class.establishment.create", created.id, { name: parsed.data.name });
  } catch {
    // The slug is unique across establishments, unlike the two below.
    return { error: "Un établissement porte déjà ce slug." };
  }
  revalidatePath("/classes");
  return { ok: true };
}

export async function createPromotionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const raw = Object.fromEntries(formData.entries());
  const parsed = promotionSchema.safeParse({
    ...raw,
    startYear: raw.startYear === "" ? undefined : raw.startYear,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  try {
    const created = await prisma.promotion.create({
      data: {
        establishmentId: parsed.data.establishmentId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        startYear: parsed.data.startYear ?? null,
      },
      select: { id: true },
    });
    await audit(admin.id, "class.promotion.create", created.id, { name: parsed.data.name });
  } catch {
    return { error: "Cet établissement a déjà une promo avec ce slug." };
  }
  revalidatePath("/classes");
  return { ok: true };
}

export async function createClassAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const parsed = classSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  try {
    const created = await classRepository.create({
      promotionId: parsed.data.promotionId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description === "" ? null : (parsed.data.description ?? null),
    });
    await audit(admin.id, "class.create", created.id, { name: parsed.data.name });
  } catch {
    return { error: "Cette promo a déjà une classe avec ce slug." };
  }
  revalidatePath("/classes");
  return { ok: true };
}

const memberSchema = z.object({
  classId: z.string().uuid(),
  // One field, one address per line: pasting a class list should not mean
  // adding twenty students one at a time.
  emails: z.string().trim().min(3).max(5000),
});

export interface AddMembersState {
  error?: string;
  added?: number;
  unknown?: string[];
}

export async function addMembersAction(
  _prev: AddMembersState,
  formData: FormData,
): Promise<AddMembersState> {
  const admin = await requireAdminAction();
  const parsed = memberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Liste invalide." };

  const emails = [
    ...new Set(
      parsed.data.emails
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0),
    ),
  ].slice(0, 200);

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  const found = new Set(users.map((u) => u.email.toLowerCase()));
  // Reported rather than swallowed: a typo in a pasted list is the normal case,
  // and silently adding nineteen of twenty is how it goes unnoticed.
  const unknown = emails.filter((e) => !found.has(e));

  const addedIds = await classRepository.addMembers(
    parsed.data.classId,
    users.map((u) => u.id),
  );
  await audit(admin.id, "class.members.add", parsed.data.classId, {
    added: addedIds.length,
    unknown,
  });

  // After the audit, and never in front of it: the enrolment is what happened,
  // the notice is a courtesy, and a mail provider having a bad minute must not
  // decide whether a student is in a class. notifyEnrolledInClass swallows its
  // own failures for the same reason.
  await notifyEnrolledInClass(parsed.data.classId, addedIds);

  revalidatePath(`/classes/${parsed.data.classId}`);
  return { added: addedIds.length, unknown };
}

export async function removeMemberAction(
  classId: string,
  userId: string,
): Promise<{ ok: boolean }> {
  const admin = await requireAdminAction();
  if (!z.string().uuid().safeParse(classId).success) return { ok: false };
  if (!z.string().uuid().safeParse(userId).success) return { ok: false };

  await classRepository.removeMember(classId, userId);
  await audit(admin.id, "class.members.remove", classId, { userId });
  revalidatePath(`/classes/${classId}`);
  return { ok: true };
}

const teacherSchema = z.object({
  classId: z.string().uuid(),
  teacherId: z.string().uuid(),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function assignTeacherAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const parsed = teacherSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Professeur invalide." };

  // A class is followed by teachers, so the account has to be one. Without this
  // an admin could assign a student and hand them their classmates' progress.
  const teacher = await prisma.user.findUnique({
    where: { id: parsed.data.teacherId },
    select: { role: true },
  });
  if (teacher?.role !== "TEACHER" && teacher?.role !== "ADMIN") {
    return { error: "Ce compte n'a pas le rôle Professeur." };
  }

  await classRepository.assignTeacher(
    parsed.data.classId,
    parsed.data.teacherId,
    parsed.data.subject === "" ? null : (parsed.data.subject ?? null),
  );
  await audit(admin.id, "class.teacher.assign", parsed.data.classId, {
    teacherId: parsed.data.teacherId,
  });
  revalidatePath(`/classes/${parsed.data.classId}`);
  return { ok: true };
}

export async function unassignTeacherAction(
  classId: string,
  teacherId: string,
): Promise<{ ok: boolean }> {
  const admin = await requireAdminAction();
  if (!z.string().uuid().safeParse(classId).success) return { ok: false };
  if (!z.string().uuid().safeParse(teacherId).success) return { ok: false };

  await classRepository.unassignTeacher(classId, teacherId);
  await audit(admin.id, "class.teacher.unassign", classId, { teacherId });
  revalidatePath(`/classes/${classId}`);
  return { ok: true };
}

export async function setClassArchivedAction(
  classId: string,
  archived: boolean,
): Promise<{ ok: boolean }> {
  const admin = await requireAdminAction();
  if (!z.string().uuid().safeParse(classId).success) return { ok: false };

  await classRepository.setArchived(classId, archived);
  await audit(admin.id, archived ? "class.archive" : "class.unarchive", classId, {});
  revalidatePath("/classes");
  return { ok: true };
}

// ─── Editing what was created ───────────────────────────────────────────────
// A school changes its name, an intake was typed with a typo, a class is
// renamed between two years. Until now the only way to correct any of it was
// to create a second row and leave the first one there.

export async function updateEstablishmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const parsed = establishmentEditSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  try {
    await classRepository.updateEstablishment(parsed.data.id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      city: parsed.data.city === "" ? null : (parsed.data.city ?? null),
    });
    await audit(admin.id, "class.establishment.update", parsed.data.id, { name: parsed.data.name });
  } catch {
    return { error: "Un établissement porte déjà ce slug." };
  }
  revalidatePath("/classes/structure");
  revalidatePath("/classes");
  return { ok: true };
}

export async function updatePromotionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const raw = Object.fromEntries(formData.entries());
  const parsed = promotionEditSchema.safeParse({
    ...raw,
    startYear: raw.startYear === "" ? undefined : raw.startYear,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  try {
    await classRepository.updatePromotion(parsed.data.id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      startYear: parsed.data.startYear ?? null,
    });
    await audit(admin.id, "class.promotion.update", parsed.data.id, { name: parsed.data.name });
  } catch {
    return { error: "Cet établissement a déjà une promo avec ce slug." };
  }
  revalidatePath("/classes/structure");
  revalidatePath("/classes");
  return { ok: true };
}

export async function updateClassAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminAction();
  const parsed = classEditSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  try {
    await classRepository.update(parsed.data.id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description === "" ? null : (parsed.data.description ?? null),
    });
    await audit(admin.id, "class.update", parsed.data.id, { name: parsed.data.name });
  } catch {
    return { error: "Cette promo a déjà une classe avec ce slug." };
  }
  revalidatePath(`/classes/${parsed.data.id}`);
  revalidatePath("/classes");
  return { ok: true };
}

/**
 * Archiving a school or an intake puts away everything under it.
 *
 * Nothing is written to the classes themselves: they keep their own flag, so
 * bringing the school back brings back exactly what was live when it went away.
 * LIVE_CLASS_FILTER in the repository is what makes the reach work, by reading
 * all three levels on every query that answers "is this class still running".
 */
export async function setEstablishmentArchivedAction(
  establishmentId: string,
  archived: boolean,
): Promise<{ ok: boolean }> {
  const admin = await requireAdminAction();
  if (!z.string().uuid().safeParse(establishmentId).success) return { ok: false };

  await classRepository.setEstablishmentArchived(establishmentId, archived);
  await audit(
    admin.id,
    archived ? "class.establishment.archive" : "class.establishment.unarchive",
    establishmentId,
    {},
  );
  revalidatePath("/classes/structure");
  revalidatePath("/classes");
  return { ok: true };
}

export async function setPromotionArchivedAction(
  promotionId: string,
  archived: boolean,
): Promise<{ ok: boolean }> {
  const admin = await requireAdminAction();
  if (!z.string().uuid().safeParse(promotionId).success) return { ok: false };

  await classRepository.setPromotionArchived(promotionId, archived);
  await audit(
    admin.id,
    archived ? "class.promotion.archive" : "class.promotion.unarchive",
    promotionId,
    {},
  );
  revalidatePath("/classes/structure");
  revalidatePath("/classes");
  return { ok: true };
}

async function audit(
  actorId: string,
  action: string,
  targetId: string,
  metadata: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.auditLog.create({
    data: { actorId, action, targetType: "Class", targetId, metadata },
  });
}
