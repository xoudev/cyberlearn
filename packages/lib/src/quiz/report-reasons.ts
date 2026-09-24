/**
 * Why a learner reports a lesson quiz, as both apps word it. The values are
 * the database's (QuizReportReason); a test in apps/web checks they match.
 */
export const QUIZ_REPORT_REASON_LABELS = {
  AMBIGUOUS: "La question ou les réponses sont ambiguës",
  WRONG_ANSWER: "La bonne réponse me semble fausse",
  TYPO: "Faute ou erreur dans le texte",
  OTHER: "Autre chose",
} as const;

export type QuizReportReasonKey = keyof typeof QUIZ_REPORT_REASON_LABELS;

/** In the order the forms list them. */
export const QUIZ_REPORT_REASON_KEYS: readonly QuizReportReasonKey[] = [
  "AMBIGUOUS",
  "WRONG_ANSWER",
  "TYPO",
  "OTHER",
];

/** A comment is optional and short: it is read by the team, not published. */
export const QUIZ_REPORT_COMMENT_MAX = 500;
