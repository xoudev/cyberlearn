/**
 * A path's final exam, as the app shows it. The rules (the draw, the 30-minute
 * limit, the 48-hour wait, the score, the certificate) are the site's and run
 * on the server behind /api/mobile/exam/*; these helpers only read what it
 * answered and count.
 */

/** Where the exam stands, as GET /api/mobile/exam returns it (dates as ISO strings). */
export interface ExamStatusDto {
  hasQuiz: boolean;
  lessonsComplete: boolean;
  pathCompleted: boolean;
  certPublicId: string | null;
  questionCount: number;
  /** A percentage: 70 means 70 %. */
  passThreshold: number;
  timeLimitMinutes: number;
  /** An attempt still running, when it began on the server. */
  resumeStartedAt: string | null;
  /** The end of the wait after the last attempt, while it is not over. */
  cooldownUntil: string | null;
}

export interface ExamPath {
  id: string;
  slug: string;
  title: string;
  refCode: string;
  /** A catalogue path; a class path carries no certificate. */
  certifiable: boolean;
}

/** A drawn question, without its answer key. */
export interface ExamQuestion {
  id: string;
  question: string;
  options: { id: string; text: string }[];
}

export interface ExamReviewItem {
  questionId: string;
  selected: string | null;
  correct: boolean;
  explanation?: string | null;
}

/** The step a learner is at, from the site's boss node: one card, one action. */
export type FinalStep =
  | { kind: "certified"; publicId: string | null }
  | { kind: "locked" }
  | { kind: "claim" }
  | { kind: "resume"; startedAt: string }
  | { kind: "cooldown"; until: string }
  | { kind: "ready" };

export function finalStepOf(status: ExamStatusDto): FinalStep {
  if (status.pathCompleted) return { kind: "certified", publicId: status.certPublicId };
  if (!status.lessonsComplete) return { kind: "locked" };
  // No exam: the certificate comes with the last lesson, or is claimed.
  if (!status.hasQuiz) return { kind: "claim" };
  if (status.resumeStartedAt !== null) {
    return { kind: "resume", startedAt: status.resumeStartedAt };
  }
  if (status.cooldownUntil !== null) return { kind: "cooldown", until: status.cooldownUntil };
  return { kind: "ready" };
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "MM:SS" for a countdown; never negative. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

/**
 * The attempt's deadline on this phone's clock, from the seconds the server
 * counted on its own. Anchoring to the moment the answer arrived makes a phone
 * set to the wrong time harmless: it neither gains nor loses minutes.
 */
export function deadlineOf(secondsLeft: number, receivedAtMs: number): number {
  return receivedAtMs + Math.max(0, secondsLeft) * 1000;
}

/** Whole seconds before the deadline; 0 once it has passed. */
export function secondsUntil(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

/** Seconds spent on an attempt, for the results screen. */
export function secondsUsed(deadlineMs: number, nowMs: number, limitMinutes: number): number {
  const limit = limitMinutes * 60;
  return Math.min(limit, Math.max(0, limit - secondsUntil(deadlineMs, nowMs)));
}

export function unansweredCount(
  questions: readonly { id: string }[],
  answers: Readonly<Record<string, string>>,
): number {
  return questions.filter((q) => answers[q.id] === undefined).length;
}

/** Right answers needed to pass, as the site's rules card counts them. */
export function correctNeeded(questionCount: number, passThreshold: number): number {
  return Math.ceil((questionCount * passThreshold) / 100);
}

/** How long before the next attempt: "dans 31 h", "dans 12 min". */
export function waitLabel(untilIso: string, nowMs: number): string {
  const ms = new Date(untilIso).getTime() - nowMs;
  if (Number.isNaN(ms) || ms < 60_000) return "dans moins d'une minute";
  if (ms < 3_600_000) return `dans ${String(Math.ceil(ms / 60_000))} min`;
  return `dans ${String(Math.ceil(ms / 3_600_000))} h`;
}

/** The score against the threshold, in points: "+12 pts au-dessus du seuil". */
export function thresholdGap(score: number, passThreshold: number): string {
  const delta = score - passThreshold;
  if (delta === 0) return "pile au seuil";
  return delta > 0
    ? `+${String(delta)} pts au-dessus du seuil`
    : `-${String(-delta)} pts sous le seuil`;
}

/**
 * What the review says about one option. The answer key never reaches the
 * app: only the learner's own pick can be marked, right or wrong.
 */
export function optionVerdict(item: ExamReviewItem, optionId: string): "right" | "wrong" | null {
  if (item.selected !== optionId) return null;
  return item.correct ? "right" : "wrong";
}
