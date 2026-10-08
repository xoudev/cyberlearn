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
 * what the site returns. Both apps also take from it the words a duel is shown
 * in, so the site and the app say the same thing. A question is a
 * lesson's quiz, as in a mock exam (exam/mock.ts), with its option order.
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

/**
 * A duel as one of its players reads it, in the fields the words below need:
 * the site's DuelSummary (apps/web/lib/social/duels.ts) and the app's mirror
 * of it both have them.
 */
export interface ReaderDuel {
  status: DuelStatus;
  /** Once settled: "reader", "other" or "draw". */
  winner: "reader" | "other" | "draw" | null;
}

/**
 * Where a duel stands for the reader: its result once settled, its state
 * before. Each surface is drawn in its outcome's tone.
 */
export type DuelOutcome = "win" | "loss" | "draw" | "live" | "wait" | "declined" | "expired";

/** The outcomes of a settled duel. */
export type DuelResultOutcome = Extract<DuelOutcome, "win" | "loss" | "draw">;

/** A settled duel's result, as its title says it. */
export const RESULT_TITLE: Record<DuelResultOutcome, string> = {
  win: "Victoire !",
  loss: "Défaite.",
  draw: "Égalité.",
};

/** The result in the reader's words, from the winner's seat. */
export function outcomeText(winner: DuelWinner, readerIsChallenger: boolean): string {
  if (winner === "draw") return RESULT_TITLE.draw;
  const readerWon = (winner === "challenger") === readerIsChallenger;
  return RESULT_TITLE[readerWon ? "win" : "loss"];
}

/** Where the duel stands for its reader, from its state and, once settled, its winner. */
export function outcomeOf(duel: ReaderDuel): DuelOutcome {
  switch (duel.status) {
    case "FINISHED":
      return duel.winner === "reader" ? "win" : duel.winner === "other" ? "loss" : "draw";
    case "ACTIVE":
      return "live";
    case "PENDING":
      return "wait";
    case "DECLINED":
      return "declined";
    case "EXPIRED":
      return "expired";
  }
}

/** The outcome in one word, for a badge: the result, or the state in the words above. */
export const OUTCOME_LABEL: Record<DuelOutcome, string> = {
  win: "Victoire",
  loss: "Défaite",
  draw: "Égalité",
  live: DUEL_STATUS_LABELS.ACTIVE,
  wait: DUEL_STATUS_LABELS.PENDING,
  declined: DUEL_STATUS_LABELS.DECLINED,
  expired: DUEL_STATUS_LABELS.EXPIRED,
};

/** Whether the duel is settled: won, lost or drawn. */
export function isSettled(outcome: DuelOutcome): outcome is DuelResultOutcome {
  return outcome === "win" || outcome === "loss" || outcome === "draw";
}

/** Whether the duel was ever played: one declined or never accepted has no score. */
export function wasPlayed(outcome: DuelOutcome): boolean {
  return isSettled(outcome) || outcome === "live";
}

/** One line of the reader's record: "2 victoires", "1 en cours". */
export interface DuelRecordLine {
  outcome: DuelOutcome;
  n: number;
  word: string;
}

/** The record's words; what is still open shows only when there is some. */
const RECORD: { outcome: DuelOutcome; word: string; invariable: boolean; always: boolean }[] = [
  { outcome: "win", word: "victoire", invariable: false, always: true },
  { outcome: "loss", word: "défaite", invariable: false, always: true },
  { outcome: "draw", word: "égalité", invariable: false, always: true },
  { outcome: "live", word: "en cours", invariable: true, always: false },
  { outcome: "wait", word: "en attente", invariable: true, always: false },
];

/**
 * The reader's record over their duels: wins, losses and draws always, the
 * duels going on and the invitations waiting when there are some. Declined
 * and expired duels count for nothing.
 */
export function duelRecord(duels: readonly ReaderDuel[]): DuelRecordLine[] {
  const outcomes = duels.map(outcomeOf);
  return RECORD.flatMap((row) => {
    const n = outcomes.filter((outcome) => outcome === row.outcome).length;
    if (!row.always && n === 0) return [];
    // French plural: an s past one ("0 victoire", "2 victoires").
    return [
      { outcome: row.outcome, n, word: row.invariable || n <= 1 ? row.word : `${row.word}s` },
    ];
  });
}

/** What opening a duel does: play when it is the reader's turn, look otherwise. */
export function duelActionLabel(
  duel: ReaderDuel & { questionCount: number; readerScore: { answered: number } },
): string {
  const outcome = outcomeOf(duel);
  if (outcome === "live") {
    return duel.readerScore.answered < duel.questionCount ? "À toi de jouer" : "Suivre le duel";
  }
  return isSettled(outcome) ? "Revoir le duel" : "Voir le duel";
}

/**
 * A duel's small print in a list: how far each has answered while it is
 * going on, when an invitation lapses, otherwise who started it and when.
 * The caller writes the dates, on its own clock: `when` a moment ("vendredi
 * 9 octobre à 12:00"), `day` a day ("8 octobre").
 */
export function duelSmallPrint(
  duel: ReaderDuel & {
    questionCount: number;
    readerScore: { answered: number };
    otherScore: { answered: number };
    other: { name: string };
    readerIsChallenger: boolean;
    createdAt: string;
    expiresAt: string;
  },
  dates: { when: (iso: string) => string; day: (iso: string) => string },
): string {
  const outcome = outcomeOf(duel);
  const count = String(duel.questionCount);
  if (outcome === "live") {
    return `Répondu : toi ${String(duel.readerScore.answered)} / ${count}, ${duel.other.name} ${String(duel.otherScore.answered)} / ${count}`;
  }
  if (outcome === "wait") return `Expire ${dates.when(duel.expiresAt)}`;
  const by = duel.readerIsChallenger ? "toi" : duel.other.name;
  return `Lancé par ${by} · ${dates.day(duel.createdAt)}`;
}

