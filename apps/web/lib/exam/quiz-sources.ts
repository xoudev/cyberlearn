import { prisma } from "@cyberlearn/db";
import { sourceKey, type MockSource } from "@cyberlearn/lib/exam/mock";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";

/**
 * Lesson quizzes as the questions drawn from them are asked and checked: a
 * duel's, a day's review session, a module's review. Each question refers to
 * its quiz by lesson and quiz id, and is read here from the lesson as it is
 * now, so the answer key never leaves the server and a quiz changed since the
 * draw is seen as changed (exam/mock.ts).
 */

/**
 * The quizzes of these lessons, keyed by sourceKey. `domainOf` names the
 * domain each question is shown under: the module for an exam, the lesson's
 * title for a review, nothing for a duel.
 */
export function quizSourcesOf<L extends { id: string; contentMdx: string }>(
  lessons: readonly L[],
  domainOf: (lesson: L) => string = () => "",
): Map<string, MockSource> {
  const map = new Map<string, MockSource>();
  for (const lesson of lessons) {
    const domain = domainOf(lesson);
    for (const quiz of extractLessonQuizzes(lesson.contentMdx)) {
      map.set(sourceKey(lesson.id, quiz.id), {
        lessonId: lesson.id,
        quizId: quiz.id,
        domain,
        question: quiz.question,
        options: quiz.options,
        correct: quiz.correct,
        explanation: quiz.explanation,
      });
    }
  }
  return map;
}

/** The quizzes of the lessons a draw (a duel's) took its questions from, as they are now. */
export async function sourcesFor(
  refs: readonly { lessonId: string }[],
): Promise<Map<string, MockSource>> {
  const ids = [...new Set(refs.map((ref) => ref.lessonId))];
  if (ids.length === 0) return new Map();
  const lessons = await prisma.lesson.findMany({
    where: { id: { in: ids } },
    select: { id: true, contentMdx: true },
  });
  return quizSourcesOf(lessons);
}
