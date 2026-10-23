import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What the studio's publish reads before it writes: the answers the lesson's
 * quizzes have, and the lesson as it is published now. The comparison itself
 * is quiz-impacts.test.ts.
 */

const m = vi.hoisted(() => ({
  answerCounts: vi.fn(),
  current: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  lessonFileRepository: { quizAnswerCounts: m.answerCounts },
  lessonVersionRepository: { current: m.current },
}));

const { publishQuizImpacts } = await import("../lesson-publish-quizzes.service");

const LESSON = "11111111-1111-4111-8111-111111111111";
const quiz = (correct: number): string =>
  `<Quiz id="q1" question="Quel port ?" options={["22","80","443"]} correct={${String(correct)}} />`;

beforeEach(() => {
  vi.clearAllMocks();
  m.answerCounts.mockResolvedValue([{ lessonId: LESSON, quizId: "q1", answers: 240 }]);
  m.current.mockResolvedValue({ contentMdx: `## Ports\n\n${quiz(1)}`, version: 3 });
});

describe("publishQuizImpacts", () => {
  it("names a quiz answered 240 times whose key the draft corrects", async () => {
    expect(await publishQuizImpacts(LESSON, `## Ports\n\n${quiz(2)}`)).toEqual([
      { quizId: "q1", answers: 240, change: "modified" },
    ]);
    expect(m.answerCounts).toHaveBeenCalledExactlyOnceWith([LESSON]);
    expect(m.current).toHaveBeenCalledExactlyOnceWith(LESSON);
  });

  it("is empty for a draft that leaves the quizzes as published", async () => {
    expect(await publishQuizImpacts(LESSON, `## Ports, revu\n\n${quiz(1)}`)).toEqual([]);
  });

  it("does not read the lesson where nobody answered", async () => {
    m.answerCounts.mockResolvedValue([]);
    expect(await publishQuizImpacts(LESSON, `## Ports\n\n${quiz(2)}`)).toEqual([]);
    expect(m.current).not.toHaveBeenCalled();
  });

  it("is empty for a lesson that is gone", async () => {
    m.current.mockResolvedValue(null);
    expect(await publishQuizImpacts(LESSON, `## Ports\n\n${quiz(2)}`)).toEqual([]);
  });
});
