import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn<() => Promise<{ id: string }>>(),
  placementReset: vi.fn(),
  waiveCooldown: vi.fn(),
  correct: vi.fn(),
  notify: vi.fn(),
  findPublishedPathsForLesson: vi.fn(),
  areLessonsComplete: vi.fn(),
  findProgress: vi.fn(),
  findActiveQuizByPathId: vi.fn(),
  revalidatePath: vi.fn<(path: string) => void>(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  LESSON_CORRECTIONS: ["reset", "complete"],
  placementRepository: { reset: m.placementReset },
  quizRepository: {
    waiveCooldown: m.waiveCooldown,
    findActiveQuizByPathId: m.findActiveQuizByPathId,
  },
  lessonProgressRepository: { correct: m.correct },
  notificationRepository: { create: m.notify },
  pathRepository: {
    findPublishedPathsForLesson: m.findPublishedPathsForLesson,
    areLessonsComplete: m.areLessonsComplete,
    findProgress: m.findProgress,
  },
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { correctLessonProgressAction, resetPlacementAction, waiveExamCooldownAction } = await import(
  "../learning-actions"
);

/**
 * The console's corrections to what an account learned: what each one asks
 * the repository, what it refuses, what it says it did, and what the learner
 * is told.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const TARGET = "22222222-2222-4222-8222-222222222222";
const PATH = "33333333-3333-4333-8333-333333333333";
const LESSON = "44444444-4444-4444-8444-444444444444";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN });
  m.notify.mockResolvedValue("notification-1");
  m.findPublishedPathsForLesson.mockResolvedValue([]);
});

describe("resetPlacementAction", () => {
  beforeEach(() => {
    m.placementReset.mockResolvedValue({
      ok: true,
      scores: { dev: 80, cybersec: 40, network: 10 },
      waiversRemoved: 12,
    });
  });

  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(resetPlacementAction({}, form({ userId: TARGET }))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(m.placementReset).not.toHaveBeenCalled();
  });

  it("resets the test as the administrator, then invites the learner to sit it again", async () => {
    const result = await resetPlacementAction({}, form({ userId: TARGET }));

    expect(m.placementReset).toHaveBeenCalledWith(TARGET, { actorId: ADMIN });
    expect(m.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TARGET,
        type: "ANNOUNCEMENT",
        // The site's test; the app maps it to its own screen.
        actionUrl: "/onboarding/placement-test",
      }),
    );
    expect(m.placementReset.mock.invocationCallOrder[0]).toBeLessThan(
      m.notify.mock.invocationCallOrder[0] ?? 0,
    );
    expect(result).toMatchObject({ ok: true, notifyFailed: false });
    expect(result.notice).toMatch(/développement 80 %/u);
    expect(result.notice).toMatch(/12 leçons ne sont plus dispensées/u);
  });

  it("says when there was no test to reset, and tells nobody", async () => {
    m.placementReset.mockResolvedValue({ ok: false, reason: "NO_RESULT" });
    const result = await resetPlacementAction({}, form({ userId: TARGET }));
    expect(result.error).toBe("Ce compte n'a pas passé le test de positionnement.");
    expect(m.notify).not.toHaveBeenCalled();
  });

  it("reports the reset done when only the learner's notice failed", async () => {
    m.notify.mockRejectedValue(new Error("notifications unavailable"));
    const result = await resetPlacementAction({}, form({ userId: TARGET }));
    expect(result).toMatchObject({ ok: true, notifyFailed: true });
  });
});

describe("waiveExamCooldownAction", () => {
  it("lifts the wait as the administrator, and says when the exam would have opened", async () => {
    m.waiveCooldown.mockResolvedValue({
      ok: true,
      pathTitle: "Linux",
      waitEndedAt: new Date("2026-10-19T10:00:00Z"),
    });
    const result = await waiveExamCooldownAction({}, form({ userId: TARGET, pathId: PATH }));
    expect(m.waiveCooldown).toHaveBeenCalledWith(TARGET, PATH, { actorId: ADMIN });
    expect(result.ok).toBe(true);
    expect(result.notice).toMatch(/« Linux » peut être repassé dès maintenant/u);
    expect(result.notice).toMatch(/19 octobre 2026 à 12:00/u);
  });

  it.each([
    ["NO_EXAM", "Ce parcours n'a pas d'examen."],
    ["NO_COOLDOWN", "Aucun délai d'attente en cours sur cet examen."],
  ])("says why it did nothing (%s)", async (reason, message) => {
    m.waiveCooldown.mockResolvedValue({ ok: false, reason });
    expect((await waiveExamCooldownAction({}, form({ userId: TARGET, pathId: PATH }))).error).toBe(
      message,
    );
  });

  it("refuses a path id that is not one", async () => {
    const result = await waiveExamCooldownAction({}, form({ userId: TARGET, pathId: "linux" }));
    expect(result.error).toBe("Paramètres invalides.");
    expect(m.waiveCooldown).not.toHaveBeenCalled();
  });
});

describe("correctLessonProgressAction", () => {
  it("asks for a lesson and a correction before anything else", async () => {
    expect(
      (await correctLessonProgressAction({}, form({ userId: TARGET, lessonId: "", mode: "reset" })))
        .error,
    ).toBe("Choisis une leçon.");
    expect(
      (await correctLessonProgressAction({}, form({ userId: TARGET, lessonId: LESSON, mode: "x" })))
        .error,
    ).toBe("Choisis la correction à faire.");
    expect(m.correct).not.toHaveBeenCalled();
  });

  it("puts a lesson back to never opened, and says the XP stays", async () => {
    m.correct.mockResolvedValue({
      ok: true,
      mode: "reset",
      lessonTitle: "Le modèle OSI",
      progressRemoved: 1,
      answersRemoved: 3,
      cardsRemoved: 1,
    });
    const result = await correctLessonProgressAction(
      {},
      form({ userId: TARGET, lessonId: LESSON, mode: "reset" }),
    );
    expect(m.correct).toHaveBeenCalledWith(TARGET, LESSON, "reset", { actorId: ADMIN });
    expect(result.notice).toMatch(/3 réponses aux quiz et 1 carte de révision/u);
    expect(result.notice).toMatch(/L'XP déjà gagnée reste acquise/u);
    expect(m.findPublishedPathsForLesson).not.toHaveBeenCalled();
  });

  it("marks a lesson finished, and names the paths that completes and what opens", async () => {
    m.correct.mockResolvedValue({
      ok: true,
      mode: "complete",
      lessonTitle: "Le modèle OSI",
      previousStatus: "IN_PROGRESS",
    });
    m.findPublishedPathsForLesson.mockResolvedValue([
      { id: "p-exam", slug: "reseau", title: "Réseau" },
      { id: "p-claim", slug: "osi", title: "OSI" },
      { id: "p-left", slug: "infra", title: "Infra" },
      { id: "p-done", slug: "fini", title: "Fini" },
    ]);
    m.areLessonsComplete.mockImplementation((_user: string, pathId: string) =>
      Promise.resolve(pathId !== "p-left"),
    );
    m.findProgress.mockImplementation((_user: string, pathId: string) =>
      Promise.resolve(pathId === "p-done" ? { status: "COMPLETED" } : null),
    );
    m.findActiveQuizByPathId.mockImplementation((pathId: string) =>
      Promise.resolve(pathId === "p-exam" ? { id: "quiz-1" } : null),
    );

    const result = await correctLessonProgressAction(
      {},
      form({ userId: TARGET, lessonId: LESSON, mode: "complete" }),
    );

    expect(result.notice).toMatch(/^Leçon « Le modèle OSI » marquée terminée, sans XP ni badge\./u);
    expect(result.notice).toMatch(
      /« Réseau » a toutes ses missions faites : son examen est ouvert\./u,
    );
    expect(result.notice).toMatch(
      /« OSI » a toutes ses missions faites : l'attestation se réclame/u,
    );
    expect(result.notice).not.toMatch(/Infra|Fini/u);
  });

  it.each([
    ["NO_LESSON", "Cette leçon n'existe plus."],
    ["NOTHING_TO_RESET", "Ce compte n'a rien fait sur cette leçon."],
    ["ALREADY_COMPLETED", "Cette leçon est déjà terminée."],
  ])("says why it did nothing (%s)", async (reason, message) => {
    m.correct.mockResolvedValue({ ok: false, reason });
    const result = await correctLessonProgressAction(
      {},
      form({ userId: TARGET, lessonId: LESSON, mode: "complete" }),
    );
    expect(result.error).toBe(message);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("keeps the lesson marked when only the summary of its paths fails", async () => {
    m.correct.mockResolvedValue({
      ok: true,
      mode: "complete",
      lessonTitle: "Le modèle OSI",
      previousStatus: null,
    });
    m.findPublishedPathsForLesson.mockRejectedValue(new Error("db hiccup"));
    const result = await correctLessonProgressAction(
      {},
      form({ userId: TARGET, lessonId: LESSON, mode: "complete" }),
    );
    expect(result).toMatchObject({ ok: true });
  });
});
