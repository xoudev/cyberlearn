import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

/**
 * Mock exam attempts (examens blancs): the questions drawn, the answers
 * handed in, the score by domain. The rules (what is drawn, how it is
 * scored, how long it lasts) are @cyberlearn/lib/exam/mock and the service
 * in apps/web/lib/exam/mock-exam.ts; this reads and writes rows.
 */

const ATTEMPT = {
  id: true,
  userId: true,
  pathId: true,
  questions: true,
  timeLimitMinutes: true,
  startedAt: true,
  submittedAt: true,
} as const;

export const mockExamRepository = {
  /** The reader's attempt still running on this path, if any. */
  async findRunning(userId: string, pathId: string) {
    return prisma.mockExamAttempt.findFirst({
      where: { userId, pathId, submittedAt: null },
      orderBy: { startedAt: "desc" },
      select: ATTEMPT,
    });
  },

  async findById(id: string) {
    return prisma.mockExamAttempt.findUnique({ where: { id }, select: ATTEMPT });
  },

  async create(input: {
    userId: string;
    pathId: string;
    questions: Prisma.InputJsonValue;
    timeLimitMinutes: number;
  }) {
    return prisma.mockExamAttempt.create({ data: input, select: ATTEMPT });
  },

  /**
   * Hands an attempt in, once: false when it was already handed in (a second
   * tab, a double tap), and nothing is written then.
   */
  async submit(
    id: string,
    result: {
      answers: Prisma.InputJsonValue;
      score: number;
      domains: Prisma.InputJsonValue;
      late: boolean;
    },
  ): Promise<boolean> {
    const { count } = await prisma.mockExamAttempt.updateMany({
      where: { id, submittedAt: null },
      data: { ...result, submittedAt: new Date() },
    });
    return count === 1;
  },

  /** An attempt left running past its time: practice, so it is dropped rather than scored. */
  async discard(id: string): Promise<void> {
    await prisma.mockExamAttempt.deleteMany({ where: { id, submittedAt: null } });
  },

  /** The reader's last attempts handed in on this path, the most recent first. */
  async listHistory(userId: string, pathId: string, take = 5) {
    return prisma.mockExamAttempt.findMany({
      where: { userId, pathId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      take,
      select: { submittedAt: true, score: true, domains: true, late: true },
    });
  },
};
