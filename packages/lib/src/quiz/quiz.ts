// Pure quiz logic: question draw, client-safe projection, server-side scoring,
// answer validation, and attempt guards. No DB, no I/O - all unit-testable.
// The server (repositories + actions) wires these against Prisma.

/** Cooldown after a finished (submitted or expired) attempt before a new start. 48h. */
export const QUIZ_COOLDOWN_MINUTES = 2880;

/** Hard time limit for one exam attempt. The countdown + the server expiry guard
 *  are both anchored to the attempt's startedAt with this window. */
export const EXAM_TIME_LIMIT_MINUTES = 30;

export interface QuizOption {
  id: string;
  text: string;
}

/** Full question as stored in DB - carries the answer key. SERVER-ONLY. */
export interface QuizQuestionFull {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string | null;
}

/** What the client receives - no correctOptionId, no explanation (pre-submit). */
export interface ClientQuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export interface AttemptResultItem {
  questionId: string;
  selected: string | null;
  correct: boolean;
  explanation?: string | null;
}

export interface ScoredSubmission {
  score: number; // 0–100, integer
  results: AttemptResultItem[];
}

/** Fisher–Yates shuffle (pure; rng injectable for deterministic tests). */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/**
 * Draw `n` questions at random and randomize both question order and each
 * question's option order. Caller MUST ensure `questions.length >= n` (the
 * action errors with "quiz not ready" otherwise - serving fewer would distort
 * the denominator).
 */
export function drawQuestions<T extends { id: string; options: QuizOption[] }>(
  questions: readonly T[],
  n: number,
  rng: () => number = Math.random,
): T[] {
  return shuffle(questions, rng)
    .slice(0, n)
    .map((q) => ({ ...q, options: shuffle(q.options, rng) }));
}

/** Strip the answer key (and explanation) before sending to the client. */
export function toClientQuestion(q: QuizQuestionFull): ClientQuizQuestion {
  return {
    id: q.id,
    question: q.question,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  };
}

/**
 * Validate a client submission against the SERVER's drawn set. Returns an error
 * string (caller → reject) or null. Rejects any questionId outside the draw and
 * any optionId not belonging to its question. Zero trust in the payload.
 */
export function validateSubmission(
  submitted: Readonly<Record<string, string>>,
  drawn: readonly { id: string; options: QuizOption[] }[],
): string | null {
  const optionsByQuestion = new Map(drawn.map((q) => [q.id, new Set(q.options.map((o) => o.id))]));
  for (const [questionId, optionId] of Object.entries(submitted)) {
    const valid = optionsByQuestion.get(questionId);
    if (!valid) return `Unknown question in submission: ${questionId}`;
    if (!valid.has(optionId)) return `Invalid option for question ${questionId}`;
  }
  return null;
}

/**
 * Score a submission against the drawn questions. Denominator is the number of
 * DRAWN questions (not the payload) - an omitted answer counts as wrong, so a
 * user cannot raise their percentage by leaving questions blank.
 */
export function scoreSubmission(
  drawn: readonly QuizQuestionFull[],
  submitted: Readonly<Record<string, string>>,
): ScoredSubmission {
  let correctCount = 0;
  const results: AttemptResultItem[] = drawn.map((q) => {
    const selected = submitted[q.id] ?? null;
    const correct = selected === q.correctOptionId;
    if (correct) correctCount++;
    return { questionId: q.id, selected, correct, explanation: q.explanation ?? null };
  });
  const score = drawn.length === 0 ? 0 : Math.round((correctCount / drawn.length) * 100);
  return { score, results };
}

export function isPassed(score: number, passThreshold: number): boolean {
  return score >= passThreshold;
}

// ── Attempt guards (pure) ────────────────────────────────────────────────────

export interface AttemptLike {
  userId: string;
  startedAt: Date;
  submittedAt: Date | null;
}

export type SubmitGuard = { ok: true } | { ok: false; reason: "not-owner" | "already-submitted" };

/** Authz + idempotence guard for submit. */
export function checkCanSubmit(attempt: AttemptLike, userId: string): SubmitGuard {
  if (attempt.userId !== userId) return { ok: false, reason: "not-owner" };
  if (attempt.submittedAt !== null) return { ok: false, reason: "already-submitted" };
  return { ok: true };
}

/** A recent un-submitted attempt is resumable (a refresh must not burn a try). */
export function isResumable(attempt: AttemptLike, now: Date, windowMinutes: number): boolean {
  return (
    attempt.submittedAt === null &&
    now.getTime() - attempt.startedAt.getTime() < windowMinutes * 60_000
  );
}

/** A recent SUBMITTED attempt blocks a new start (cooldown). */
export function isInCooldown(attempt: AttemptLike, now: Date, windowMinutes: number): boolean {
  return (
    attempt.submittedAt !== null &&
    now.getTime() - attempt.submittedAt.getTime() < windowMinutes * 60_000
  );
}

/**
 * An un-submitted attempt whose time limit has elapsed. The server treats it as
 * a failed attempt (not resumable, late submit rejected) so closing the tab
 * cannot dodge the timer.
 */
export function isExpired(attempt: AttemptLike, now: Date, limitMinutes: number): boolean {
  return (
    attempt.submittedAt === null &&
    now.getTime() - attempt.startedAt.getTime() > limitMinutes * 60_000
  );
}

/** Whole seconds left on an attempt's countdown (0 once the limit is reached). */
export function remainingSeconds(startedAt: Date, now: Date, limitMinutes: number): number {
  const elapsedMs = now.getTime() - startedAt.getTime();
  return Math.max(0, Math.ceil((limitMinutes * 60_000 - elapsedMs) / 1000));
}
