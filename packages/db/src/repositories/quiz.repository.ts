import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

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
