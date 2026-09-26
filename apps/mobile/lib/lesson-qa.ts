/**
 * A lesson's questions and answers, as the app receives them from
 * /api/mobile/lesson-qa. Who may write, accept or upvote is the server's rule
 * (lib/lessons/qa.ts on the site); these helpers only decide which buttons to
 * show and check a draft with the server's limits and words.
 */

export interface QaAuthor {
  id: string;
  name: string;
  level: number;
}

export interface QaAnswer {
  id: string;
  content: string;
  isAccepted: boolean;
  upvotes: number;
  createdAt: string;
  /** Written by the reader: not theirs to upvote. */
  mine: boolean;
  author: QaAuthor | null;
}

export interface QaQuestion {
  id: string;
  title: string;
  content: string;
  isResolved: boolean;
  createdAt: string;
  /** Asked by the reader: theirs to accept an answer on. */
  mine: boolean;
  author: QaAuthor | null;
  answerCount: number;
  answers: QaAnswer[];
}

const QUESTION_TITLE_MIN = 10;
export const QUESTION_TITLE_MAX = 200;
const QUESTION_BODY_MIN = 20;
export const QA_BODY_MAX = 5000;
const ANSWER_BODY_MIN = 10;

/** What is wrong with a question before it is sent, in the server's words. */
export function questionDraftProblem(title: string, content: string): string | null {
  const t = title.trim().length;
  const c = content.trim().length;
  if (t < QUESTION_TITLE_MIN) return "Un titre de 10 caractères au minimum.";
  if (t > QUESTION_TITLE_MAX) return "200 caractères au plus pour le titre.";
  if (c < QUESTION_BODY_MIN) return "Décris ta question en 20 caractères au minimum.";
  if (c > QA_BODY_MAX) return "5000 caractères au plus pour la question.";
  return null;
}

/** What is wrong with an answer before it is sent, in the server's words. */
export function answerDraftProblem(content: string): string | null {
  const c = content.trim().length;
  if (c < ANSWER_BODY_MIN) return "Une réponse de 10 caractères au minimum.";
  if (c > QA_BODY_MAX) return "5000 caractères au plus pour la réponse.";
  return null;
}

/** The question's author may accept an answer, one that is not already. */
export function canAccept(question: QaQuestion, answer: QaAnswer): boolean {
  return question.mine && !answer.isAccepted;
}

/** Anybody may upvote an answer, except its author. */
export function canUpvote(answer: QaAnswer): boolean {
  return !answer.mine;
}

export function answerCountLabel(count: number): string {
  return `${String(count)} réponse${count > 1 ? "s" : ""}`;
}

export function questionCountLabel(count: number): string {
  return count === 0
    ? "Aucune question pour l'instant"
    : `${String(count)} question${count > 1 ? "s" : ""}`;
}

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/** "20 sept.", as the site's Q&A dates a message. */
export function qaDate(iso: string): string {
  return DAY.format(new Date(iso));
}