/**
 * Why a tied score still has a winner: whoever finished first (duelWinner).
 * Null unless the right answers are level and the duel was won or lost.
 */
export function tieBreakNote(
  duel: ReaderDuel & {
    readerScore: { correct: number };
    otherScore: { correct: number };
    other: { name: string };
  },
): string | null {
  if (duel.readerScore.correct !== duel.otherScore.correct) return null;
  const outcome = outcomeOf(duel);
  if (outcome === "win") {
    return `À égalité de bonnes réponses : tu as fini avant ${duel.other.name}.`;
  }
  if (outcome === "loss") {
    return `À égalité de bonnes réponses : ${duel.other.name} a fini avant toi.`;
  }
  return null;
}

/**
 * Until when the duel waits for its next move, without the date that each
 * app writes after it on its own clock: to be accepted, then to be played.
 * Null once it is over.
 */
export function deadlineLabel(status: DuelStatus): string | null {
  if (status === "PENDING") return "À accepter d'ici";
  if (status === "ACTIVE") return "À jouer d'ici";
  return null;
}

/** The words after a player's right answers: "0 bonne réponse", "2 bonnes réponses". */
export function rightAnswersWord(n: number): string {
  return n > 1 ? "bonnes réponses" : "bonne réponse";
}

/**
 * What a player's score says in place of zeros before the duel is played:
 * not started while the invitation waits, never played once it is declined
 * or lapsed. Null for a duel going on or settled, which has a score.
 */
export function idleScoreWord(status: DuelStatus): string | null {
  if (status === "PENDING") return "pas commencé";
  if (status === "DECLINED" || status === "EXPIRED") return "pas joué";
  return null;
}

/**
 * How a question's square is drawn on the scoreboard. The reader's: right,
 * missed, the one to play now, or still to play. The other's: answered or
 * not, since only their count is known.
 */
export type DuelMark = "right" | "wrong" | "current" | "todo" | "done";

/** The reader's squares, one a question; `current` is the question to play now, if any. */
export function readerMarks(
  questionCount: number,
  readerAnswers: readonly { index: number; correct: boolean }[],
  current: number | null,
): DuelMark[] {
  const byIndex = new Map(readerAnswers.map((answer) => [answer.index, answer]));
  return Array.from({ length: questionCount }, (_, i) => {
    const answer = byIndex.get(i);
    if (answer === undefined) return i === current ? "current" : "todo";
    return answer.correct ? "right" : "wrong";
  });
}

/** The other player's squares: as many done as they answered, the rest to play. */
export function otherMarks(questionCount: number, answered: number): DuelMark[] {
  return Array.from({ length: questionCount }, (_, i) => (i < answered ? "done" : "todo"));
}

/** The first question the reader has not answered yet, or null once all of them are. */
export function nextDuelQuestion<Q extends { index: number }>(
  questions: readonly Q[],
  readerAnswers: readonly { index: number }[],
): Q | null {
  const answered = new Set(readerAnswers.map((answer) => answer.index));
  return questions.find((question) => !answered.has(question.index)) ?? null;
}

/** One of the reader's answers, as a duel's view carries it. */
export interface DuelReaderAnswer {
  index: number;
  /** The shown option picked. */
  selected: number;
  correct: boolean;
  /** The shown option that was right, revealed once answered. */
  correctIndex: number | null;
}

/** The verdict on one of the reader's answers. */
export type AnswerVerdict = "right" | "wrong" | "none";

export const VERDICT_LABEL: Record<AnswerVerdict, string> = {
  right: "Juste",
  wrong: "Raté",
  none: "Sans réponse",
};

/** The outcome whose tone a verdict is drawn in: right as a win, missed as a loss, unanswered as a draw. */
export const VERDICT_OUTCOME: Record<AnswerVerdict, DuelResultOutcome> = {
  right: "win",
  wrong: "loss",
  none: "draw",
};

/** One question of "Tes réponses": what was asked, what the reader gave, the right one if missed. */
export interface DuelReviewRow {
  index: number;
  domain: string;
  question: string;
  /** "Ta réponse : …", or that time ran out. */
  given: string;
  /** The right option, named only where the reader missed it. */
  right: string | null;
  verdict: AnswerVerdict;
}

/** The reader's answers once the duel is settled, question by question. */
export function reviewRows(
  questions: readonly DuelQuestion[],
  readerAnswers: readonly DuelReaderAnswer[],
): DuelReviewRow[] {
  const byIndex = new Map(readerAnswers.map((answer) => [answer.index, answer]));
  return questions.map((q) => {
    const answer = byIndex.get(q.index);
    if (answer === undefined) {
      return {
        index: q.index,
        domain: q.domain,
        question: q.question,
        given: "Pas répondu à temps.",
        right: null,
        verdict: "none",
      };
    }
    const right =
      !answer.correct && answer.correctIndex !== null
        ? (q.options[answer.correctIndex] ?? null)
        : null;
    return {
      index: q.index,
      domain: q.domain,
      question: q.question,
      given: `Ta réponse : ${q.options[answer.selected] ?? ""}`,
      right,
      verdict: answer.correct ? "right" : "wrong",
    };
  });
}
