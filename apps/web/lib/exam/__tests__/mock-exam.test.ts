import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  checkQuizStart: vi.fn<(userId: string) => Promise<{ success: boolean }>>(),
  checkQuizSubmit: vi.fn<(userId: string) => Promise<{ success: boolean }>>(),
  pathFindFirst: vi.fn<(args: unknown) => Promise<unknown>>(),
  pathFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  findRunning: vi.fn<(userId: string, pathId: string) => Promise<unknown>>(),
  findById: vi.fn<(id: string) => Promise<unknown>>(),
  create: vi.fn<(input: { questions: unknown; timeLimitMinutes: number }) => Promise<unknown>>(),
  submit: vi.fn<(id: string, result: unknown) => Promise<boolean>>(),
  discard: vi.fn<(id: string) => Promise<void>>(),
  listHistory: vi.fn<(userId: string, pathId: string) => Promise<unknown[]>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  pathsVisibleTo: (userId: string) => ({ visibleTo: userId }),
  prisma: { path: { findFirst: m.pathFindFirst, findUnique: m.pathFindUnique } },
  mockExamRepository: {
    findRunning: m.findRunning,
    findById: m.findById,
    create: m.create,
    submit: m.submit,
    discard: m.discard,
    listHistory: m.listHistory,
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  checkQuizStart: m.checkQuizStart,
  checkQuizSubmit: m.checkQuizSubmit,
}));

const { mockExamOverview, startMockExam, submitMockExam } = await import("../mock-exam");

const PATH = "22222222-2222-4222-8222-222222222222";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";

/** A lesson with `n` quizzes whose right answer is the second option. */
function lessonMdx(prefix: string, n: number): string {
  return Array.from(
    { length: n },
    (_, k) =>
      `<Quiz id="${prefix}-${String(k)}" question="Question ${prefix} ${String(k)} ?" options={["A", "B", "C"]} correct={1} explanation="Parce que B." />`,
  ).join("\n\n");
}

const OUTLINE = {
  modules: [
    { id: "m1", position: 1, title: "Les fichiers", description: null },
    { id: "m2", position: 2, title: "Les droits", description: null },
  ],
  lessons: [
    { moduleId: "m1", lesson: { id: "l1", status: "PUBLISHED", contentMdx: lessonMdx("a", 3) } },
    { moduleId: "m1", lesson: { id: "l2", status: "PUBLISHED", contentMdx: lessonMdx("b", 2) } },
    { moduleId: "m2", lesson: { id: "l3", status: "PUBLISHED", contentMdx: lessonMdx("c", 3) } },
    { moduleId: "m2", lesson: { id: "l4", status: "DRAFT", contentMdx: lessonMdx("d", 3) } },
  ],
};

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.checkQuizStart.mockResolvedValue({ success: true });
  m.checkQuizSubmit.mockResolvedValue({ success: true });
  m.pathFindFirst.mockResolvedValue({ id: PATH, slug: "linux", title: "Linux" });
  m.pathFindUnique.mockResolvedValue(OUTLINE);
  m.findRunning.mockResolvedValue(null);
  m.listHistory.mockResolvedValue([]);
  m.create.mockImplementation((input) =>
    Promise.resolve({ id: ATTEMPT, startedAt: new Date(), ...input }),
  );
  m.submit.mockResolvedValue(true);
});

describe("mockExamOverview", () => {
  it("counts the questions of each module's published lessons, and what an exam draws", async () => {
    const overview = await mockExamOverview("u1", "linux");
    expect(overview).toMatchObject({
      pathId: PATH,
      pathTitle: "Linux",
      domains: [
        { domain: "Les fichiers", available: 5, drawn: 3 },
        { domain: "Les droits", available: 3, drawn: 3 },
      ],
      questionCount: 6,
      timeLimitMinutes: 10,
      ready: true,
      running: null,
      history: [],
    });
    expect(m.pathFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "linux", visibleTo: "u1" } }),
    );
  });

  it("is null for a path the reader may not open", async () => {
    m.pathFindFirst.mockResolvedValue(null);
    expect(await mockExamOverview("u1", "secret")).toBeNull();
    expect(await mockExamOverview("u1", "")).toBeNull();
  });
});

