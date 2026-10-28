import { exerciseRepository, lessonRepository, prisma } from "@cyberlearn/db";
import { lessonHasExercise } from "@cyberlearn/lib/mdx-exercises";
import type { ExerciseKind } from "@cyberlearn/lib/exercises/keys";
import { creditXp } from "@/lib/xp/credit";
import { recordQuestProgress } from "@/lib/quests/progress";

/**
 * An exercise finished inside a lesson, recorded for the teacher's class view
 * and paid a little XP the first time.
 *
 * The lesson is found by its slug as this reader may open it, so a lesson
 * written for a class stays its class's. The browser is the judge of the
 * exercise, so the reward stays small: the real rewards go to the flags the
 * server checks (docs/backlog/interactive-learning.md, idea 30). The browser
 * is not the judge of which exercises exist, though: only an exercise the
 * lesson has is recorded, or replaying the action with made-up identifiers
 * paid ten XP each, without end.
 */

export type { ExerciseKind };

/** What an exercise finished for the first time pays. */
export const EXERCISE_XP = 10;

export interface RecordExerciseResult {
  /** False when the lesson is not one this reader may open, or has no such exercise. */
  ok: boolean;
  /** True the first time this exercise is recorded for this reader. */
  created: boolean;
  xpGained: number;
}

const NOTHING: RecordExerciseResult = { ok: false, created: false, xpGained: 0 };

export async function recordExerciseForUser(
  userId: string,
  slug: string,
  exerciseId: string,
  kind: ExerciseKind,
): Promise<RecordExerciseResult> {
  const lesson = await lessonRepository.findBySlug(slug, userId);
  if (lesson === null) return NOTHING;
  if (!lessonHasExercise(lesson.contentMdx, kind, exerciseId)) return NOTHING;

  const { created } = await exerciseRepository.recordCompletion(
    userId,
    lesson.id,
    exerciseId,
    kind,
  );
  if (!created) return { ok: true, created: false, xpGained: 0 };

  await prisma.$transaction(async (tx) => {
    await creditXp(tx, userId, EXERCISE_XP, "EXERCISE");
  });
  // Weekly quests: only the first time, like the XP.
  await recordQuestProgress(userId, "EXERCISE_PASSED", new Date(), { amount: 1 });
  return { ok: true, created: true, xpGained: EXERCISE_XP };
}
