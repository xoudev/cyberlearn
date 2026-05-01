import { prisma } from "../prisma.js";

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

  async incrementUpvotes(answerId: string) {
    return prisma.lessonAnswer.update({
      where: { id: answerId },
      data: { upvotes: { increment: 1 } },
      select: { upvotes: true },
    });
  },

  async findQuestionOwner(questionId: string) {
    return prisma.lessonQuestion.findUnique({
      where: { id: questionId },
      select: { userId: true },
    });
  },
};
