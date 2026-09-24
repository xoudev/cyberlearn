import { z } from "zod";
import { pathRepository, prisma, quizRepository } from "@cyberlearn/db";
import {
  type AttemptResultItem,
  type QuizOption,
  EXAM_TIME_LIMIT_MINUTES,
  QUIZ_COOLDOWN_MINUTES,
  checkCanSubmit,
  drawQuestions,
  isExpired,
  isInCooldown,
  isPassed,
  isResumable,
  scoreSubmission,
  validateSubmission,
} from "@cyberlearn/lib";
import { evaluateAndAwardBadges } from "@/lib/badges/award";
import { issueCertificate } from "@/lib/certificates/issue";
import { recordQuestProgress } from "@/lib/quests/progress";
import { checkQuizStart, checkQuizSubmit } from "@/lib/rate-limit";

/**
 * A path's final exam: where it stands for a learner, starting (or resuming)
 * an attempt, and submitting it.
 *
 * Shared by the site (the exam page and its actions) and the app
 * (/api/mobile/exam/*), so both run the same draw, the same 30-minute limit,
 * the same 48-hour wait and the same certificate issuance.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity (server action session or mobile Bearer JWT). Lives outside any
 * "use server" module so it cannot be invoked with an arbitrary userId.
 */

export interface StartQuizResult {
  ok: boolean;
  error?: string;
  attemptId?: string;
  questions?: { id: string; question: string; options: QuizOption[] }[];
  /** When the attempt began, on the server: the countdown is anchored to it. */
  startedAt?: Date;
}

export interface SubmitQuizResult {
  ok: boolean;
  error?: string;
  score?: number;
  passed?: boolean;
  results?: AttemptResultItem[];
}

export interface ExamStatus {
  hasQuiz: boolean;
  lessonsComplete: boolean;
  pathCompleted: boolean;
  certPublicId: string | null;
  questionCount: number;
  passThreshold: number;
  timeLimitMinutes: number;
  /** An attempt still running: the page resumes it rather than start another. */
  resumeStartedAt: Date | null;
  /** The end of the wait after a finished attempt, when it is not over. */
  cooldownUntil: Date | null;
}

/** Reads the server-authoritative drawn question ids stored on an attempt. */
function readDrawnIds(answers: unknown): string[] {
  // SAFETY: answers is our own JSON ({ drawnQuestionIds: string[], ... }); read defensively.
  const obj = (answers ?? {}) as { drawnQuestionIds?: unknown };
  if (!Array.isArray(obj.drawnQuestionIds)) return [];
  return obj.drawnQuestionIds.filter((v): v is string => typeof v === "string");
}

/** Where the exam stands for this learner. Resume and cooldown come from the server. */
export async function examStatus(userId: string, pathId: string): Promise<ExamStatus> {
  const [quiz, progress, lessonsComplete] = await Promise.all([
    quizRepository.findActiveQuizByPathId(pathId),
    pathRepository.findProgress(userId, pathId),
    pathRepository.areLessonsComplete(userId, pathId),
  ]);

  const pathCompleted = progress?.status === "COMPLETED";

  // Resume anchor + cooldown are derived from the latest attempt server-side, so
  // the countdown survives a refresh and can't be reset by reloading.
  let resumeStartedAt: Date | null = null;
  let cooldownUntil: Date | null = null;
  if (quiz && !pathCompleted) {
    const latest = await quizRepository.findLatestAttempt(userId, quiz.id);
    const now = Date.now();
    if (latest?.submittedAt == null && latest) {
      const elapsedMs = now - latest.startedAt.getTime();
      if (elapsedMs <= EXAM_TIME_LIMIT_MINUTES * 60_000) resumeStartedAt = latest.startedAt;
      // else expired → finalized on the next start (no resume offered)
    } else if (latest?.submittedAt) {
      const until = latest.submittedAt.getTime() + QUIZ_COOLDOWN_MINUTES * 60_000;
      if (until > now) cooldownUntil = new Date(until);
    }
  }

  const cert = pathCompleted
    ? await prisma.certificate.findFirst({
        where: { userId, pathId, revokedAt: null },
        select: { publicId: true },
      })
    : null;

  return {
    hasQuiz: quiz !== null,
    lessonsComplete,
    pathCompleted,
    certPublicId: cert?.publicId ?? null,
    questionCount: quiz?.questionsToDraw ?? 0,
    passThreshold: quiz?.passThreshold ?? 70,
    timeLimitMinutes: EXAM_TIME_LIMIT_MINUTES,
    resumeStartedAt,
    cooldownUntil,
  };
}