describe("startMockExam and submitMockExam", () => {
  it("draws without the answer key, then scores by domain on the server", async () => {
    const started = await startMockExam("u1", PATH);
    if (!started.ok) throw new Error(started.error);
    expect(started.questions).toHaveLength(6);
    expect(started.timeLimitMinutes).toBe(10);
    expect(JSON.stringify(started.questions)).not.toContain("Parce que");
    expect(JSON.stringify(started.questions)).not.toContain("correct");

    const stored = m.create.mock.calls[0]?.[0];
    m.findById.mockResolvedValue({
      id: ATTEMPT,
      userId: "u1",
      pathId: PATH,
      questions: stored?.questions,
      timeLimitMinutes: 10,
      startedAt: new Date(),
      submittedAt: null,
    });
    // Answer every question with the shown option that holds "B".
    const answers = Object.fromEntries(
      started.questions.map((q) => [String(q.index), q.options.indexOf("B")]),
    );
    const submitted = await submitMockExam("u1", ATTEMPT, answers);
    if (!submitted.ok) throw new Error(submitted.error);
    expect(submitted.late).toBe(false);
    expect(submitted.result.score).toBe(100);
    expect(submitted.result.domains).toEqual([
      { domain: "Les fichiers", correct: 3, total: 3, percent: 100 },
      { domain: "Les droits", correct: 3, total: 3, percent: 100 },
    ]);
    expect(m.submit).toHaveBeenCalledWith(
      ATTEMPT,
      expect.objectContaining({ score: 100, late: false }),
    );
  });

  it("resumes an attempt within its time, and drops one left past it", async () => {
    const refs = [{ lessonId: "l1", quizId: "a-0", domain: "Les fichiers", order: [2, 0, 1] }];
    m.findRunning.mockResolvedValue({
      id: ATTEMPT,
      questions: refs,
      timeLimitMinutes: 10,
      startedAt: new Date(Date.now() - 60_000),
    });
    const resumed = await startMockExam("u1", PATH);
    expect(resumed).toMatchObject({ ok: true, attemptId: ATTEMPT });
    if (resumed.ok) expect(resumed.questions[0]?.options).toEqual(["C", "A", "B"]);
    expect(m.create).not.toHaveBeenCalled();

    m.findRunning.mockResolvedValue({
      id: ATTEMPT,
      questions: refs,
      timeLimitMinutes: 10,
      startedAt: new Date(Date.now() - 3_600_000),
    });
    await startMockExam("u1", PATH);
    expect(m.discard).toHaveBeenCalledWith(ATTEMPT);
    expect(m.create).toHaveBeenCalledTimes(1);
  });

  it("refuses a path too thin, someone else's attempt, and one already handed in", async () => {
    m.pathFindUnique.mockResolvedValue({ modules: [], lessons: [OUTLINE.lessons[1]] });
    expect(await startMockExam("u1", PATH)).toEqual({
      ok: false,
      error: "Ce parcours n'a pas encore assez de questions pour un examen blanc.",
    });
    m.findById.mockResolvedValue({
      id: ATTEMPT,
      userId: "u2",
      pathId: PATH,
      questions: [],
      timeLimitMinutes: 10,
      startedAt: new Date(),
      submittedAt: null,
    });
    expect(await submitMockExam("u1", ATTEMPT, {})).toEqual({
      ok: false,
      error: "Examen introuvable.",
    });
    m.findById.mockResolvedValue({
      id: ATTEMPT,
      userId: "u1",
      pathId: PATH,
      questions: [],
      timeLimitMinutes: 10,
      startedAt: new Date(),
      submittedAt: new Date(),
    });
    expect(await submitMockExam("u1", ATTEMPT, {})).toEqual({
      ok: false,
      error: "Cet examen est déjà rendu.",
    });
    expect(await submitMockExam("u1", "pas-un-id", {})).toEqual({
      ok: false,
      error: "Réponses invalides.",
    });
    expect(await submitMockExam("u1", ATTEMPT, { x: 1 })).toEqual({
      ok: false,
      error: "Réponses invalides.",
    });
  });

  it("scores a late attempt and says so", async () => {
    m.findById.mockResolvedValue({
      id: ATTEMPT,
      userId: "u1",
      pathId: PATH,
      questions: [{ lessonId: "l1", quizId: "a-0", domain: "Les fichiers", order: [0, 1, 2] }],
      timeLimitMinutes: 10,
      startedAt: new Date(Date.now() - 20 * 60_000),
      submittedAt: null,
    });
    const submitted = await submitMockExam("u1", ATTEMPT, { "0": 1 });
    expect(submitted).toMatchObject({ ok: true, late: true, result: { score: 100 } });
  });
});
