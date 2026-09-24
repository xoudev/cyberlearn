import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A quiz answer is scored on the server, from the lesson.
 *
 * The browser only says which option was picked. Whether it is right, and
 * whether it is the first answer, are decided here.
 */

const LESSON = "11111111-1111-4111-8111-111111111111";

const m = vi.hoisted(() => ({
  lessonFindUnique: vi.fn(),
  findProgress: vi.fn(),
  recordFirst: vi.fn(),
  findForLesson: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  prisma: { lesson: { findUnique: m.lessonFindUnique } },
  lessonRepository: { findProgress: m.findProgress },
  lessonQuizRepository: { recordFirst: m.recordFirst, findForLesson: m.findForLesson },
}));

const { recordQuizAnswer, lessonQuizScore } = await import("../quiz-answer");

const MDX = [
  "## Les listes",
  "",
  '<Quiz id="q-1" question="Que renvoie notes[1] ?" options={["12", "15", "8"]} correct={1} />',
  "",
  "## Les tuples",
  "",
  '<Quiz id="q-2" question="Un tuple est-il modifiable ?" options={["Oui", "Non"]} correct={1} />',
].join("\n");

beforeEach(() => {
  vi.clearAllMocks();
  m.lessonFindUnique.mockResolvedValue({ contentMdx: MDX });
  m.findProgress.mockResolvedValue({ status: "IN_PROGRESS" });
  m.recordFirst.mockImplementation(
    (_u: string, _l: string, a: { quizId: string; selected: number; correct: boolean }) =>
      Promise.resolve(a),
  );
});

describe("recordQuizAnswer", () => {
  it("records a right answer as right", async () => {
    expect(await recordQuizAnswer("u1", LESSON, "q-1", 1)).toEqual({
      ok: true,
      selected: 1,
      correct: true,
    });
    expect(m.recordFirst).toHaveBeenCalledWith("u1", LESSON, {
      quizId: "q-1",
      selected: 1,
      correct: true,
    });
  });

  it("records a wrong answer as wrong", async () => {
    expect(await recordQuizAnswer("u1", LESSON, "q-1", 0)).toMatchObject({ correct: false });
  });

  it("hands back the earlier answer when the quiz was already answered", async () => {
    m.recordFirst.mockResolvedValue({ quizId: "q-1", selected: 2, correct: false });
    expect(await recordQuizAnswer("u1", LESSON, "q-1", 1)).toEqual({
      ok: true,
      selected: 2,
      correct: false,
    });
  });

  it("refuses a quiz the lesson does not have, or an option it does not offer", async () => {
    expect((await recordQuizAnswer("u1", LESSON, "q-9", 0)).ok).toBe(false);
    expect((await recordQuizAnswer("u1", LESSON, "q-2", 2)).ok).toBe(false);
    expect(m.recordFirst).not.toHaveBeenCalled();
  });

  it("refuses a lesson that was never opened, where access is decided", async () => {
    m.findProgress.mockResolvedValue(null);
    expect(await recordQuizAnswer("u1", LESSON, "q-1", 1)).toEqual({
      ok: false,
      error: "Leçon introuvable.",
    });
    expect(m.recordFirst).not.toHaveBeenCalled();
  });
});

describe("lessonQuizScore", () => {
  it("counts right answers to the quizzes the lesson has now", async () => {
    m.findForLesson.mockResolvedValue([
      { quizId: "q-1", selected: 1, correct: true },
      { quizId: "q-removed", selected: 0, correct: true },
    ]);
    expect(await lessonQuizScore("u1", LESSON, MDX)).toEqual({ correct: 1, total: 2 });
  });

  it("counts a quiz left unanswered as not right", async () => {
    m.findForLesson.mockResolvedValue([{ quizId: "q-2", selected: 0, correct: false }]);
    expect(await lessonQuizScore("u1", LESSON, MDX)).toEqual({ correct: 0, total: 2 });
  });

  it("is null when nothing was recorded, rather than blaming the learner for their app", async () => {
    // A completion from a mobile build that does not record answers yet.
    m.findForLesson.mockResolvedValue([]);
    expect(await lessonQuizScore("u1", LESSON, MDX)).toBeNull();
  });

  it("is null for a lesson without quizzes", async () => {
    expect(await lessonQuizScore("u1", LESSON, "## S\n\nDu texte.")).toBeNull();
    expect(m.findForLesson).not.toHaveBeenCalled();
  });
});
