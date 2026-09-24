import type { QuizReportReason } from "@prisma/client";
import { prisma } from "../prisma.js";

export const QUIZ_REPORT_REASONS = [
  "AMBIGUOUS",
  "WRONG_ANSWER",
  "TYPO",
  "OTHER",
] as const satisfies readonly QuizReportReason[];
export type QuizReportReasonValue = (typeof QUIZ_REPORT_REASONS)[number];

// Fails to compile when the schema gains a reason this list does not have.
const everyReasonListed: Record<Exclude<QuizReportReason, QuizReportReasonValue>, never> = {};
void everyReasonListed;

/** One question's open reports, as the console lists them. */
export interface ReportedQuiz {
  lessonId: string;
  lessonTitle: string;
  lessonRefCode: string;
  quizId: string;
  reports: {
    id: string;
    reason: QuizReportReasonValue;
    comment: string | null;
    createdAt: Date;
    /** Null once the account is erased. */
    username: string | null;
  }[];
}

export const quizReportRepository = {
  /**
   * Records a learner's report on a question. Reporting the same question
   * again replaces the reason and comment, and reopens it if the team had
   * closed it: the learner is saying it is still wrong.
   */
  async upsert(
    userId: string,
    lessonId: string,
    quizId: string,
    reason: QuizReportReasonValue,
    comment: string | null,
  ): Promise<void> {
    await prisma.quizReport.upsert({
      where: { userId_lessonId_quizId: { userId, lessonId, quizId } },
      create: { userId, lessonId, quizId, reason, comment },
      update: { reason, comment, status: "OPEN", resolvedAt: null },
    });
  },

  /** The questions of a lesson this learner reported and the team has not closed. */
  async openQuizIdsFor(userId: string, lessonId: string): Promise<string[]> {
    const rows = await prisma.quizReport.findMany({
      where: { userId, lessonId, status: "OPEN" },
      select: { quizId: true },
    });
    return rows.map((r) => r.quizId);
  },

  /** How many reports this learner filed or changed since `since`: the rate limit. */
  async countSince(userId: string, since: Date): Promise<number> {
    return prisma.quizReport.count({ where: { userId, updatedAt: { gte: since } } });
  },

  async countOpen(): Promise<number> {
    return prisma.quizReport.count({ where: { status: "OPEN" } });
  },

  /** Open reports grouped by question, the most reported first. */
  async openByQuiz(): Promise<ReportedQuiz[]> {
    const rows = await prisma.quizReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        lessonId: true,
        quizId: true,
        reason: true,
        comment: true,
        createdAt: true,
        user: { select: { username: true } },
        lesson: { select: { title: true, refCode: true } },
      },
    });
    const groups = new Map<string, ReportedQuiz>();
    for (const r of rows) {
      const key = `${r.lessonId}:${r.quizId}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          lessonId: r.lessonId,
          lessonTitle: r.lesson.title,
          lessonRefCode: r.lesson.refCode,
          quizId: r.quizId,
          reports: [],
        };
        groups.set(key, group);
      }
      group.reports.push({
        id: r.id,
        reason: r.reason,
        comment: r.comment,
        createdAt: r.createdAt,
        username: r.user?.username ?? null,
      });
    }
    return [...groups.values()].sort((a, b) => b.reports.length - a.reports.length);
  },

  /** Closes every open report on a question. Returns how many were closed. */
  async resolveQuiz(lessonId: string, quizId: string): Promise<number> {
    const { count } = await prisma.quizReport.updateMany({
      where: { lessonId, quizId, status: "OPEN" },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return count;
  },
};
