import { quizOptionOrder, quizOrderSeed } from "@cyberlearn/lib/quiz/option-order";

/**
 * A lesson's quiz, as the app scores it: the first answer is the only one,
 * and it is the server that says whether it is right (see
 * apps/web/lib/lessons/quiz-answer.ts). These helpers only count.
 */

export interface RecordedAnswer {
  selected: number;
  correct: boolean;
}

export interface QuizScore {
  correct: number;
  total: number;
}

/** Right answers out of the lesson's quizzes; an unanswered quiz is not right. */
export function scoreOf(
  quizIds: readonly string[],
  answers: Readonly<Record<string, RecordedAnswer>>,
): QuizScore {
  return {
    correct: quizIds.filter((id) => answers[id]?.correct === true).length,
    total: quizIds.length,
  };
}

/** The first quiz not answered yet, or the number of quizzes when all are. */
export function firstUnanswered(
  quizIds: readonly string[],
  answers: Readonly<Record<string, RecordedAnswer>>,
): number {
  const i = quizIds.findIndex((id) => answers[id] === undefined);
  return i === -1 ? quizIds.length : i;
}

/**
 * A completed lesson's score from its progress row, as the catalogue shows it.
 * Null before completion, without quizzes, or completed before answers were
 * recorded.
 */
export function progressScore(row: {
  status: string | null;
  quizCorrect: number | null;
  quizTotal: number | null;
}): QuizScore | null {
  if (row.status !== "COMPLETED") return null;
  if (row.quizTotal === null || row.quizTotal === 0 || row.quizCorrect === null) return null;
  return { correct: row.quizCorrect, total: row.quizTotal };
}

/**
 * The written indices of a quiz's options in the order this learner sees them:
 * the site's order, from the same function and seed. The index sent to the
 * server stays the written one. Without a signed-in user, the written order.
 */
export function optionOrderFor(
  userId: string | undefined,
  lessonId: string,
  quiz: { id: string; options: readonly string[] },
): number[] {
  if (userId === undefined) return quiz.options.map((_, i) => i);
  return quizOptionOrder(quiz.options, quizOrderSeed(userId, lessonId, quiz.id));
}

/** The letter an option is shown under, from its written index. */
export function letterOf(order: readonly number[], written: number): string {
  const position = order.indexOf(written);
  return position < 0 ? "?" : String.fromCharCode(65 + position);
}
