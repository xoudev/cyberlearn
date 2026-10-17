/**
 * The corrections the console makes to what an account learned: the
 * placement test sat again, the wait after an exam lifted, one lesson put
 * back or marked finished. Each one refuses when there is nothing to do,
 * writes nothing then, and otherwise lands with its audit row in one
 * transaction. Prisma is mocked: the rules and the writes are what is read.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { lessonProgressRepository } from "../repositories/lesson-progress.repository.js";
import { placementRepository } from "../repositories/placement.repository.js";
import { quizRepository } from "../repositories/quiz.repository.js";
import { auditLogRepository } from "../repositories/audit-log.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    userPlacementResult: { findUnique: vi.fn(), delete: vi.fn() },
    userSkipWaiver: { deleteMany: vi.fn() },
    lesson: { findUnique: vi.fn() },
    userLessonProgress: { deleteMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
    lessonQuizAnswer: { deleteMany: vi.fn() },
    reviewCard: { deleteMany: vi.fn() },
    reviewSchedule: { deleteMany: vi.fn() },
    quiz: { findUnique: vi.fn() },
    quizAttempt: { findFirst: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      quizAttempt: { findMany: vi.fn() },
      auditLog: { findMany: vi.fn(), findFirst: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const LESSON = "33333333-3333-4333-8333-333333333333";
const PATH = "44444444-4444-4444-8444-444444444444";
const BY = { actorId: ACTOR };
const HOUR = 3_600_000;

function audited(): Record<string, unknown> | undefined {
  const [call] = tx.auditLog.create.mock.calls as [[{ data: Record<string, unknown> }]] | [];
  return call?.[0].data;
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.auditLog.create.mockResolvedValue({});
  tx.userPlacementResult.delete.mockResolvedValue({});
  tx.userLessonProgress.upsert.mockResolvedValue({});
  for (const model of [
    tx.userLessonProgress,
    tx.lessonQuizAnswer,
    tx.reviewCard,
    tx.reviewSchedule,
    tx.userSkipWaiver,
  ]) {
    model.deleteMany.mockResolvedValue({ count: 0 });
  }
});

describe("placementRepository.reset", () => {
  it("says there is no test to reset, and writes nothing", async () => {
    tx.userPlacementResult.findUnique.mockResolvedValue(null);
    await expect(placementRepository.reset(USER, BY)).resolves.toEqual({
      ok: false,
      reason: "NO_RESULT",
    });
    expect(tx.userSkipWaiver.deleteMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("removes the result and the test's own waivers, and logs the scores that went", async () => {
    tx.userPlacementResult.findUnique.mockResolvedValue({
      id: "result-1",
      devScore: 80,
      cybersecScore: 40,
      networkScore: 10,
    });
    tx.userSkipWaiver.deleteMany.mockResolvedValue({ count: 12 });

    const result = await placementRepository.reset(USER, BY);

    expect(result).toEqual({
      ok: true,
      scores: { dev: 80, cybersec: 40, network: 10 },
      waiversRemoved: 12,
    });
    expect(tx.userPlacementResult.delete).toHaveBeenCalledWith({ where: { id: "result-1" } });
    // Only the waivers the test granted: any other reason stays.
    expect(tx.userSkipWaiver.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER, grantReason: "placement_test" },
    });
    expect(audited()).toEqual({
      actorId: ACTOR,
      action: "admin.user.placement.reset",
      targetType: "User",
      targetId: USER,
      metadata: { dev: 80, cybersec: 40, network: 10, waiversRemoved: 12 },
    });
  });
});

describe("placementRepository.lastResetAt", () => {
  it("reads the newest reset of this account's test from the audit log", async () => {
    const at = new Date("2026-10-17T09:00:00Z");
    mockPrisma.auditLog.findFirst.mockResolvedValue({ createdAt: at });

    await expect(placementRepository.lastResetAt(USER)).resolves.toEqual(at);
    expect(mockPrisma.auditLog.findFirst).toHaveBeenCalledWith({
      where: { targetType: "User", targetId: USER, action: "admin.user.placement.reset" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
  });

  it("says when it was never reset", async () => {
    mockPrisma.auditLog.findFirst.mockResolvedValue(null);
    await expect(placementRepository.lastResetAt(USER)).resolves.toBeNull();
  });
});

describe("lessonProgressRepository.correct", () => {
  beforeEach(() => {
    tx.lesson.findUnique.mockResolvedValue({ title: "Le modèle OSI" });
  });

  it("refuses a lesson that does not exist", async () => {
    tx.lesson.findUnique.mockResolvedValue(null);
    await expect(lessonProgressRepository.correct(USER, LESSON, "reset", BY)).resolves.toEqual({
      ok: false,
      reason: "NO_LESSON",
    });
    expect(tx.userLessonProgress.deleteMany).not.toHaveBeenCalled();
  });

  it("puts a lesson back to never opened: progress, answers, cards and schedule", async () => {
    tx.userLessonProgress.deleteMany.mockResolvedValue({ count: 1 });
    tx.lessonQuizAnswer.deleteMany.mockResolvedValue({ count: 4 });
    tx.reviewCard.deleteMany.mockResolvedValue({ count: 2 });
    tx.reviewSchedule.deleteMany.mockResolvedValue({ count: 1 });

    const result = await lessonProgressRepository.correct(USER, LESSON, "reset", BY);

    expect(result).toEqual({
      ok: true,
      mode: "reset",
      lessonTitle: "Le modèle OSI",
      progressRemoved: 1,
      answersRemoved: 4,
      cardsRemoved: 2,
    });
    for (const model of [
      tx.userLessonProgress,
      tx.lessonQuizAnswer,
      tx.reviewCard,
      tx.reviewSchedule,
    ]) {
      expect(model.deleteMany).toHaveBeenCalledWith({ where: { userId: USER, lessonId: LESSON } });
    }
    expect(audited()).toEqual({
      actorId: ACTOR,
      action: "admin.user.lesson_progress.correct",
      targetType: "User",
      targetId: USER,
      metadata: {
        lessonId: LESSON,
        mode: "reset",
        progressRemoved: 1,
        answersRemoved: 4,
        cardsRemoved: 2,
        schedulesRemoved: 1,
      },
    });
  });

  it("says when the lesson was never touched, and logs nothing", async () => {
    await expect(lessonProgressRepository.correct(USER, LESSON, "reset", BY)).resolves.toEqual({
      ok: false,
      reason: "NOTHING_TO_RESET",
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("marks a lesson finished, and nothing else: no XP, no streak, no badge", async () => {
    const now = new Date("2026-10-17T09:00:00Z");
    tx.userLessonProgress.findUnique.mockResolvedValue({ status: "IN_PROGRESS" });

    const result = await lessonProgressRepository.correct(USER, LESSON, "complete", BY, now);

    expect(result).toEqual({
      ok: true,
      mode: "complete",
      lessonTitle: "Le modèle OSI",
      previousStatus: "IN_PROGRESS",
    });
    expect(tx.userLessonProgress.upsert).toHaveBeenCalledWith({
      where: { userId_lessonId: { userId: USER, lessonId: LESSON } },
      create: { userId: USER, lessonId: LESSON, status: "COMPLETED", completedAt: now },
      update: { status: "COMPLETED", completedAt: now },
    });
    expect(audited()).toMatchObject({
      metadata: { lessonId: LESSON, mode: "complete", previousStatus: "IN_PROGRESS" },
    });
  });

  it("refuses to mark finished a lesson that already is", async () => {
    tx.userLessonProgress.findUnique.mockResolvedValue({ status: "COMPLETED" });
    await expect(lessonProgressRepository.correct(USER, LESSON, "complete", BY)).resolves.toEqual({
      ok: false,
      reason: "ALREADY_COMPLETED",
    });
    expect(tx.userLessonProgress.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("quizRepository.waiveCooldown", () => {
  const now = new Date("2026-10-17T12:00:00Z");

  beforeEach(() => {
    tx.quiz.findUnique.mockResolvedValue({ id: "quiz-1", path: { title: "Linux" } });
    tx.quizAttempt.updateMany.mockResolvedValue({ count: 1 });
  });

  it("refuses a path without an exam", async () => {
    tx.quiz.findUnique.mockResolvedValue(null);
    await expect(quizRepository.waiveCooldown(USER, PATH, BY, now)).resolves.toEqual({
      ok: false,
      reason: "NO_EXAM",
    });
  });

  it.each([
    ["no attempt", null],
    [
      "an attempt still running in its time",
      {
        id: "a-1",
        startedAt: new Date(now.getTime() - 10 * 60_000),
        submittedAt: null,
        cooldownWaivedAt: null,
      },
    ],
    [
      "a wait already over",
      {
        id: "a-1",
        startedAt: new Date(now.getTime() - 50 * HOUR),
        submittedAt: new Date(now.getTime() - 49 * HOUR),
        cooldownWaivedAt: null,
      },
    ],
    [
      "a wait already lifted",
      {
        id: "a-1",
        startedAt: new Date(now.getTime() - 2 * HOUR),
        submittedAt: new Date(now.getTime() - HOUR),
        cooldownWaivedAt: new Date(now.getTime() - 1000),
      },
    ],
  ])("refuses with %s, and writes nothing", async (_, latest) => {
    tx.quizAttempt.findFirst.mockResolvedValue(latest);
    await expect(quizRepository.waiveCooldown(USER, PATH, BY, now)).resolves.toEqual({
      ok: false,
      reason: "NO_COOLDOWN",
    });
    expect(tx.quizAttempt.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("stamps the latest attempt once, and logs when the wait would have ended", async () => {
    const submittedAt = new Date(now.getTime() - 2 * HOUR);
    tx.quizAttempt.findFirst.mockResolvedValue({
      id: "a-1",
      startedAt: new Date(submittedAt.getTime() - 20 * 60_000),
      submittedAt,
      cooldownWaivedAt: null,
      answers: { drawnQuestionIds: ["q-1"] },
    });

    const result = await quizRepository.waiveCooldown(USER, PATH, BY, now);

    const waitEndedAt = new Date(submittedAt.getTime() + 48 * HOUR);
    expect(result).toEqual({ ok: true, kind: "waiting", pathTitle: "Linux", waitEndedAt });
    expect(tx.quizAttempt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER, quizId: "quiz-1" } }),
    );
    expect(tx.quizAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: "a-1", cooldownWaivedAt: null },
      data: { cooldownWaivedAt: now },
    });
    expect(audited()).toEqual({
      actorId: ACTOR,
      action: "admin.user.exam_cooldown.waived",
      targetType: "User",
      targetId: USER,
      metadata: { pathId: PATH, attemptId: "a-1", waitEndedAt: waitEndedAt.toISOString() },
    });
  });

  it("logs nothing when a second click got there first", async () => {
    tx.quizAttempt.findFirst.mockResolvedValue({
      id: "a-1",
      startedAt: new Date(now.getTime() - 2 * HOUR),
      submittedAt: new Date(now.getTime() - HOUR),
      cooldownWaivedAt: null,
    });
    tx.quizAttempt.updateMany.mockResolvedValue({ count: 0 });
    await expect(quizRepository.waiveCooldown(USER, PATH, BY, now)).resolves.toEqual({
      ok: false,
      reason: "NO_COOLDOWN",
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("closes an attempt never handed in and out of time, with no wait after it", async () => {
    const startedAt = new Date(now.getTime() - 3 * 24 * HOUR);
    tx.quizAttempt.findFirst.mockResolvedValue({
      id: "a-1",
      startedAt,
      submittedAt: null,
      cooldownWaivedAt: null,
      answers: { drawnQuestionIds: ["q-1", "q-2"] },
    });

    const result = await quizRepository.waiveCooldown(USER, PATH, BY, now);

    expect(result).toEqual({ ok: true, kind: "expired", pathTitle: "Linux", startedAt });
    // Closed as the exam closes it (startExam), and its wait lifted in the same write.
    expect(tx.quizAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: "a-1", submittedAt: null },
      data: {
        score: 0,
        passed: false,
        answers: { drawnQuestionIds: ["q-1", "q-2"], expired: true },
        submittedAt: now,
        cooldownWaivedAt: now,
      },
    });
    expect(audited()).toEqual({
      actorId: ACTOR,
      action: "admin.user.exam_cooldown.waived",
      targetType: "User",
      targetId: USER,
      metadata: { pathId: PATH, attemptId: "a-1", expiredAttemptClosed: true },
    });
  });

  it("logs nothing when the expired attempt was closed in the meantime", async () => {
    tx.quizAttempt.findFirst.mockResolvedValue({
      id: "a-1",
      startedAt: new Date(now.getTime() - 2 * HOUR),
      submittedAt: null,
      cooldownWaivedAt: null,
      answers: {},
    });
    tx.quizAttempt.updateMany.mockResolvedValue({ count: 0 });
    await expect(quizRepository.waiveCooldown(USER, PATH, BY, now)).resolves.toEqual({
      ok: false,
      reason: "NO_COOLDOWN",
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("quizRepository.latestAttemptsForConsole", () => {
  it("keeps each exam's newest attempt, and never reads the answers", async () => {
    const row = (id: string, pathId: string, startedAt: string) => ({
      id,
      score: 60,
      passed: false,
      startedAt: new Date(startedAt),
      submittedAt: new Date(startedAt),
      cooldownWaivedAt: null,
      quiz: { pathId, path: { title: `Parcours ${pathId}` } },
    });
    mockPrisma.quizAttempt.findMany.mockResolvedValue([
      row("a-3", "p-1", "2026-10-16T10:00:00Z"),
      row("a-2", "p-2", "2026-10-15T10:00:00Z"),
      row("a-1", "p-1", "2026-10-10T10:00:00Z"),
    ]);

    const latest = await quizRepository.latestAttemptsForConsole(USER);

    expect(latest.map((attempt) => attempt.attemptId)).toEqual(["a-3", "a-2"]);
    const [query] = mockPrisma.quizAttempt.findMany.mock.calls[0] as [
      { select: Record<string, unknown> },
    ];
    expect(query.select).not.toHaveProperty("answers");
  });
});

describe("auditLogRepository.recentForUser", () => {
  it("reads what was done to the account and what it did, newest first", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    await auditLogRepository.recentForUser(USER, 10);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ targetId: USER }, { actorId: USER }] },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 10,
      }),
    );
  });
});
