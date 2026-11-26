import { prisma } from "../prisma.js";

/** An answer as the page and the app need it. */
export interface RecordedQuizAnswer {
  quizId: string;
  selected: number;
  correct: boolean;
}

export const lessonQuizRepository = {
  /**
   * Keeps the first answer to a quiz, and returns the answer on record.
   *
   * A second submission - a double click, a second tab, a replayed request -
   * changes nothing: the unique index turns the insert into a no-op, and the
   * caller gets the earlier answer back to show. That is the whole rule of
   * "one attempt", and it holds because the database enforces it, not because
   * the page hid a button.
   */
  async recordFirst(
    userId: string,
    lessonId: string,
    answer: RecordedQuizAnswer,
  ): Promise<RecordedQuizAnswer> {
    await prisma.lessonQuizAnswer.createMany({
      data: [
        {
          userId,
          lessonId,
          quizId: answer.quizId,
          selected: answer.selected,
          correct: answer.correct,
        },
      ],
      skipDuplicates: true,
    });
    return prisma.lessonQuizAnswer.findUniqueOrThrow({
      where: { userId_lessonId_quizId: { userId, lessonId, quizId: answer.quizId } },
      select: { quizId: true, selected: true, correct: true },
    });
  },

  /**
   * What the console's funnel of a lesson is read from (/lessons/[id]/progress,
   * `lessonDropoff` of @cyberlearn/lib): the lesson's text, for its quizzes in
   * order, every learner's progress on it and every answer to its quizzes.
   * The team's own accounts are left out: their tests are not learners.
   * Null when there is no such lesson.
   */
  async dropoffRows(lessonId: string) {
    const learner = { role: { not: "ADMIN" as const } };
    const [lesson, progress, answers] = await Promise.all([
      prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, title: true, contentMdx: true },
      }),
      prisma.userLessonProgress.findMany({
        where: { lessonId, user: learner },
        select: { userId: true, status: true, lastAccessedAt: true },
      }),
      prisma.lessonQuizAnswer.findMany({
        where: { lessonId, user: learner },
        select: { userId: true, quizId: true, correct: true, answeredAt: true },
      }),
    ]);
    if (lesson === null) return null;
    return { lesson, progress, answers };
  },

  /** How many learners opened the lesson and finished it, for the card on its console page. */
  async startedAndCompleted(lessonId: string): Promise<{ started: number; completed: number }> {
    const learner = { role: { not: "ADMIN" as const } };
    const [started, completed] = await Promise.all([
      prisma.userLessonProgress.count({
        where: { lessonId, user: learner, status: { not: "NOT_STARTED" } },
      }),
      prisma.userLessonProgress.count({ where: { lessonId, user: learner, status: "COMPLETED" } }),
    ]);
    return { started, completed };
  },

  async findForLesson(userId: string, lessonId: string): Promise<RecordedQuizAnswer[]> {
    return prisma.lessonQuizAnswer.findMany({
      where: { userId, lessonId },
      select: { quizId: true, selected: true, correct: true },
      orderBy: { answeredAt: "asc" },
    });
  },

  /** Every answer the account gave, in every lesson, oldest first, for its GDPR export (rgpd/build-export.ts). */
  async exportFor(userId: string) {
    return prisma.lessonQuizAnswer.findMany({
      where: { userId },
      select: {
        quizId: true,
        selected: true,
        correct: true,
        answeredAt: true,
        lesson: { select: { title: true } },
      },
      orderBy: { answeredAt: "asc" },
    });
  },
};
