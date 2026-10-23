import type { LessonQuizImpact } from "@cyberlearn/types";

/**
 * The quizzes a new text of a lesson changes under answers they already
 * have, in words. Apart from quiz-impacts.ts, which reads the MDX and stays
 * on the server: the import page's client component says these too.
 */

/** The quizzes, one by one, as « id » (what changes, how many answers). */
export function describeQuizImpacts(impacts: readonly LessonQuizImpact[]): string {
  return impacts
    .map(
      (q) =>
        `« ${q.quizId} » (${q.change === "removed" ? "retiré" : "options ou réponse changées"}, ${String(q.answers)} réponse${q.answers > 1 ? "s" : ""})`,
    )
    .join(", ");
}

/** What the studio says when its publish would change quizzes that have answers. */
export function quizImpactsMessage(impacts: readonly LessonQuizImpact[]): string {
  return `Quiz modifiés qui ont déjà des réponses : ${describeQuizImpacts(impacts)}. Ces réponses et leur note restent celles de l'ancienne version.`;
}
