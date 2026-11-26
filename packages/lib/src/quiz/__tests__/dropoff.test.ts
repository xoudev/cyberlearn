import { describe, expect, it } from "vitest";
import { lessonDropoff, STALL_DAYS } from "../dropoff";

/** Where learners stop in a lesson, read from their quiz answers. */

const NOW = new Date("2026-11-26T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const LONG_AGO = new Date(NOW.getTime() - (STALL_DAYS + 1) * DAY);
const RECENTLY = new Date(NOW.getTime() - DAY);
const QUIZZES = [
  { id: "q1", question: "Qu'est-ce qu'une injection SQL ?" },
  { id: "q2", question: "Quelle requête est sûre ?" },
  { id: "q3", question: "Que fait un ORM ?" },
];

function answer(userId: string, quizId: string, correct = true) {
  return { userId, quizId, correct, answeredAt: RECENTLY };
}

describe("lessonDropoff", () => {
  it("counts who started, finished, stopped and is still at it", () => {
    const result = lessonDropoff({
      quizzes: QUIZZES,
      progress: [
        { userId: "done", status: "COMPLETED", lastAccessedAt: LONG_AGO },
        { userId: "gone", status: "IN_PROGRESS", lastAccessedAt: LONG_AGO },
        { userId: "busy", status: "IN_PROGRESS", lastAccessedAt: RECENTLY },
        { userId: "never", status: "NOT_STARTED", lastAccessedAt: LONG_AGO },
      ],
      answers: [],
      now: NOW,
    });
    expect(result).toMatchObject({ started: 3, completed: 1, stalled: 1, ongoing: 1 });
  });

  it("puts a learner who stopped after their furthest quiz, whatever order they answered in", () => {
    const result = lessonDropoff({
      quizzes: QUIZZES,
      progress: [
        { userId: "a", status: "IN_PROGRESS", lastAccessedAt: LONG_AGO },
        { userId: "b", status: "IN_PROGRESS", lastAccessedAt: LONG_AGO },
        { userId: "c", status: "IN_PROGRESS", lastAccessedAt: LONG_AGO },
      ],
      answers: [answer("a", "q2"), answer("a", "q1"), answer("b", "q1")],
      now: NOW,
    });
    expect(result.steps.map((s) => s.stoppedAfter)).toEqual([1, 1, 0]);
    // "c" answered nothing: stopped before the first quiz.
    expect(result.stoppedBeforeFirst).toBe(1);
  });

  it("counts the answers and the right ones, quiz by quiz, in the lesson's order", () => {
    const result = lessonDropoff({
      quizzes: QUIZZES,
      progress: [
        { userId: "a", status: "COMPLETED", lastAccessedAt: RECENTLY },
        { userId: "b", status: "COMPLETED", lastAccessedAt: RECENTLY },
      ],
      answers: [answer("a", "q1"), answer("b", "q1", false), answer("a", "q3", false)],
      now: NOW,
    });
    expect(result.steps.map((s) => [s.position, s.answered, s.correct])).toEqual([
      [1, 2, 1],
      [2, 0, 0],
      [3, 1, 0],
    ]);
    expect(result).toMatchObject({ answers: 3, correctAnswers: 1 });
  });

  it("leaves out answers to a quiz the lesson no longer has, and finished learners from the stops", () => {
    const result = lessonDropoff({
      quizzes: QUIZZES,
      progress: [{ userId: "a", status: "COMPLETED", lastAccessedAt: LONG_AGO }],
      answers: [answer("a", "removed"), answer("a", "q1")],
      now: NOW,
    });
    expect(result.answers).toBe(1);
    expect(result.steps.every((s) => s.stoppedAfter === 0)).toBe(true);
    expect(result.stoppedBeforeFirst).toBe(0);
  });

  it("puts every stalled learner of a lesson without quizzes before the first", () => {
    const result = lessonDropoff({
      quizzes: [],
      progress: [{ userId: "a", status: "IN_PROGRESS", lastAccessedAt: LONG_AGO }],
      answers: [],
      now: NOW,
    });
    expect(result).toMatchObject({ stalled: 1, stoppedBeforeFirst: 1, steps: [] });
  });
});
