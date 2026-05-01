"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qaRepository = void 0;
const prisma_js_1 = require("../prisma.js");
const QUESTION_USER_SELECT = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  level: true,
};
exports.qaRepository = {
  async findQuestionsByLesson(lessonId) {
    return prisma_js_1.prisma.lessonQuestion.findMany({
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
  async createQuestion(data) {
    return prisma_js_1.prisma.lessonQuestion.create({
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
  async createAnswer(data) {
    return prisma_js_1.prisma.lessonAnswer.create({
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
  async findAnswerWithQuestion(answerId) {
    return prisma_js_1.prisma.lessonAnswer.findUnique({
      where: { id: answerId },
      select: { id: true, questionId: true, question: { select: { userId: true } } },
    });
  },
  async acceptAnswer(answerId, questionId) {
    await prisma_js_1.prisma.$transaction([
      // Unaccept any currently accepted answer on this question
      prisma_js_1.prisma.lessonAnswer.updateMany({
        where: { questionId, isAccepted: true },
        data: { isAccepted: false },
      }),
      prisma_js_1.prisma.lessonAnswer.update({
        where: { id: answerId },
        data: { isAccepted: true },
      }),
      prisma_js_1.prisma.lessonQuestion.update({
        where: { id: questionId },
        data: { isResolved: true },
      }),
    ]);
  },
  async incrementUpvotes(answerId) {
    return prisma_js_1.prisma.lessonAnswer.update({
      where: { id: answerId },
      data: { upvotes: { increment: 1 } },
      select: { upvotes: true },
    });
  },
  async findQuestionOwner(questionId) {
    return prisma_js_1.prisma.lessonQuestion.findUnique({
      where: { id: questionId },
      select: { userId: true },
    });
  },
};
//# sourceMappingURL=qa.repository.js.map
