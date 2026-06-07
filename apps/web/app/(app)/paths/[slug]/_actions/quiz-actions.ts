"use server";

import { z } from "zod";
import { pathRepository, quizRepository } from "@cyberlearn/db";
import {
  type AttemptResultItem,
  type QuizOption,
  QUIZ_COOLDOWN_MINUTES,
  checkCanSubmit,
  drawQuestions,
  isInCooldown,
  isPassed,
  isResumable,
  scoreSubmission,
  validateSubmission,
} from "@cyberlearn/lib";
import { issueCertificate } from "@/lib/certificates/issue";
import { requireRequestUser } from "@/lib/auth";
import { checkQuizStart, checkQuizSubmit } from "@/lib/rate-limit";

export interface StartQuizResult {
  ok: boolean;
  error?: string;
  attemptId?: string;
  questions?: { id: string; question: string; options: QuizOption[] }[];
}

export interface SubmitQuizResult {
  ok: boolean;
  error?: string;
  score?: number;
  passed?: boolean;
  results?: AttemptResultItem[];
}

/** Reads the server-authoritative drawn question ids stored on an attempt. */
function readDrawnIds(answers: unknown): string[] {
  // SAFETY: answers is our own JSON ({ drawnQuestionIds: string[], ... }); read defensively.
  const obj = (answers ?? {}) as { drawnQuestionIds?: unknown };
  if (!Array.isArray(obj.drawnQuestionIds)) return [];
  return obj.drawnQuestionIds.filter((v): v is string => typeof v === "string");
}

export async function startQuizAttempt(pathId: string): Promise<StartQuizResult> {
  const user = await requireRequestUser();

  const rl = await checkQuizStart(user.id);
  if (!rl.success) return { ok: false, error: "Trop de tentatives. Réessaie plus tard." };

  const parsedPathId = z.string().uuid().safeParse(pathId);
  if (!parsedPathId.success) return { ok: false, error: "Parcours invalide." };

  const quiz = await quizRepository.findActiveQuizByPathId(parsedPathId.data);
  if (!quiz) return { ok: false, error: "Aucun quiz actif pour ce parcours." };

  // Upstream lock: the quiz is only reachable once all lessons are complete.
  // Closes the "quiz before lessons" dead-end (a passing attempt would be refused
  // at issuance, then lesson-completion would skip emission because a quiz exists).
  if (!(await pathRepository.areLessonsComplete(user.id, parsedPathId.data))) {
    return { ok: false, error: "Termine d'abord toutes les leçons du parcours." };
  }

  const now = new Date();
  const latest = await quizRepository.findLatestAttempt(user.id, quiz.id);

  // Resume: a recent un-submitted attempt — a refresh must not burn a try.
  if (latest && isResumable(latest, now, QUIZ_COOLDOWN_MINUTES)) {
    const ids = readDrawnIds(latest.answers);
    const pool = await quizRepository.findActiveQuestionsForDraw(quiz.id);
    const byId = new Map(pool.map((q) => [q.id, q]));
    const questions = ids
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => q !== undefined);
    return { ok: true, attemptId: latest.id, questions };
  }

  // Cooldown: a recently submitted attempt blocks a new start.
  if (latest && isInCooldown(latest, now, QUIZ_COOLDOWN_MINUTES)) {
    return { ok: false, error: "Tu pourras retenter ce quiz dans quelques minutes." };
  }

  // Fresh draw. Never serve fewer than questionsToDraw (would distort the denominator).
  const pool = await quizRepository.findActiveQuestionsForDraw(quiz.id);
  if (pool.length < quiz.questionsToDraw) {
    return { ok: false, error: "Quiz non prêt (pas assez de questions actives)." };
  }

  const drawn = drawQuestions(pool, quiz.questionsToDraw);
  const attempt = await quizRepository.createAttempt({
    userId: user.id,
    quizId: quiz.id,
    answers: { drawnQuestionIds: drawn.map((q) => q.id) },
  });

  // `drawn` is already the client-safe shape (no correctOptionId was selected).
  return { ok: true, attemptId: attempt.id, questions: drawn };
}

const answersSchema = z.record(z.string(), z.string());

export async function submitQuizAttempt(
  attemptId: string,
  answers: unknown,
): Promise<SubmitQuizResult> {
  const user = await requireRequestUser();

  const rl = await checkQuizSubmit(user.id);
  if (!rl.success) return { ok: false, error: "Trop de soumissions. Réessaie plus tard." };

  const parsedId = z.string().uuid().safeParse(attemptId);
  if (!parsedId.success) return { ok: false, error: "Tentative invalide." };

  const parsedAnswers = answersSchema.safeParse(answers);
  if (!parsedAnswers.success) return { ok: false, error: "Réponses invalides." };

  const attempt = await quizRepository.findAttemptById(parsedId.data);
  if (!attempt) return { ok: false, error: "Tentative introuvable." };

  // Authz + idempotence.
  const guard = checkCanSubmit(attempt, user.id);
  if (!guard.ok) {
    return {
      ok: false,
      error: guard.reason === "not-owner" ? "Accès refusé." : "Tentative déjà soumise.",
    };
  }

  const drawnIds = readDrawnIds(attempt.answers);
  if (drawnIds.length === 0) return { ok: false, error: "Tentative corrompue." };

  // Server-authoritative set (includes correctOptionId) — never returned to the client.
  const drawn = await quizRepository.findQuestionsByIds(drawnIds);

  // Reject any questionId outside the draw or any invalid optionId (zero trust).
  if (validateSubmission(parsedAnswers.data, drawn) !== null) {
    return { ok: false, error: "Réponses invalides." };
  }

  const quiz = await quizRepository.findQuizById(attempt.quizId);
  const threshold = quiz?.passThreshold ?? 70;

  const { score, results } = scoreSubmission(drawn, parsedAnswers.data);
  const passed = isPassed(score, threshold);

  // Stored answers: selection + correct/incorrect only — NEVER correctOptionId.
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

  // Gate: a passing attempt issues the certificate (with the score). issueCertificate
  // re-checks lessons-complete + idempotence internally, so calling it on every pass
  // is safe (no double issuance, no emission without completed lessons).
  if (passed && quiz) {
    await issueCertificate(user.id, quiz.pathId, { score, passThreshold: threshold });
  }

  // Return explanations for the review UI.
  return { ok: true, score, passed, results };
}
