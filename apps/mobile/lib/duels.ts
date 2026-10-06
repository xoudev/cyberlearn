import type { DuelQuestion, DuelStatus } from "@cyberlearn/lib/social/duel";

/**
 * Quiz duels as /api/mobile/duels sends them: the site's views
 * (apps/web/lib/social/duels.ts), mirrored here because the app does not
 * import the site.
 */

export interface DuelPlayer {
  id: string;
  name: string;
  username: string | null;
}

export interface DuelScore {
  answered: number;
  correct: number;
}

export interface DuelSummary {
  id: string;
  status: DuelStatus;
  pathTitle: string;
  pathSlug: string;
  reader: DuelPlayer;
  other: DuelPlayer;
  readerIsChallenger: boolean;
  questionCount: number;
  readerScore: DuelScore;
  otherScore: DuelScore;
  winner: "reader" | "other" | "draw" | null;
  createdAt: string;
  expiresAt: string;
}

export interface DuelView extends DuelSummary {
  questions: DuelQuestion[];
  readerAnswers: {
    index: number;
    selected: number;
    correct: boolean;
    correctIndex: number | null;
  }[];
}

export interface DuelBoard {
  duels: DuelSummary[];
  friends: { id: string; name: string }[];
  paths: { id: string; title: string }[];
}

/** How often the duel screen reads the duel again while it is going on. */
export const DUEL_REFRESH_MS = 2500;

/** A settled duel's line in a list: "Victoire, 4 à 3". */
export function duelResultLine(duel: DuelSummary): string | null {
  if (duel.status !== "FINISHED") return null;
  const score = `${String(duel.readerScore.correct)} à ${String(duel.otherScore.correct)}`;
  if (duel.winner === "draw") return `Égalité, ${score}`;
  return `${duel.winner === "reader" ? "Victoire" : "Défaite"}, ${score}`;
}

/** The next question the reader has not answered, or null. */
export function nextQuestion(view: DuelView): DuelQuestion | null {
  const answered = new Set(view.readerAnswers.map((a) => a.index));
  return view.questions.find((q) => !answered.has(q.index)) ?? null;
}
