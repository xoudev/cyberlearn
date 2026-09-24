import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import { lessonQuizRepository, lessonRepository, prisma } from "@cyberlearn/db";

export type QuizAnswerResult =
  | {
      ok: true;
      /** The answer on record: this one, or an earlier one if there was. */
      selected: number;
      correct: boolean;
    }
  | { ok: false; error: string };

/**
 * Records a learner's answer to one quiz of a lesson, and says if it is right.
 *
 * The first answer is the only one (see lessonQuizRepository.recordFirst).
 * Whether it is right is decided here, from the lesson as stored, never from
 * what the browser or the app says: the answer key is read off the lesson's
 * syntax tree, without running the lesson.
 *
 * The lesson has to have been opened first. Its page is where access is
 * decided (a class lesson, a lesson locked in a path), and opening it writes
 * the progress row this checks for, so an answer cannot be recorded for a
 * lesson the learner cannot read.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity (server action session or mobile Bearer JWT). Lives outside any
 * "use server" module so it cannot be invoked with an arbitrary userId.
 */
export async function recordQuizAnswer(
  userId: string,
  lessonId: string,
  quizId: string,
  selected: number,
): Promise<QuizAnswerResult> {
  const [lesson, progress] = await Promise.all([
    prisma.lesson.findUnique({ where: { id: lessonId }, select: { contentMdx: true } }),
    lessonRepository.findProgress(userId, lessonId),
  ]);
  if (!lesson || !progress) return { ok: false, error: "Leçon introuvable." };

  const quiz = extractLessonQuizzes(lesson.contentMdx).find((q) => q.id === quizId);
  if (!quiz || selected >= quiz.options.length) {
    return { ok: false, error: "Cette question n'existe plus dans la leçon." };
  }

  const recorded = await lessonQuizRepository.recordFirst(userId, lessonId, {
    quizId,
    selected,
    correct: selected === quiz.correct,
  });
  return { ok: true, selected: recorded.selected, correct: recorded.correct };
}

/**
 * The score a lesson is completed with: right answers out of its quizzes.
 * A quiz left unanswered counts as not right.
 *
 * Null when the lesson has no quizzes, and when none of them has a recorded
 * answer: that is a completion from a client that does not record answers
 * (a mobile build from before this), and scoring it 0 out of 5 would blame
 * the learner for the app they had.
 */
export async function lessonQuizScore(
  userId: string,
  lessonId: string,
  contentMdx: string,
): Promise<{ correct: number; total: number } | null> {
  const quizzes = extractLessonQuizzes(contentMdx);
  if (quizzes.length === 0) return null;
  const ids = new Set(quizzes.map((q) => q.id));
  const answers = (await lessonQuizRepository.findForLesson(userId, lessonId)).filter((a) =>
    ids.has(a.quizId),
  );
  if (answers.length === 0) return null;
  const correct = answers.filter((a) => a.correct).length;
  return { correct, total: quizzes.length };
}
