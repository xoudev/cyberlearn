import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A path's final exam, shared by the site and the app: the draw, the resume,
 * the 30-minute limit, the 48-hour wait, scoring on the server, and the
 * certificate on a pass.
 */

const m = vi.hoisted(() => ({
  findActiveQuizByPathId: vi.fn(),
  findLatestAttempt: vi.fn(),
  findActiveQuestionsForDraw: vi.fn(),
  createAttempt: vi.fn(),
  updateAttemptResult: vi.fn(),
  findAttemptById: vi.fn(),
  findQuestionsByIds: vi.fn(),
  findQuizById: vi.fn(),
  areLessonsComplete: vi.fn(),
  findProgress: vi.fn(),
  certFindFirst: vi.fn(),
  checkQuizStart: vi.fn(),
  checkQuizSubmit: vi.fn(),
  issueCertificate: vi.fn(),
  evaluateAndAwardBadges: vi.fn(),
  recordQuestProgress: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  quizRepository: {
    findActiveQuizByPathId: m.findActiveQuizByPathId,
    findLatestAttempt: m.findLatestAttempt,
    findActiveQuestionsForDraw: m.findActiveQuestionsForDraw,
    createAttempt: m.createAttempt,
    updateAttemptResult: m.updateAttemptResult,
    findAttemptById: m.findAttemptById,
    findQuestionsByIds: m.findQuestionsByIds,
    findQuizById: m.findQuizById,
  },
  pathRepository: { areLessonsComplete: m.areLessonsComplete, findProgress: m.findProgress },
  prisma: { certificate: { findFirst: m.certFindFirst } },
}));
vi.mock("@/lib/rate-limit", () => ({
  checkQuizStart: m.checkQuizStart,
  checkQuizSubmit: m.checkQuizSubmit,
}));
vi.mock("@/lib/certificates/issue", () => ({ issueCertificate: m.issueCertificate }));
vi.mock("@/lib/badges/award", () => ({ evaluateAndAwardBadges: m.evaluateAndAwardBadges }));
vi.mock("@/lib/quests/progress", () => ({ recordQuestProgress: m.recordQuestProgress }));

const { examStatus, startExam, submitExam } = await import("../exam-service");

const PATH = "11111111-1111-4111-8111-111111111111";
const QUIZ = { id: "quiz-1", pathId: PATH, passThreshold: 70, questionsToDraw: 2 };
const ATTEMPT_ID = "22222222-2222-4222-8222-222222222222";
const MIN = 60_000;

const Q = (id: string, correct: string) => ({
  id,
  question: `Question ${id} ?`,
  options: [
    { id: `${id}-a`, text: "A" },
    { id: `${id}-b`, text: "B" },
  ],
  correctOptionId: correct,
  explanation: `Parce que ${id}.`,
});
const POOL = [Q("q1", "q1-a"), Q("q2", "q2-b"), Q("q3", "q3-a")];
const drawable = POOL.map(({ id, question, options }) => ({ id, question, options }));

function attempt(over: Record<string, unknown> = {}) {
  return {
    id: ATTEMPT_ID,
    userId: "user-1",
    quizId: QUIZ.id,
    startedAt: new Date(Date.now() - 5 * MIN),
    submittedAt: null,
    answers: { drawnQuestionIds: ["q1", "q2"] },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.checkQuizStart.mockResolvedValue({ success: true });
  m.checkQuizSubmit.mockResolvedValue({ success: true });
  m.findActiveQuizByPathId.mockResolvedValue(QUIZ);
  m.findQuizById.mockResolvedValue(QUIZ);
  m.areLessonsComplete.mockResolvedValue(true);
  m.findProgress.mockResolvedValue({ status: "IN_PROGRESS" });
  m.findLatestAttempt.mockResolvedValue(null);
  m.findActiveQuestionsForDraw.mockResolvedValue(drawable);
  m.createAttempt.mockImplementation((input: { answers: unknown }) =>
    Promise.resolve({ id: ATTEMPT_ID, startedAt: new Date("2026-09-24T10:00:00Z"), ...input }),
  );
  m.findQuestionsByIds.mockResolvedValue([POOL[0], POOL[1]]);
});

