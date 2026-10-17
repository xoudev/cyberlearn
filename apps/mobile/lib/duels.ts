import { colors } from "@cyberlearn/tokens";
import {
  deadlineLabel,
  duelRecordCounts,
  duelSmallPrint,
  type DuelOutcome,
  type DuelQuestion,
  type DuelRecordCounts,
  type DuelStatus,
} from "@cyberlearn/lib/social/duel";

/**
 * Quiz duels as /api/mobile/duels sends them: the site's views
 * (apps/web/lib/social/duels.ts), mirrored here because the app does not
 * import the site. The outcome, the record, the small print, the
 * scoreboard's squares, the tie-break and the review of the reader's answers
 * are written in @cyberlearn/lib/social/duel, as on the site; what is here
 * is the app's own: its clock and its tones.
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

export interface DuelAnswerView {
  index: number;
  selected: number;
  correct: boolean;
  /** The shown option that was right, revealed once answered. */
  correctIndex: number | null;
}

export interface DuelView extends DuelSummary {
  questions: DuelQuestion[];
  readerAnswers: DuelAnswerView[];
}

export interface DuelBoard {
  duels: DuelSummary[];
  /**
   * The record over every duel, counted on the server; absent from a server
   * from before it, which only sent the duels listed.
   */
  record?: DuelRecordCounts;
  /**
   * The site's DuelFriend, in the fields the screen uses: a friend already in
   * a duel with the reader comes with that duel, and cannot be picked.
   */
  friends: { id: string; name: string; openDuelId?: string | null }[];
  paths: { id: string; title: string }[];
}

/**
 * The record the board shows: the server's, over every duel, or the one the
 * listed duels make when the server sends none (the twenty most recent).
 */
export function boardRecord(board: Pick<DuelBoard, "duels" | "record">): DuelRecordCounts {
  return board.record ?? duelRecordCounts(board.duels);
}

/** How often the duel screen reads the duel again while it is going on. */
export const DUEL_REFRESH_MS = 2500;

/** "vendredi 9 octobre à 12:00", on the phone's clock. */
const WHEN = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** "8 octobre". */
const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export function duelWhen(iso: string): string {
  return WHEN.format(new Date(iso));
}

export function duelDay(iso: string): string {
  return DAY.format(new Date(iso));
}

/** A duel's small print in the list, the site's words on the phone's clock. */
export function duelMeta(duel: DuelSummary): string {
  return duelSmallPrint(duel, { when: duelWhen, day: duelDay });
}

/** "5 questions · expire vendredi 9 octobre à 12:00": an invitation's terms. */
export function invitationMeta(duel: DuelSummary): string {
  const questions = `${String(duel.questionCount)} question${duel.questionCount > 1 ? "s" : ""}`;
  return `${questions} · expire ${duelWhen(duel.expiresAt)}`;
}

/** Until when the duel waits for its next move, dated on the phone's clock. */
export function deadlineLine(duel: DuelSummary): string | null {
  const label = deadlineLabel(duel.status);
  return label === null ? null : `${label} ${duelWhen(duel.expiresAt)}`;
}

/**
 * The tone an outcome is drawn in, as on the site (duels.css): a win in
 * success, a loss in danger, a duel going on in the reader's accent, an
 * invitation in warning, the rest muted.
 */
export function outcomeTone(outcome: DuelOutcome, accent: string): string {
  switch (outcome) {
    case "win":
      return colors.success;
    case "loss":
      return colors.danger;
    case "live":
      return accent;
    case "wait":
      return colors.warning;
    case "draw":
    case "declined":
    case "expired":
      return colors.textMuted;
  }
}
