import type { Prisma } from "@prisma/client";
import { QUIZ_COOLDOWN_MINUTES, cooldownEndsAt } from "@cyberlearn/lib/quiz/quiz";
import { prisma } from "../prisma.js";

/** An account's latest attempt at one path's exam, as the console shows it. */
export interface ConsoleExamAttempt {
  attemptId: string;
  pathId: string;
  pathTitle: string;
  score: number;
  passed: boolean;
  startedAt: Date;
  submittedAt: Date | null;
  cooldownWaivedAt: Date | null;
}

export type WaiveCooldownResult =
  | {
      ok: true;
      pathTitle: string;
      /** When the wait would have ended. */
      waitEndedAt: Date;
    }
  | { ok: false; reason: "NO_EXAM" | "NO_COOLDOWN" };

/** The audit action of a wait lifted from the console. */
export const EXAM_COOLDOWN_WAIVED_ACTION = "admin.user.exam_cooldown.waived";

/** Attempts read to find each exam's latest: far more than anybody sits. */
const CONSOLE_ATTEMPTS_READ = 200;

export interface QuizOption {
  id: string;
  text: string;
}

/** Client-safe question shape (NO correctOptionId - never selected at serve). */
export interface DrawableQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

/** Server-only question shape used for scoring. */
export interface ScorableQuestion extends DrawableQuestion {
  correctOptionId: string;
  explanation: string | null;
}

