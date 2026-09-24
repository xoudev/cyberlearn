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
