import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export type UpvoteOutcome = "ok" | "already" | "self" | "notfound";

const QUESTION_USER_SELECT = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  level: true,
} as const;

export const qaRepository = {
  async findQuestionsByLesson(lessonId: string) {
    return prisma.lessonQuestion.findMany({
      where: { lessonId, isHidden: false },
      orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        content: true,
        isResolved: true,
        createdAt: true,
        user: { select: QUESTION_USER_SELECT },
        answers: {
          where: { isHidden: false },
          orderBy: [{ isAccepted: "desc" }, { upvotes: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            content: true,
            isAccepted: true,
            upvotes: true,
            createdAt: true,
            user: { select: QUESTION_USER_SELECT },
          },
        },
        _count: { select: { answers: { where: { isHidden: false } } } },
      },
    });
  },

  async createQuestion(data: { lessonId: string; userId: string; title: string; content: string }) {
    return prisma.lessonQuestion.create({
      data,
      select: {
        id: true,
        title: true,
        content: true,
        isResolved: true,
        createdAt: true,
        user: { select: QUESTION_USER_SELECT },
        answers: false,
        _count: { select: { answers: true } },
      },
    });
  },

  async createAnswer(data: { questionId: string; userId: string; content: string }) {
    return prisma.lessonAnswer.create({
      data,
      select: {
        id: true,
        content: true,
        isAccepted: true,
        upvotes: true,
        createdAt: true,
        user: { select: QUESTION_USER_SELECT },
      },
    });
  },

  async findAnswerWithQuestion(answerId: string) {
    return prisma.lessonAnswer.findUnique({
      where: { id: answerId },
      select: { id: true, questionId: true, question: { select: { userId: true } } },
    });
  },

  async acceptAnswer(answerId: string, questionId: string) {
    await prisma.$transaction([
      // Unaccept any currently accepted answer on this question
      prisma.lessonAnswer.updateMany({
        where: { questionId, isAccepted: true },
        data: { isAccepted: false },
      }),
      prisma.lessonAnswer.update({
        where: { id: answerId },
        data: { isAccepted: true },
      }),
      prisma.lessonQuestion.update({
        where: { id: questionId },
        data: { isResolved: true },
      }),
    ]);
  },

  /**
   * Casts one upvote for an answer by a user. Idempotent (a unique
   * (answerId, userId) row) and rejects self-upvotes, so the upvote count can no
   * longer be farmed by replaying the action. The denormalized
   * LessonAnswer.upvotes count is incremented only on a genuinely new vote,
   * atomically with the vote row.
   */
  async castUpvote(answerId: string, userId: string): Promise<UpvoteOutcome> {
    const answer = await prisma.lessonAnswer.findUnique({
      where: { id: answerId },
      select: { userId: true },
    });
    if (!answer) return "notfound";
    if (answer.userId === userId) return "self";

    try {
      await prisma.$transaction(async (tx) => {
        await tx.lessonAnswerUpvote.create({ data: { answerId, userId } });
        await tx.lessonAnswer.update({
          where: { id: answerId },
          data: { upvotes: { increment: 1 } },
        });
      });
      return "ok";
    } catch (error) {
      // Unique violation on (answerId, userId) -> the user already upvoted; the
      // whole transaction rolled back, so the count was not double-incremented.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return "already";
      }
      throw error;
    }
  },

  async findQuestionOwner(questionId: string) {
    return prisma.lessonQuestion.findUnique({
      where: { id: questionId },
      select: { userId: true },
    });
  },
};
