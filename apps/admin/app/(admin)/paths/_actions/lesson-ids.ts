// Zod validation of a path form's lesson list. Plain module (NOT "use server")
// so the schema can be unit-tested and shared by the create and edit actions.

import { z } from "zod";

/** Cap on a path's lessons, so that saving one stays a reasonable transaction. */
export const MAX_PATH_LESSONS = 500;

/**
 * The ordered lesson ids of a path form, sent in a hidden field as a JSON
 * array. A missing field is a path without lessons. Anything unreadable is an
 * error, not an empty list: saving a path replaces all its lessons, so reading
 * a broken field as "none" would empty the path.
 */
export const pathLessonIdsSchema = z
  .string()
  .optional()
  .transform((raw, ctx): unknown => {
    if (raw === undefined || raw === "") return [];
    try {
      const value: unknown = JSON.parse(raw);
      return value;
    } catch {
      ctx.addIssue({ code: "custom", message: "Liste de leçons illisible." });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(z.guid("Liste de leçons invalide."))
      .max(MAX_PATH_LESSONS, `Un parcours compte ${String(MAX_PATH_LESSONS)} leçons au plus.`)
      .refine((ids) => new Set(ids).size === ids.length, "Une leçon figure deux fois."),
  );

/** The lesson ids of a path form, or the reason they cannot be read. */
export function readPathLessonIds(
  formData: FormData,
): { ok: true; ids: string[] } | { ok: false; error: string } {
  const parsed = pathLessonIdsSchema.safeParse(formData.get("lessonIds") ?? undefined);
  if (parsed.success) return { ok: true, ids: parsed.data };
  return { ok: false, error: parsed.error.issues[0]?.message ?? "Liste de leçons invalide." };
}