describe("examStatus", () => {
  it("says there is no exam when the path has none", async () => {
    m.findActiveQuizByPathId.mockResolvedValue(null);
    expect(await examStatus("user-1", PATH)).toMatchObject({ hasQuiz: false, questionCount: 0 });
  });

  it("reports the rules and whether the lessons are done", async () => {
    m.areLessonsComplete.mockResolvedValue(false);
    expect(await examStatus("user-1", PATH)).toMatchObject({
      hasQuiz: true,
      lessonsComplete: false,
      questionCount: 2,
      passThreshold: 70,
      timeLimitMinutes: 30,
      resumeStartedAt: null,
      cooldownUntil: null,
    });
  });

  it("offers to resume an attempt still within its 30 minutes", async () => {
    const running = attempt();
    m.findLatestAttempt.mockResolvedValue(running);
    expect((await examStatus("user-1", PATH)).resumeStartedAt).toEqual(running.startedAt);
  });

  it("offers no resume for an attempt past its time", async () => {
    m.findLatestAttempt.mockResolvedValue(attempt({ startedAt: new Date(Date.now() - 45 * MIN) }));
    expect((await examStatus("user-1", PATH)).resumeStartedAt).toBeNull();
  });

  it("gives the end of the 48-hour wait after a finished attempt", async () => {
    const submittedAt = new Date(Date.now() - 60 * MIN);
    m.findLatestAttempt.mockResolvedValue(attempt({ submittedAt }));
    const { cooldownUntil } = await examStatus("user-1", PATH);
    expect(cooldownUntil?.getTime()).toBe(submittedAt.getTime() + 48 * 60 * MIN);
  });

  it("hands the certificate of a completed path", async () => {
    m.findProgress.mockResolvedValue({ status: "COMPLETED" });
    m.certFindFirst.mockResolvedValue({ publicId: "cert-1" });
    expect(await examStatus("user-1", PATH)).toMatchObject({
      pathCompleted: true,
      certPublicId: "cert-1",
    });
    expect(m.findLatestAttempt).not.toHaveBeenCalled();
  });
});