export const quizRepository = {
  findActiveQuizByPathId(pathId: string) {
    return prisma.quiz.findFirst({
      where: { pathId, isActive: true },
      select: { id: true, passThreshold: true, questionsToDraw: true },
    });
  },

  findQuizById(id: string) {
    return prisma.quiz.findUnique({
      where: { id },
      select: { id: true, pathId: true, passThreshold: true },
    });
  },

  countActiveQuestions(quizId: string) {
    return prisma.quizQuestion.count({ where: { quizId, isActive: true } });
  },

  /** SERVE: the select intentionally OMITS correctOptionId - the answer key
   *  never leaves Prisma at draw time. */
  async findActiveQuestionsForDraw(quizId: string): Promise<DrawableQuestion[]> {
    const rows = await prisma.quizQuestion.findMany({
      where: { quizId, isActive: true },
      select: { id: true, question: true, options: true },
    });
    // SAFETY: options is authored as [{ id, text }] JSON by admins (validated at import).
    return rows.map((r) => ({
      id: r.id,
      question: r.question,
      options: r.options as unknown as QuizOption[],
    }));
  },

  /** SCORING: server-only; includes correctOptionId. Never returned to a client. */
  async findQuestionsByIds(ids: string[]): Promise<ScorableQuestion[]> {
    const rows = await prisma.quizQuestion.findMany({
      where: { id: { in: ids } },
      select: { id: true, question: true, options: true, correctOptionId: true, explanation: true },
    });
    return rows.map((r) => ({
      id: r.id,
      question: r.question,
      // SAFETY: see findActiveQuestionsForDraw.
      options: r.options as unknown as QuizOption[],
      correctOptionId: r.correctOptionId,
      explanation: r.explanation,
    }));
  },

  findLatestAttempt(userId: string, quizId: string) {
    return prisma.quizAttempt.findFirst({
      where: { userId, quizId },
      orderBy: { startedAt: "desc" },
    });
  },

  findAttemptById(id: string) {
    return prisma.quizAttempt.findUnique({ where: { id } });
  },

  createAttempt(input: { userId: string; quizId: string; answers: Prisma.InputJsonValue }) {
    return prisma.quizAttempt.create({
      data: {
        userId: input.userId,
        quizId: input.quizId,
        score: 0,
        passed: false,
        answers: input.answers,
      },
    });
  },

  updateAttemptResult(
    id: string,
    data: { score: number; passed: boolean; answers: Prisma.InputJsonValue },
  ) {
    return prisma.quizAttempt.update({
      where: { id },
      data: {
        score: data.score,
        passed: data.passed,
        answers: data.answers,
        submittedAt: new Date(),
      },
    });
  },

  // ── Console: an account's exams ──────────────────────────────────────────────

  /**
   * The latest attempt at each path's exam, for an account's page in the
   * console: its score, when it was handed in, and whether its wait was
   * lifted. Never the answers.
   */
  async latestAttemptsForConsole(userId: string): Promise<ConsoleExamAttempt[]> {
    const rows = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: CONSOLE_ATTEMPTS_READ,
      select: {
        id: true,
        score: true,
        passed: true,
        startedAt: true,
        submittedAt: true,
        cooldownWaivedAt: true,
        quiz: { select: { pathId: true, path: { select: { title: true } } } },
      },
    });
    const seen = new Set<string>();
    const latest: ConsoleExamAttempt[] = [];
    for (const row of rows) {
      if (seen.has(row.quiz.pathId)) continue;
      seen.add(row.quiz.pathId);
      latest.push({
        attemptId: row.id,
        pathId: row.quiz.pathId,
        pathTitle: row.quiz.path.title,
        score: row.score,
        passed: row.passed,
        startedAt: row.startedAt,
        submittedAt: row.submittedAt,
        cooldownWaivedAt: row.cooldownWaivedAt,
      });
    }
    return latest;
  },

  /**
   * Lifts the wait after the latest attempt at a path's exam, so the learner
   * can sit it again now. The attempt keeps its score and its dates; only
   * cooldownWaivedAt is stamped, which the exam reads (isInCooldown).
   *
   * Refused when there is no wait to lift: no attempt, one still running, or
   * one whose wait is over or was already lifted. Read and written in one
   * transaction, with its audit row.
   */
  async waiveCooldown(
    userId: string,
    pathId: string,
    by: { actorId: string },
    now: Date = new Date(),
  ): Promise<WaiveCooldownResult> {
    return prisma.$transaction(async (tx): Promise<WaiveCooldownResult> => {
      const quiz = await tx.quiz.findUnique({
        where: { pathId },
        select: { id: true, path: { select: { title: true } } },
      });
      if (quiz === null) return { ok: false, reason: "NO_EXAM" };
      const latest = await tx.quizAttempt.findFirst({
        where: { userId, quizId: quiz.id },
        orderBy: { startedAt: "desc" },
        select: { id: true, submittedAt: true, cooldownWaivedAt: true },
      });
      // The exam's own rule (isInCooldown): waiting while now is before the end.
      const endsAt = latest === null ? null : cooldownEndsAt(latest, QUIZ_COOLDOWN_MINUTES);
      if (latest === null || endsAt === null || endsAt.getTime() <= now.getTime()) {
        return { ok: false, reason: "NO_COOLDOWN" };
      }
      // Conditional: two clicks at once stamp it once, and log it once.
      const { count } = await tx.quizAttempt.updateMany({
        where: { id: latest.id, cooldownWaivedAt: null },
        data: { cooldownWaivedAt: now },
      });
      if (count === 0) return { ok: false, reason: "NO_COOLDOWN" };
      await tx.auditLog.create({
        data: {
          actorId: by.actorId,
          action: EXAM_COOLDOWN_WAIVED_ACTION,
          targetType: "User",
          targetId: userId,
          metadata: { pathId, attemptId: latest.id, waitEndedAt: endsAt.toISOString() },
        },
      });
      return { ok: true, pathTitle: quiz.path.title, waitEndedAt: endsAt };
    });
  },

  // ── Admin CRUD (admin-gated callers only; reads include correctOptionId) ─────

  /** Full quiz for a path + active-question count (for the "not ready" warning). */
  async findQuizByPathAdmin(pathId: string) {
    const quiz = await prisma.quiz.findUnique({ where: { pathId } });
    if (!quiz) return null;
    const activeQuestionCount = await prisma.quizQuestion.count({
      where: { quizId: quiz.id, isActive: true },
    });
    return { ...quiz, activeQuestionCount };
  },

  /** One quiz per path (pathId @unique) → upsert. */
  upsertQuizByPath(input: {
    pathId: string;
    passThreshold: number;
    questionsToDraw: number;
    isActive: boolean;
  }) {
    return prisma.quiz.upsert({
      where: { pathId: input.pathId },
      create: {
        pathId: input.pathId,
        passThreshold: input.passThreshold,
        questionsToDraw: input.questionsToDraw,
        isActive: input.isActive,
      },
      update: {
        passThreshold: input.passThreshold,
        questionsToDraw: input.questionsToDraw,
        isActive: input.isActive,
      },
    });
  },

  /** Admin question list - includes correctOptionId (the admin edits the key). */
  findQuestionsAdmin(quizId: string) {
    return prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { orderIndex: "asc" },
    });
  },

  findQuestionById(id: string) {
    return prisma.quizQuestion.findUnique({ where: { id } });
  },

  createQuestion(input: {
    quizId: string;
    question: string;
    options: Prisma.InputJsonValue;
    correctOptionId: string;
    explanation: string | null;
    orderIndex: number;
    isActive: boolean;
  }) {
    return prisma.quizQuestion.create({ data: input });
  },

  updateQuestion(
    id: string,
    data: {
      question: string;
      options: Prisma.InputJsonValue;
      correctOptionId: string;
      explanation: string | null;
      orderIndex: number;
      isActive: boolean;
    },
  ) {
    return prisma.quizQuestion.update({ where: { id }, data });
  },

  deleteQuestion(id: string) {
    return prisma.quizQuestion.delete({ where: { id } });
  },
};
