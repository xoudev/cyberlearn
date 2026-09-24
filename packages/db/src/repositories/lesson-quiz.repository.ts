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

  async findForLesson(userId: string, lessonId: string): Promise<RecordedQuizAnswer[]> {
    return prisma.lessonQuizAnswer.findMany({
      where: { userId, lessonId },
      select: { quizId: true, selected: true, correct: true },
      orderBy: { answeredAt: "asc" },
    });
  },
};
