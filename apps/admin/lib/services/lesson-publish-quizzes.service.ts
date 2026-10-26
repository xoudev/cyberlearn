import { lessonFileRepository, lessonVersionRepository } from "@cyberlearn/db";
import type { LessonQuizImpact } from "@cyberlearn/types";
import { quizImpactsOf } from "@/lib/quiz-impacts";

/**
 * What the studio's publish would do to the answers quizzes already have.
 *
 * The import and the sync show it before they write (compareLesson); the
 * studio used to publish a corrected answer key without a word, for answers
 * and marks that keep the old key. Read against the lesson as it is published
 * now, which is what the learners answered, and only where somebody did.
 */
export async function publishQuizImpacts(
  lessonId: string,
  contentMdx: string,
): Promise<LessonQuizImpact[]> {
  const counts = await lessonFileRepository.quizAnswerCounts([lessonId]);
  if (counts.length === 0) return [];
  const published = await lessonVersionRepository.current(lessonId);
  if (published === null) return [];
  return quizImpactsOf(
    published.contentMdx,
    contentMdx,
    new Map(counts.map((count) => [count.quizId, count.answers])),
  );
}
