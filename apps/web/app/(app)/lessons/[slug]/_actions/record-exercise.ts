"use server";

import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { recordExerciseForUser, type RecordExerciseResult } from "@/lib/exercises/record";

export type { RecordExerciseResult };

/**
 * An exercise of the lesson is done, says the page: the teacher's class view
 * counts it, and the first time pays a little XP. The flow lives in
 * @/lib/exercises/record; this action reads the input and the session.
 */

const input = z.object({
  slug: z.string().trim().min(1).max(120),
  exerciseId: z.string().trim().min(1).max(200),
  kind: z.enum(["TERMINAL", "PYTHON"]),
});

const NOTHING: RecordExerciseResult = { ok: false, created: false, xpGained: 0 };

export async function recordExerciseAction(raw: unknown): Promise<RecordExerciseResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return NOTHING;
  const authUser = await requireRequestUser();
  return recordExerciseForUser(
    authUser.id,
    parsed.data.slug,
    parsed.data.exerciseId,
    parsed.data.kind,
  );
}