export async function startExam(userId: string, pathId: unknown): Promise<StartQuizResult> {
  const rl = await checkQuizStart(userId);
  if (!rl.success) return { ok: false, error: "Trop de tentatives. Réessaie plus tard." };

  const parsedPathId = z.string().uuid().safeParse(pathId);
  if (!parsedPathId.success) return { ok: false, error: "Parcours invalide." };

  const quiz = await quizRepository.findActiveQuizByPathId(parsedPathId.data);
  if (!quiz) return { ok: false, error: "Aucun quiz actif pour ce parcours." };

  // Upstream lock: the quiz is only reachable once all lessons are complete.
  // Closes the "quiz before lessons" dead-end (a passing attempt would be refused
  // at issuance, then lesson-completion would skip emission because a quiz exists).
  if (!(await pathRepository.areLessonsComplete(userId, parsedPathId.data))) {
    return { ok: false, error: "Termine d'abord toutes les leçons du parcours." };
  }

  const now = new Date();
  const latest = await quizRepository.findLatestAttempt(userId, quiz.id);

  // Time-limit guard (resume side): an in-progress attempt whose timer expired
  // while the learner was away is finalized as failed - closing the tab cannot
  // dodge the chrono. The cooldown then applies.
  if (latest && isExpired(latest, now, EXAM_TIME_LIMIT_MINUTES)) {
    await quizRepository.updateAttemptResult(latest.id, {
      score: 0,
      passed: false,
      answers: { drawnQuestionIds: readDrawnIds(latest.answers), expired: true },
    });
    return {
      ok: false,
      error: "Temps écoulé sur ta tentative. Réessaie après le délai d'attente.",
    };
  }

  // Resume: an in-progress attempt still within its time limit (refresh must not burn a try).
  if (latest && isResumable(latest, now, EXAM_TIME_LIMIT_MINUTES)) {
    const ids = readDrawnIds(latest.answers);
    const pool = await quizRepository.findActiveQuestionsForDraw(quiz.id);
    const byId = new Map(pool.map((q) => [q.id, q]));
    const questions = ids
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => q !== undefined);
    return { ok: true, attemptId: latest.id, questions, startedAt: latest.startedAt };
  }

  // Cooldown: a finished (submitted or expired) attempt blocks a new start (48h).
  if (latest && isInCooldown(latest, now, QUIZ_COOLDOWN_MINUTES)) {
    return { ok: false, error: "Examen déjà passé récemment. Réessaie après le délai d'attente." };
  }

  // Fresh draw. Never serve fewer than questionsToDraw (would distort the denominator).
  const pool = await quizRepository.findActiveQuestionsForDraw(quiz.id);
  if (pool.length < quiz.questionsToDraw) {
    return { ok: false, error: "Quiz non prêt (pas assez de questions actives)." };
  }

  const drawn = drawQuestions(pool, quiz.questionsToDraw);
  const attempt = await quizRepository.createAttempt({
    userId,
    quizId: quiz.id,
    answers: { drawnQuestionIds: drawn.map((q) => q.id) },
  });

  // `drawn` is already the client-safe shape (no correctOptionId was selected).
  return { ok: true, attemptId: attempt.id, questions: drawn, startedAt: attempt.startedAt };
}

const answersSchema = z.record(z.string(), z.string());

export async function submitExam(
  userId: string,
  attemptId: unknown,
  answers: unknown,
): Promise<SubmitQuizResult> {
  const rl = await checkQuizSubmit(userId);
  if (!rl.success) return { ok: false, error: "Trop de soumissions. Réessaie plus tard." };

  const parsedId = z.string().uuid().safeParse(attemptId);
  if (!parsedId.success) return { ok: false, error: "Tentative invalide." };

  const parsedAnswers = answersSchema.safeParse(answers);
  if (!parsedAnswers.success) return { ok: false, error: "Réponses invalides." };

  const attempt = await quizRepository.findAttemptById(parsedId.data);
  if (!attempt) return { ok: false, error: "Tentative introuvable." };

  // Authz + idempotence.
  const guard = checkCanSubmit(attempt, userId);
  if (!guard.ok) {
    return {
      ok: false,
      error: guard.reason === "not-owner" ? "Accès refusé." : "Tentative déjà soumise.",
    };
  }

  // Time-limit guard (submit side): a submission past the limit (+ 60s network
  // grace) fails the attempt regardless of answers. The on-time auto-submit at 0
  // lands within the grace and is scored normally.
  const elapsedSeconds = (Date.now() - attempt.startedAt.getTime()) / 1000;
  if (elapsedSeconds > EXAM_TIME_LIMIT_MINUTES * 60 + 60) {
    await quizRepository.updateAttemptResult(attempt.id, {
      score: 0,
      passed: false,
      answers: { drawnQuestionIds: readDrawnIds(attempt.answers), expired: true },
    });
    return { ok: true, score: 0, passed: false, results: [] };
  }

  const drawnIds = readDrawnIds(attempt.answers);
  if (drawnIds.length === 0) return { ok: false, error: "Tentative corrompue." };

  // Server-authoritative set (includes correctOptionId) - never returned to the client.
  const drawn = await quizRepository.findQuestionsByIds(drawnIds);

  // Reject any questionId outside the draw or any invalid optionId (zero trust).
  if (validateSubmission(parsedAnswers.data, drawn) !== null) {
    return { ok: false, error: "Réponses invalides." };
  }

  const quiz = await quizRepository.findQuizById(attempt.quizId);
  const threshold = quiz?.passThreshold ?? 70;

  const { score, results } = scoreSubmission(drawn, parsedAnswers.data);
  const passed = isPassed(score, threshold);

  // Stored answers: selection + correct/incorrect only - NEVER correctOptionId.
  const responses = results.map((r) => ({
    questionId: r.questionId,
    selected: r.selected,
    correct: r.correct,
  }));
  await quizRepository.updateAttemptResult(attempt.id, {
    score,
    passed,
    answers: { drawnQuestionIds: drawnIds, responses },
  });

  // PERFECT_QUIZ badges hook on the freshly persisted attempt - NOT inside
  // issueCertificate, whose gates (lessons complete + first issuance) would
  // miss a perfect score on a retake. Idempotent across retakes by construction.
  if (score === 100) {
    await evaluateAndAwardBadges(userId, ["PERFECT_QUIZ"], { quizId: attempt.quizId });
    // Weekly quest: a perfect quiz this week.
    await recordQuestProgress(userId, "PERFECT_QUIZ", new Date(), { amount: 1 });
  }

  // Gate: a passing attempt issues the certificate (with the score). issueCertificate
  // re-checks lessons-complete + idempotence internally, so calling it on every pass
  // is safe (no double issuance, no emission without completed lessons).
  if (passed && quiz) {
    await issueCertificate(userId, quiz.pathId, { score, passThreshold: threshold });
  }

  // Return explanations for the review UI.
  return { ok: true, score, passed, results };
}
