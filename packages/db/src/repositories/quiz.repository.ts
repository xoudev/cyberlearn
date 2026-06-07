import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export interface QuizOption {
  id: string;
  text: string;
}

/** Client-safe question shape (NO correctOptionId — never selected at serve). */
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
    return prisma.quiz.findUnique({ where: { id }, select: { id: true, passThreshold: true } });
  },

  countActiveQuestions(quizId: string) {
    return prisma.quizQuestion.count({ where: { quizId, isActive: true } });
  },

  /** SERVE: the select intentionally OMITS correctOptionId — the answer key
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
};
