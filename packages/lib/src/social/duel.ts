import {
  clientQuestions,
  sourceKey,
  type MockQuestion,
  type MockRef,
  type MockSource,
} from "../exam/mock.js";

/**
 * Quiz duels between friends: the same five questions, drawn from a path's
 * lesson quizzes, for two people who answer them each on their own screen
 * and watch the other's score move as they go. The most right answers wins;
 * on a tie, whoever finished first.
 *
 * Pure: the site's service (apps/web/lib/social/duels.ts) draws, checks and
 * settles with it, the answer key never leaving the server, and the app shows
 * what the site returns. A question is a lesson's quiz, as in a mock exam
 * (exam/mock.ts), with its option order.
 */

export type DuelStatus = "PENDING" | "ACTIVE" | "FINISHED" | "DECLINED" | "EXPIRED";

export type DuelWinner = "challenger" | "opponent" | "draw";

/** Questions in a duel. */
export const DUEL_QUESTIONS = 5;

/** A duel waits a day to be accepted, then lasts a day once it is. */
export const DUEL_TTL_MS = 24 * 60 * 60 * 1000;

export type DuelQuestion = MockQuestion;

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** `count` quizzes drawn from the whole path, each with its options shuffled. */
export function drawDuel(
  sources: readonly MockSource[],
  count: number = DUEL_QUESTIONS,
  rng: () => number = Math.random,
): MockRef[] {
  return shuffled(sources, rng)
    .slice(0, count)
    .map((source) => ({
      lessonId: source.lessonId,
      quizId: source.quizId,
      domain: source.domain,
      order: shuffled(
        source.options.map((_, k) => k),
        rng,
      ),
    }));
}

/** The questions to show, options in their drawn order, without the answer key. */
export function duelQuestions(
  refs: readonly MockRef[],
  sources: ReadonlyMap<string, MockSource>,
): DuelQuestion[] {
  return clientQuestions(refs, sources);
}

/**
 * Whether the shown option picked is the right one, and which one was: the
 * reader learns it once they have answered. Null when the quiz is no longer
 * in its lesson as drawn, or the pick is out of range.
 */
export function checkDuelAnswer(
  ref: MockRef,
  sources: ReadonlyMap<string, MockSource>,
  selected: number,
): { correct: boolean; correctIndex: number } | null {
  const source = sources.get(sourceKey(ref.lessonId, ref.quizId));
  if (source === undefined || clientQuestions([ref], sources).length === 0) return null;
  if (!Number.isInteger(selected) || selected < 0 || selected >= ref.order.length) return null;
  const correctIndex = ref.order.indexOf(source.correct);
  return { correct: selected === correctIndex, correctIndex };
}

export interface DuelAnswerRow {
  userId: string;
  index: number;
  correct: boolean;
  answeredAt: Date;
}

export interface DuelTally {
  answered: number;
  correct: number;
  /** When the last question was answered; null until all of them are. */
  finishedAt: Date | null;
}

/** Where one player stands: how many answered, how many right, done or not. */
export function tallyFor(
  userId: string,
  answers: readonly DuelAnswerRow[],
  questionCount: number,
): DuelTally {
  const own = answers.filter((answer) => answer.userId === userId);
  const answered = new Set(own.map((answer) => answer.index)).size;
  const correct = own.filter((answer) => answer.correct).length;
  const last = own.reduce<Date | null>(
    (latest, answer) =>
      latest === null || answer.answeredAt.getTime() > latest.getTime()
        ? answer.answeredAt
        : latest,
    null,
  );
  return { answered, correct, finishedAt: answered >= questionCount ? last : null };
}

/** The most right answers wins; on a tie, whoever finished first; otherwise a draw. */
export function duelWinner(challenger: DuelTally, opponent: DuelTally): DuelWinner {
  if (challenger.correct !== opponent.correct) {
    return challenger.correct > opponent.correct ? "challenger" : "opponent";
  }
  const a = challenger.finishedAt?.getTime() ?? null;
  const b = opponent.finishedAt?.getTime() ?? null;
  if (a !== null && b !== null && a !== b) return a < b ? "challenger" : "opponent";
  if (a !== null && b === null) return "challenger";
  if (b !== null && a === null) return "opponent";
  return "draw";
}

/** A pending or active duel past its time. */
export function isExpired(duel: { status: DuelStatus; expiresAt: Date }, now: Date): boolean {
  return (duel.status === "PENDING" || duel.status === "ACTIVE") && duel.expiresAt <= now;
}

/** The result in the reader's words. */
export function outcomeText(winner: DuelWinner, readerIsChallenger: boolean): string {
  if (winner === "draw") return "Égalité.";
  const readerWon = (winner === "challenger") === readerIsChallenger;
  return readerWon ? "Victoire !" : "Défaite.";
}

/** "3 / 5": a player's score line. */
export function scoreLine(tally: DuelTally, questionCount: number): string {
  return `${String(tally.correct)} / ${String(questionCount)}`;
}

/** The state of a duel in French, for a list. */
export const DUEL_STATUS_LABELS: Record<DuelStatus, string> = {
  PENDING: "En attente",
  ACTIVE: "En cours",
  FINISHED: "Terminé",
  DECLINED: "Refusé",
  EXPIRED: "Expiré",
};
