/**
 * Where learners stop in a lesson, as the console's lesson page reads it
 * (/lessons/[id]/progress).
 *
 * Nothing records how far into a lesson a reader scrolled. What is recorded
 * is every quiz answered (lesson_quiz_answers, one answer per quiz), and the
 * site lets nobody past a section before its quiz is answered: the last quiz a
 * learner answered on a lesson they have not finished is where they stand.
 * Somebody who has not been back for `STALL_DAYS` has stopped there.
 */

/** Days without opening the lesson after which an unfinished lesson counts as dropped. */
export const STALL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DropoffQuiz {
  id: string;
  question: string;
}

export interface DropoffProgress {
  userId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  lastAccessedAt: Date;
}

export interface DropoffAnswer {
  userId: string;
  quizId: string;
  correct: boolean;
  answeredAt: Date;
}

export interface QuizStep {
  id: string;
  /** 1-based, in the lesson's order. */
  position: number;
  question: string;
  /** Learners who answered it. */
  answered: number;
  /** Of those, the right answers. */
  correct: number;
  /** Learners who stopped right after it: their last answer, lesson unfinished, gone for a week. */
  stoppedAfter: number;
}

export interface LessonDropoff {
  /** Learners who opened the lesson at least once. */
  started: number;
  completed: number;
  /** Unfinished and not opened for `STALL_DAYS`: they stopped. */
  stalled: number;
  /** Unfinished, opened within `STALL_DAYS`: still at it. */
  ongoing: number;
  /** Stopped before answering the first quiz. */
  stoppedBeforeFirst: number;
  steps: QuizStep[];
  /** Answers to the lesson's quizzes, all learners, and the right ones. */
  answers: number;
  correctAnswers: number;
}

/**
 * The lesson's funnel: how many started and finished, and quiz by quiz, how
 * many answered, how many got it right, how many stopped right after it.
 * Answers to a quiz the lesson no longer has are left out.
 */
export function lessonDropoff(input: {
  quizzes: readonly DropoffQuiz[];
  progress: readonly DropoffProgress[];
  answers: readonly DropoffAnswer[];
  now: Date;
}): LessonDropoff {
  const position = new Map(input.quizzes.map((quiz, index) => [quiz.id, index]));
  const answers = input.answers.filter((a) => position.has(a.quizId));

  const steps: QuizStep[] = input.quizzes.map((quiz, index) => ({
    id: quiz.id,
    position: index + 1,
    question: quiz.question,
    answered: 0,
    correct: 0,
    stoppedAfter: 0,
  }));
  let correctAnswers = 0;
  for (const answer of answers) {
    const step = steps[position.get(answer.quizId) ?? -1];
    if (step === undefined) continue;
    step.answered++;
    if (answer.correct) {
      step.correct++;
      correctAnswers++;
    }
  }

  // Each learner's furthest quiz: the one furthest in the lesson, which is
  // where the lesson let them reach, whatever order they answered in.
  const furthest = new Map<string, number>();
  for (const answer of answers) {
    const at = position.get(answer.quizId) ?? -1;
    if (at > (furthest.get(answer.userId) ?? -1)) furthest.set(answer.userId, at);
  }

  // A row that says "not started" is not a learner who opened the lesson.
  const opened = input.progress.filter((row) => row.status !== "NOT_STARTED");
  const stallBefore = input.now.getTime() - STALL_DAYS * DAY_MS;
  let completed = 0;
  let stalled = 0;
  let ongoing = 0;
  let stoppedBeforeFirst = 0;
  for (const row of opened) {
    if (row.status === "COMPLETED") {
      completed++;
      continue;
    }
    if (row.lastAccessedAt.getTime() > stallBefore) {
      ongoing++;
      continue;
    }
    stalled++;
    const at = furthest.get(row.userId);
    const step = at === undefined ? undefined : steps[at];
    if (step === undefined) stoppedBeforeFirst++;
    else step.stoppedAfter++;
  }

  return {
    started: opened.length,
    completed,
    stalled,
    ongoing,
    stoppedBeforeFirst,
    steps,
    answers: answers.length,
    correctAnswers,
  };
}