describe("startExam", () => {
  it("draws the questions, without their answer key, and anchors the timer on the server", async () => {
    const result = await startExam("user-1", PATH);
    expect(result.ok).toBe(true);
    expect(result.questions).toHaveLength(2);
    for (const q of result.questions ?? []) expect(q).not.toHaveProperty("correctOptionId");
    expect(result.startedAt).toEqual(new Date("2026-09-24T10:00:00Z"));
    const [input] = m.createAttempt.mock.calls[0] as [{ answers: { drawnQuestionIds: string[] } }];
    expect(input.answers.drawnQuestionIds).toEqual(result.questions?.map((q) => q.id));
  });

  it("resumes an attempt in progress rather than burn another", async () => {
    const running = attempt();
    m.findLatestAttempt.mockResolvedValue(running);
    const result = await startExam("user-1", PATH);
    expect(result).toMatchObject({ ok: true, attemptId: ATTEMPT_ID, startedAt: running.startedAt });
    expect(result.questions?.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(m.createAttempt).not.toHaveBeenCalled();
  });

  it("fails an attempt left past its time, and starts nothing", async () => {
    m.findLatestAttempt.mockResolvedValue(attempt({ startedAt: new Date(Date.now() - 45 * MIN) }));
    const result = await startExam("user-1", PATH);
    expect(result.ok).toBe(false);
    const [id, update] = m.updateAttemptResult.mock.calls[0] as [string, { passed: boolean }];
    expect(id).toBe(ATTEMPT_ID);
    expect(update.passed).toBe(false);
    expect(m.createAttempt).not.toHaveBeenCalled();
  });

  it.each([
    [
      "the rate limit",
      () => m.checkQuizStart.mockResolvedValue({ success: false }),
      "Trop de tentatives",
    ],
    ["no exam", () => m.findActiveQuizByPathId.mockResolvedValue(null), "Aucun quiz actif"],
    ["lessons left", () => m.areLessonsComplete.mockResolvedValue(false), "Termine d'abord"],
    [
      "the 48-hour wait",
      () => m.findLatestAttempt.mockResolvedValue(attempt({ submittedAt: new Date() })),
      "déjà passé récemment",
    ],
    [
      "too few questions",
      () => m.findActiveQuestionsForDraw.mockResolvedValue([drawable[0]]),
      "pas assez",
    ],
  ])("refuses to start with %s", async (_, arrange, message) => {
    arrange();
    const result = await startExam("user-1", PATH);
    expect(result.ok).toBe(false);
    expect(result.error).toContain(message);
    expect(m.createAttempt).not.toHaveBeenCalled();
  });

  it("refuses a path id that is not one", async () => {
    expect((await startExam("user-1", "../x")).ok).toBe(false);
    expect(m.findActiveQuizByPathId).not.toHaveBeenCalled();
  });
});

describe("submitExam", () => {
  beforeEach(() => {
    m.findAttemptById.mockResolvedValue(attempt());
  });

  it("scores on the server, stores no answer key, and issues the certificate on a pass", async () => {
    const result = await submitExam("user-1", ATTEMPT_ID, { q1: "q1-a", q2: "q2-b" });
    expect(result).toMatchObject({ ok: true, score: 100, passed: true });
    expect(result.results?.[0]?.explanation).toBe("Parce que q1.");
    const [, stored] = m.updateAttemptResult.mock.calls[0] as [string, { answers: unknown }];
    expect(JSON.stringify(stored.answers)).not.toContain("correctOptionId");
    expect(m.issueCertificate).toHaveBeenCalledWith("user-1", PATH, {
      score: 100,
      passThreshold: 70,
    });
    expect(m.evaluateAndAwardBadges).toHaveBeenCalled();
  });

  it("issues nothing on a fail", async () => {
    const result = await submitExam("user-1", ATTEMPT_ID, { q1: "q1-b", q2: "q2-a" });
    expect(result).toMatchObject({ ok: true, score: 0, passed: false });
    expect(m.issueCertificate).not.toHaveBeenCalled();
  });

  it("fails a submission that arrives past the limit, whatever the answers", async () => {
    m.findAttemptById.mockResolvedValue(attempt({ startedAt: new Date(Date.now() - 32 * MIN) }));
    const result = await submitExam("user-1", ATTEMPT_ID, { q1: "q1-a", q2: "q2-b" });
    expect(result).toEqual({ ok: true, score: 0, passed: false, results: [] });
    expect(m.issueCertificate).not.toHaveBeenCalled();
  });

  it.each([
    [
      "somebody else's attempt",
      () => m.findAttemptById.mockResolvedValue(attempt({ userId: "other" })),
      "Accès refusé",
    ],
    [
      "an attempt already submitted",
      () => m.findAttemptById.mockResolvedValue(attempt({ submittedAt: new Date() })),
      "déjà soumise",
    ],
    ["a missing attempt", () => m.findAttemptById.mockResolvedValue(null), "introuvable"],
    [
      "the rate limit",
      () => m.checkQuizSubmit.mockResolvedValue({ success: false }),
      "Trop de soumissions",
    ],
  ])("refuses %s", async (_, arrange, message) => {
    arrange();
    const result = await submitExam("user-1", ATTEMPT_ID, { q1: "q1-a" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain(message);
    expect(m.updateAttemptResult).not.toHaveBeenCalled();
  });

  it("refuses an answer to a question outside the draw, or an option that does not exist", async () => {
    expect((await submitExam("user-1", ATTEMPT_ID, { q3: "q3-a" })).ok).toBe(false);
    expect((await submitExam("user-1", ATTEMPT_ID, { q1: "forged" })).ok).toBe(false);
    expect(m.updateAttemptResult).not.toHaveBeenCalled();
  });

  it("refuses a malformed id or answers", async () => {
    expect((await submitExam("user-1", "x", {})).ok).toBe(false);
    expect((await submitExam("user-1", ATTEMPT_ID, ["q1-a"])).ok).toBe(false);
    expect(m.findAttemptById).not.toHaveBeenCalled();
  });
});
