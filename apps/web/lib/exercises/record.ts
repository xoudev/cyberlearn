import { exerciseRepository, lessonRepository, prisma } from "@cyberlearn/db";
import { creditXp } from "@/lib/xp/credit";

/**
 * An exercise finished inside a lesson, recorded for the teacher's class view
 * and paid a little XP the first time.
 *
 * The lesson is found by its slug as this reader may open it, so a lesson
 * written for a class stays its class's. The browser is the judge of the
 * exercise, so the reward stays small: the real rewards go to the flags the
 * server checks (docs/backlog/interactive-learning.md, idea 30).
 */

export type ExerciseKind = "TERMINAL" | "PYTHON";

/** What an exercise finished for the first time pays. */
export const EXERCISE_XP = 10;

export interface RecordExerciseResult {
  /** False when the lesson is not one this reader may open. */
  ok: boolean;
  /** True the first time this exercise is recorded for this reader. */
  created: boolean;
  xpGained: number;
}

export async function recordExerciseForUser(
  userId: string,
  slug: string,
  exerciseId: string,
  kind: ExerciseKind,
): Promise<RecordExerciseResult> {
  const lessonId = await lessonRepository.findIdBySlug(slug, userId);
  if (lessonId === null) return { ok: false, created: false, xpGained: 0 };

  const { created } = await exerciseRepository.recordCompletion(userId, lessonId, exerciseId, kind);
  if (!created) return { ok: true, created: false, xpGained: 0 };

  await prisma.$transaction(async (tx) => {
    await creditXp(tx, userId, EXERCISE_XP, "EXERCISE");
  });
  return { ok: true, created: true, xpGained: EXERCISE_XP };
}
