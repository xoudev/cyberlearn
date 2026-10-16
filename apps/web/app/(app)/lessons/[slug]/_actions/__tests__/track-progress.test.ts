import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeLevel } from "@cyberlearn/lib";

const LESSON_ID = "11111111-1111-4111-8111-111111111111";

const m = vi.hoisted(() => ({
  preferencesFindUnique: vi.fn<() => Promise<{ spacedRepetition: boolean } | null>>(() =>
    Promise.resolve(null),
  ),
  findReadableById: vi.fn(),
  pathLockOf: vi.fn<() => Promise<{ slug: string; title: string } | null>>(() =>
    Promise.resolve(null),
  ),
  findForGamification: vi.fn(),
  findProgress: vi.fn(),
  findAllActive: vi.fn(),
  findUserBadgeIds: vi.fn(),
  findCriterionFacts: vi.fn(),
  findQuizAnswers: vi.fn(),
  enqueueCards: vi.fn<(...args: unknown[]) => Promise<number>>(() => Promise.resolve(0)),
  transaction: vi.fn(),
  tx: {
    userLessonProgress: { updateMany: vi.fn(), createMany: vi.fn() },
    user: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
    userBadge: { createManyAndReturn: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    reviewSchedule: { upsert: vi.fn() },
    userActivityDay: { upsert: vi.fn() },
    season: { findFirst: vi.fn() },
    xpLedger: { create: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireRequestUser: vi.fn().mockResolvedValue({ id: "u1" }),
}));
vi.mock("@/lib/certificates/check-and-issue", () => ({
  checkAndIssueCertificates: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/lessons/access", () => ({ pathLockOf: m.pathLockOf }));
vi.mock("@cyberlearn/db", () => ({
  prisma: {
    // Read by revisionsEnabled, which decides whether completing a lesson also
    // schedules its first review. Null is an account that has expressed no
    // preference, which the helper treats as the schema default: on.
    userPreferences: { findUnique: m.preferencesFindUnique },
    $transaction: m.transaction,
  },
  // The lesson as completion reads it: only one the reader may open.
  lessonRepository: { findProgress: m.findProgress, findReadableById: m.findReadableById },
  badgeRepository: {
    findAllActive: m.findAllActive,
    findUserBadgeIds: m.findUserBadgeIds,
    findCriterionFacts: m.findCriterionFacts,
  },
  userRepository: { findForGamification: m.findForGamification },
  lessonQuizRepository: { findForLesson: m.findQuizAnswers },
  reviewCardRepository: { enqueueForLesson: m.enqueueCards },
}));

import { completeLesson } from "../track-progress";

// Mutable XP the tx mock reads/writes so creditXp's read-modify-write sees the
// evolving total (lesson credit 90→110, then badge credit 110→160).
let xpState = 90;

const XP_BADGE = {
  id: "b1",
  name: "Hacktiviste",
  description: "Atteignez 100 XP.",
  rarity: "EPIC",
  xpReward: 50,
  isActive: true,
  criterionType: "XP_THRESHOLD",
  criterionData: { threshold: 100 },
};

beforeEach(() => {
  vi.clearAllMocks();
  m.findReadableById.mockResolvedValue({ xpReward: 20, slug: "sql-injection", category: "DEV" });
  m.findForGamification.mockResolvedValue({
    xpTotal: 90,
    level: computeLevel(90).level,
    streakDays: 0,
    longestStreak: 0,
    streakFreezes: 1,
    lastActiveAt: new Date("2026-01-01T12:00:00Z"),
  });
  m.findProgress.mockResolvedValue(null); // first completion
  m.findAllActive.mockResolvedValue([XP_BADGE]);
  m.findUserBadgeIds.mockResolvedValue(new Set());
  m.findCriterionFacts.mockResolvedValue({
    completedLessons: [],
    completedPathIds: [],
    totalCertificates: 0,
    perfectQuizCount: 0,
    placementScores: null,
  });
  m.transaction.mockImplementation((cb: (tx: unknown) => Promise<unknown>) => cb(m.tx));
  // The in-transaction claim decides whether this is the first completion:
  // one row flipped means this caller won it.
  m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 1 });
  m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 0 });
  m.tx.userBadge.createManyAndReturn.mockResolvedValue([{ badgeId: "b1" }]);
  m.tx.season.findFirst.mockResolvedValue(null);
  m.tx.xpLedger.create.mockResolvedValue({});
  // creditXp reads/writes the user's XP inside the tx; track it statefully so the
  // lesson credit (90→110) and the badge credit (110→160) chain correctly.
  xpState = 90;
  m.tx.user.findUniqueOrThrow.mockImplementation(() =>
    Promise.resolve({ xpTotal: xpState, level: computeLevel(xpState).level }),
  );
  m.tx.user.update.mockImplementation(
    (args: { data: { xpTotal?: number | { increment: number } } }) => {
      const xp = args.data.xpTotal;
      if (typeof xp === "number") xpState = xp;
      else if (xp && typeof xp.increment === "number") xpState += xp.increment;
      return Promise.resolve({});
    },
  );
});

describe("completeLesson - badge xpReward crediting (interactive transaction)", () => {
  it("credits lesson XP + badge XP atomically and reports both to the client", async () => {
    const result = await completeLesson(LESSON_ID);

    // Lesson reward (20) + badge reward (50).
    expect(result.xpGained).toBe(70);
    expect(result.newBadges).toEqual([{ name: "Hacktiviste", rarity: "EPIC", xpReward: 50 }]);

    // creditXp increments lesson XP (+20) then badge XP (+50); the streak-only
    // update carries no xpTotal and is filtered out.
    const xpUpdates = m.tx.user.update.mock.calls
      .map((c) => (c[0] as { data: { xpTotal?: { increment: number } } }).data.xpTotal?.increment)
      .filter((x): x is number => typeof x === "number");
    expect(xpUpdates).toEqual([20, 50]);

    // Final level derives from the credited total.
    expect(result.newLevel).toBe(computeLevel(160).level);
    expect(result.leveledUp).toBe(computeLevel(160).level > computeLevel(90).level);
  });

  it("stamps the inserted row and notifies with xpReward metadata", async () => {
    await completeLesson(LESSON_ID);

    expect(m.tx.userBadge.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        {
          userId: "u1",
          badgeId: "b1",
          context: { lessonId: LESSON_ID, xpCredited: 50 },
        },
      ],
      skipDuplicates: true,
      select: { badgeId: true },
    });

    const notifArg = m.tx.notification.createMany.mock.calls[0]?.[0] as {
      data: { metadata: Record<string, unknown> }[];
    };
    expect(notifArg.data[0]?.metadata).toEqual({ badgeId: "b1", rarity: "EPIC", xpReward: 50 });
  });

  it("credits nothing when the badge row lost a concurrent race (idempotence)", async () => {
    m.tx.userBadge.createManyAndReturn.mockResolvedValue([]);

    const result = await completeLesson(LESSON_ID);

    expect(result.xpGained).toBe(20); // lesson XP only
    expect(result.newBadges).toHaveLength(0);
    // Only the lesson XP is credited; no badge credit when the row lost the race.
    const xpUpdates = m.tx.user.update.mock.calls
      .map((c) => (c[0] as { data: { xpTotal?: { increment: number } } }).data.xpTotal?.increment)
      .filter((x): x is number => typeof x === "number");
    expect(xpUpdates).toEqual([20]);
  });

  it("does not re-credit anything on an already-completed lesson", async () => {
    m.findProgress.mockResolvedValue({ status: "COMPLETED" });
    // Nothing left to flip, and the insert conflicts with the existing row.
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 0 });

    const result = await completeLesson(LESSON_ID);

    expect(result.alreadyCompleted).toBe(true);
    expect(result.xpGained).toBe(0);
    expect(result.newBadges).toHaveLength(0);
    expect(m.tx.userBadge.createManyAndReturn).not.toHaveBeenCalled();
  });

  it("credits nothing when a concurrent submission won the completion claim", async () => {
    // The pre-transaction read said IN_PROGRESS, but by the time the
    // transaction ran another request had already flipped the row.
    m.findProgress.mockResolvedValue(null);
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 0 });

    const result = await completeLesson(LESSON_ID);

    expect(result.alreadyCompleted).toBe(true);
    expect(result.xpGained).toBe(0);
    expect(m.tx.xpLedger.create).not.toHaveBeenCalled();
    expect(m.tx.userBadge.createManyAndReturn).not.toHaveBeenCalled();
    expect(m.tx.reviewSchedule.upsert).not.toHaveBeenCalled();
    expect(m.tx.userActivityDay.upsert).not.toHaveBeenCalled();
  });

  it("schedules the first review on a first completion", async () => {
    m.findProgress.mockResolvedValue(null);
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 1 });

    await completeLesson(LESSON_ID);

    expect(m.tx.reviewSchedule.upsert).toHaveBeenCalledTimes(1);
  });

  it("schedules nothing when the learner has switched revisions off", async () => {
    // The point of the switch: the queue stops being fed. Everything else about
    // finishing a lesson - the XP, the badges, the streak - is untouched, which
    // is why the credit is asserted alongside the absence.
    m.preferencesFindUnique.mockResolvedValueOnce({ spacedRepetition: false });
    m.findProgress.mockResolvedValue(null);
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 1 });

    const result = await completeLesson(LESSON_ID);

    expect(m.tx.reviewSchedule.upsert).not.toHaveBeenCalled();
    expect(result.xpGained).toBeGreaterThan(0);
  });

  it("treats a fresh insert as the first completion", async () => {
    // No progress row existed, so the conditional update matched nothing and
    // the insert is what claims the completion.
    m.findProgress.mockResolvedValue(null);
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 1 });

    const result = await completeLesson(LESSON_ID);

    expect(result.alreadyCompleted).toBe(false);
    expect(result.xpGained).toBe(70);
  });

  it("writes the LEVEL_UP notification with the badge-inclusive totals", async () => {
    await completeLesson(LESSON_ID);

    const before = computeLevel(90).level;
    const after = computeLevel(160).level;
    if (after > before) {
      const callArg = m.tx.notification.create.mock.calls[0]?.[0] as {
        data: { type: string; metadata: Record<string, unknown> };
      };
      expect(callArg.data.type).toBe("LEVEL_UP");
      expect(callArg.data.metadata).toEqual({
        previousLevel: before,
        newLevel: after,
        xpTotal: 160,
      });
    } else {
      expect(m.tx.notification.create).not.toHaveBeenCalled();
    }
  });
});

