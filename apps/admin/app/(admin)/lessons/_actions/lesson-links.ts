// Zod validation of a lesson's paths and prerequisites, as the lesson forms
// send them. Plain module (NOT "use server") so the schemas can be unit-tested
// and shared by the create action and the edit page's own actions.

import { z } from "zod";

/** More paths than any lesson belongs to: a guard on the transaction, not a rule. */
export const MAX_LESSON_PATHS = 20;
/** Same for prerequisites. */
export const MAX_LESSON_PREREQUISITES = 50;

function uniqueIds(ids: readonly string[]): boolean {
  return new Set(ids).size === ids.length;
}

/** The paths a lesson is in, in the order they were chosen: the first names its code. */
export const lessonPathIdsSchema = z
  .array(z.guid("Parcours invalide."))
  .max(MAX_LESSON_PATHS, `Une leçon entre dans ${String(MAX_LESSON_PATHS)} parcours au plus.`)
  .refine(uniqueIds, "Un parcours figure deux fois.");

export const lessonPrerequisiteIdsSchema = z
  .array(z.guid("Prérequis invalide."))
  .max(
    MAX_LESSON_PREREQUISITES,
    `Une leçon a ${String(MAX_LESSON_PREREQUISITES)} prérequis au plus.`,
  )
  .refine(uniqueIds, "Un prérequis figure deux fois.");

export interface LessonLinks {
  pathIds: string[];
  prerequisiteIds: string[];
}

/**
 * The paths and prerequisites of a lesson form: each chosen value is a field
 * of its own (MultiSelect), `pathIds` and `prerequisiteIds`. Missing fields
 * are none.
 */
export function readLessonLinks(
  formData: FormData,
): { ok: true; links: LessonLinks } | { ok: false; field: keyof LessonLinks; error: string } {
  const pathIds = lessonPathIdsSchema.safeParse(formData.getAll("pathIds"));
  if (!pathIds.success) {
    return {
      ok: false,
      field: "pathIds",
      error: pathIds.error.issues[0]?.message ?? "Parcours invalides.",
    };
  }
  const prerequisiteIds = lessonPrerequisiteIdsSchema.safeParse(formData.getAll("prerequisiteIds"));
  if (!prerequisiteIds.success) {
    return {
      ok: false,
      field: "prerequisiteIds",
      error: prerequisiteIds.error.issues[0]?.message ?? "Prérequis invalides.",
    };
  }
  return { ok: true, links: { pathIds: pathIds.data, prerequisiteIds: prerequisiteIds.data } };
}
