import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import type { LessonQuizImpact } from "@cyberlearn/types";

/**
 * The quizzes a new text of a lesson changes under the answers they already
 * have. Shared by the three doors that write a lesson's content: the import
 * and the sync (lesson-update.service.ts) show it before they write, and the
 * studio's publish (lesson-publish-quizzes.service.ts) stops on it once.
 */

/** Quizzes whose options or answer key the new text changes, or takes out. */
export function changedQuizzes(
  before: string,
  after: string,
): Map<string, LessonQuizImpact["change"]> {
  const next = new Map(extractLessonQuizzes(after).map((q) => [q.id, q]));
  const out = new Map<string, LessonQuizImpact["change"]>();
  for (const q of extractLessonQuizzes(before)) {
    const n = next.get(q.id);
    if (!n) out.set(q.id, "removed");
    else if (n.correct !== q.correct || JSON.stringify(n.options) !== JSON.stringify(q.options)) {
      out.set(q.id, "modified");
    }
  }
  return out;
}

/**
 * Of those, the ones somebody already answered. Reading a lesson's quizzes
 * parses its MDX, twice: only worth it where an answer exists, so none
 * recorded returns before the first parse.
 */
export function quizImpactsOf(
  before: string,
  after: string,
  answers: ReadonlyMap<string, number>,
): LessonQuizImpact[] {
  if (answers.size === 0) return [];
  const impacts: LessonQuizImpact[] = [];
  for (const [quizId, change] of changedQuizzes(before, after)) {
    const count = answers.get(quizId) ?? 0;
    if (count > 0) impacts.push({ quizId, answers: count, change });
  }
  return impacts;
}