describe("completeLesson - who may complete what", () => {
  it("pays nothing for a lesson still locked in its path", async () => {
    // The app's catalogue opened mission 8 of a path whose screen shows it
    // locked: the completion route reached this with its id.
    m.pathLockOf.mockResolvedValueOnce({ slug: "python-bases", title: "Python : les bases" });

    const result = await completeLesson(LESSON_ID);

    expect(m.pathLockOf).toHaveBeenCalledWith("u1", LESSON_ID);
    expect(result).toMatchObject({ alreadyCompleted: false, xpGained: 0, newBadges: [] });
    // Not an empty result the app would announce as a completion worth 0 XP.
    expect(result.refusal).toBe("Termine d'abord la leçon précédente du parcours.");
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("pays nothing for a lesson the reader may not open, and says why", async () => {
    // A draft, an archived lesson, or a class's own lesson for someone outside it.
    m.findReadableById.mockResolvedValueOnce(null);

    const result = await completeLesson(LESSON_ID);

    expect(m.findReadableById).toHaveBeenCalledWith(LESSON_ID, "u1");
    expect(result.xpGained).toBe(0);
    expect(result.refusal).toBe("Leçon introuvable.");
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("completes it once its path lets the reader open it", async () => {
    // Default mocks: the lesson is readable and nothing locks it.
    const result = await completeLesson(LESSON_ID);

    expect(result.xpGained).toBe(70);
    expect(result.refusal).toBeNull();
    expect(m.transaction).toHaveBeenCalled();
  });
});

/** The `data` a mocked Prisma write was first called with. */
function dataOf(fn: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  // SAFETY: both writes checked here are called with a single `{ data }` argument.
  return (fn.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
}

describe("completeLesson - the quiz score", () => {
  const QUIZZES = [
    '<Quiz id="q-1" question="?" options={["a", "b"]} correct={0} />',
    '<Quiz id="q-2" question="?" options={["a", "b"]} correct={1} />',
    '<Quiz id="q-3" question="?" options={["a", "b"]} correct={1} />',
  ].join("\n\n");

  beforeEach(() => {
    m.findReadableById.mockResolvedValue({
      xpReward: 20,
      slug: "listes",
      category: "DEV",
      contentMdx: `## Section\n\n${QUIZZES}`,
    });
    m.findQuizAnswers.mockResolvedValue([
      { quizId: "q-1", selected: 0, correct: true },
      { quizId: "q-2", selected: 0, correct: false },
      { quizId: "q-3", selected: 1, correct: true },
      // An answer to a quiz the lesson no longer has does not count.
      { quizId: "q-old", selected: 0, correct: true },
    ]);
  });

  it("fixes right answers out of the lesson's quizzes on the completion", async () => {
    const result = await completeLesson(LESSON_ID);
    expect(result.quizScore).toEqual({ correct: 2, total: 3 });
    expect(dataOf(m.tx.userLessonProgress.updateMany)).toMatchObject({
      status: "COMPLETED",
      quizCorrect: 2,
      quizTotal: 3,
    });
  });

  it("writes it on a freshly inserted row too", async () => {
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 1 });
    await completeLesson(LESSON_ID);
    expect(dataOf(m.tx.userLessonProgress.createMany)).toMatchObject({
      quizCorrect: 2,
      quizTotal: 3,
    });
  });

  it("leaves it empty for a lesson without quizzes", async () => {
    m.findReadableById.mockResolvedValue({
      xpReward: 20,
      slug: "texte",
      category: "DEV",
      contentMdx: "## Section\n\nDu texte.",
    });
    const result = await completeLesson(LESSON_ID);
    expect(result.quizScore).toBeNull();
    expect(m.findQuizAnswers).not.toHaveBeenCalled();
    expect(dataOf(m.tx.userLessonProgress.updateMany)).toMatchObject({
      quizCorrect: null,
      quizTotal: null,
    });
  });
});

describe("completeLesson - the review cards", () => {
  const QUIZZES = [
    '<Quiz id="q-1" question="?" options={["a", "b"]} correct={0} />',
    '<Quiz id="q-2" question="?" options={["a", "b"]} correct={1} />',
    '<Quiz id="q-3" question="?" options={["a", "b"]} correct={1} />',
    '<Quiz id="q-4" question="?" options={["a", "b"]} correct={1} />',
  ].join("\n\n");
  // 10:00 in Paris: the next day is the 12th, a week later the 18th.
  const NOW = new Date("2026-10-11T08:00:00Z");

  function lesson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      xpReward: 20,
      slug: "linux-permissions",
      title: "Les permissions",
      audience: "CATALOGUE",
      category: "DEV",
      contentMdx: `## Section\n\n${QUIZZES}`,
      ...overrides,
    };
  }

  /** The cards handed to the repository, over every call. */
  function enqueued(): unknown[] {
    return m.enqueueCards.mock.calls.flatMap((call) => call[2]);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    m.findReadableById.mockResolvedValue(lesson());
    m.findQuizAnswers.mockResolvedValue([
      { quizId: "q-1", selected: 0, correct: true },
      { quizId: "q-2", selected: 0, correct: false },
      { quizId: "q-3", selected: 1, correct: true },
      // q-4 was never answered, and q-old is gone from the lesson.
      { quizId: "q-old", selected: 0, correct: false },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enqueues the questions missed and the last one right, in the completion's transaction", async () => {
    await completeLesson(LESSON_ID);
    expect(m.enqueueCards).toHaveBeenCalledTimes(1);
    expect(m.enqueueCards).toHaveBeenCalledWith(
      "u1",
      LESSON_ID,
      [
        { quizId: "q-2", box: 1, dueAt: new Date("2026-10-12T00:00:00Z"), everCorrect: false },
        { quizId: "q-3", box: 3, dueAt: new Date("2026-10-18T00:00:00Z"), everCorrect: true },
      ],
      m.tx,
    );
  });

  it("enqueues nothing when the learner has switched revisions off", async () => {
    m.preferencesFindUnique.mockResolvedValueOnce({ spacedRepetition: false });
    await completeLesson(LESSON_ID);
    expect(enqueued()).toEqual([]);
  });

  it("enqueues nothing for a lesson completed already", async () => {
    m.findProgress.mockResolvedValue({ status: "COMPLETED" });
    m.tx.userLessonProgress.updateMany.mockResolvedValue({ count: 0 });
    m.tx.userLessonProgress.createMany.mockResolvedValue({ count: 0 });
    await completeLesson(LESSON_ID);
    expect(m.enqueueCards).not.toHaveBeenCalled();
  });

  it.each([
    ["a module review", { slug: "linux-bilan-module-1", title: "Bilan du module 1 : ton shell" }],
    ["a project", { slug: "fondamentaux-le-rendu", title: "Projet final : le rendu" }],
    ["a class lesson", { audience: "CLASS" }],
  ])("enqueues nothing for %s", async (_label, overrides) => {
    m.findReadableById.mockResolvedValue(lesson(overrides));
    await completeLesson(LESSON_ID);
    expect(enqueued()).toEqual([]);
  });
});
