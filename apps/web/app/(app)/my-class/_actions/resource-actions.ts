"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { classRepository, prisma } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";

/**
 * Handing something to a class: a corrigé, a link, a page of notes.
 *
 * The release rules are the reason this is not just a note field on the
 * assignment. An answer key is written at the same time as the work and must
 * appear later, so the row carries both conditions a teacher actually has in
 * mind - a date, and "once they have done it" - and either, both or neither may
 * apply.
 *
 * Authorised on the class tables like everything else a teacher does here.
 */

const resourceSchema = z
  .object({
    classId: z.string().uuid(),
    assignmentId: z.string().uuid().optional().or(z.literal("")),
    title: z.string().trim().min(2).max(200),
    body: z.string().trim().max(50_000).optional().or(z.literal("")),
    url: z.string().trim().url().max(2000).optional().or(z.literal("")),
    releasedAt: z.string().trim().optional().or(z.literal("")),
    afterCompletion: z.coerce.boolean().optional(),
  })
  // A resource with neither a body nor a link hands over nothing at all, and
  // would sit in the list looking like something went missing.
  .refine((v) => (v.body ?? "") !== "" || (v.url ?? "") !== "", {
    message: "Ajoute un contenu ou un lien.",
  });

export interface ResourceState {
  error?: string;
  ok?: boolean;
}

export async function createResourceAction(
  _prev: ResourceState,
  formData: FormData,
): Promise<ResourceState> {
  const user = await requireRequestUser();
  const parsed = resourceSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  if (!(await classRepository.canSetWorkFor(user.id, parsed.data.classId))) {
    return { error: "Tu ne suis pas cette classe." };
  }

  let releasedAt: Date | null = null;
  if (parsed.data.releasedAt !== undefined && parsed.data.releasedAt !== "") {
    const date = new Date(parsed.data.releasedAt);
    if (Number.isNaN(date.getTime())) return { error: "Date invalide." };
    // Start of the chosen day: "released on the 21st" means it is there when
    // they arrive on the 21st, not at the end of it.
    date.setHours(0, 0, 0, 0);
    releasedAt = date;
  }

  const assignmentId = parsed.data.assignmentId === "" ? null : (parsed.data.assignmentId ?? null);

  // An assignment from another class would hand this class's students a release
  // rule keyed on work they were never set.
  if (assignmentId !== null) {
    const owned = await prisma.classAssignment.count({
      where: { id: assignmentId, classId: parsed.data.classId },
    });
    if (owned === 0) return { error: "Ce devoir n'appartient pas à cette classe." };
  }

  await classRepository.createResource({
    classId: parsed.data.classId,
    assignmentId,
    title: parsed.data.title,
    body: parsed.data.body === "" ? null : (parsed.data.body ?? null),
    url: parsed.data.url === "" ? null : (parsed.data.url ?? null),
    releasedAt,
    // Meaningless without an assignment to complete, so it is not stored as a
    // condition that can never be satisfied.
    afterCompletion: assignmentId !== null && parsed.data.afterCompletion === true,
    createdById: user.id,
  });

  revalidatePath("/my-class");
  return { ok: true };
}

export async function deleteResourceAction(resourceId: string): Promise<{ ok: boolean }> {
  const user = await requireRequestUser();
  if (!z.string().uuid().safeParse(resourceId).success) return { ok: false };

  const classId = await classRepository.findResourceClass(resourceId);
  if (classId === null) return { ok: false };
  if (!(await classRepository.canSetWorkFor(user.id, classId))) return { ok: false };

  await classRepository.deleteResource(resourceId);
  revalidatePath("/my-class");
  return { ok: true };
}
