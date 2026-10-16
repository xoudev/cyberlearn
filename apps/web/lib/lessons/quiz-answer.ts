import { extractLessonQuizzes, type LessonQuiz } from "@cyberlearn/lib/mdx-quizzes";
import { lessonQuizRepository, lessonRepository, type RecordedQuizAnswer } from "@cyberlearn/db";
import { pathLockOf } from "@/lib/lessons/access";
import { lockedLessonError } from "@/lib/lessons/lock-message";

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
 * The lesson has to be one the learner may read, and to have been opened.
 * Both are checked here: a published lesson they may open (a class's lesson
 * only for its members), not locked in its path, with a progress row. The
 * page used to be trusted to have decided access before writing that row, but
 * the app wrote the row itself, under RLS, for any lesson it listed.
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
  const [lesson, progress, lock] = await Promise.all([
    lessonRepository.findReadableById(lessonId, userId),
    lessonRepository.findProgress(userId, lessonId),
    pathLockOf(userId, lessonId),
  ]);
  if (!lesson || !progress) return { ok: false, error: "Leçon introuvable." };
  if (lock !== null) return { ok: false, error: lockedLessonError(lock.title) };

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

/** A lesson's quizzes as it has them now, and the learner's answers to them. */
export interface LessonQuizRecord {
  quizzes: LessonQuiz[];
  /** Only answers to quizzes the lesson still has. */
  answers: RecordedQuizAnswer[];
}

/**
 * Reads a lesson's quizzes and the learner's answers once, for what a
 * completion makes of them: its score, and its review cards. Nothing is
 * asked of the database when the lesson has no quizzes.
 */
export async function readLessonQuizRecord(
  userId: string,
  lessonId: string,
  contentMdx: string,
): Promise<LessonQuizRecord> {
  const quizzes = extractLessonQuizzes(contentMdx);
  if (quizzes.length === 0) return { quizzes, answers: [] };
  const ids = new Set(quizzes.map((q) => q.id));
  const answers = (await lessonQuizRepository.findForLesson(userId, lessonId)).filter((a) =>
    ids.has(a.quizId),
  );
  return { quizzes, answers };
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
export function quizScoreOf(record: LessonQuizRecord): { correct: number; total: number } | null {
  if (record.quizzes.length === 0 || record.answers.length === 0) return null;
  const correct = record.answers.filter((a) => a.correct).length;
  return { correct, total: record.quizzes.length };
}
