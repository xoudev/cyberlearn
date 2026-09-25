import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  resultFindUnique: vi.fn<(args: unknown) => Promise<{ id: string } | null>>(),
  resultCreate: vi.fn<(args: unknown) => unknown>(),
  questionFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  lessonFindMany: vi.fn<(args: unknown) => Promise<{ id: string }[]>>(),
  waiverUpsert: vi.fn<(args: unknown) => unknown>(),
  pathFindFirst: vi.fn<(args: unknown) => Promise<{ slug: string } | null>>(),
  transaction: vi.fn<(ops: unknown[]) => Promise<unknown>>(),
  evaluateAndAwardBadges: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  CATALOGUE_LESSON: { status: "PUBLISHED", audience: "CATALOGUE" },
  CATALOGUE_PATH: { status: "PUBLISHED", audience: "CATALOGUE" },
  prisma: {
    userPlacementResult: { findUnique: m.resultFindUnique, create: m.resultCreate },
    placementQuestion: { findMany: m.questionFindMany },
    lesson: { findMany: m.lessonFindMany },
    userSkipWaiver: { upsert: m.waiverUpsert },
    path: { findFirst: m.pathFindFirst },
    $transaction: m.transaction,
  },
}));
vi.mock("@/lib/badges/award", () => ({ evaluateAndAwardBadges: m.evaluateAndAwardBadges }));

const { PLACEMENT_INVALID, placementTestFor, submitPlacementFor } = await import("../placement");

const Q = {
  dev1: "11111111-1111-4111-8111-111111111111",
  dev2: "22222222-2222-4222-8222-222222222222",
  cyber1: "33333333-3333-4333-8333-333333333333",
  net1: "44444444-4444-4444-8444-444444444444",
};

const STORED = [
  { id: Q.dev1, category: "DEV", correctOptionId: "a" },
  { id: Q.dev2, category: "DEV", correctOptionId: "b" },
  { id: Q.cyber1, category: "CYBERSEC", correctOptionId: "c" },
  { id: Q.net1, category: "NETWORK", correctOptionId: "d" },
];

function answer(questionId: string, selectedOptionId: string) {
  return { questionId, selectedOptionId };
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.resultFindUnique.mockResolvedValue(null);
  m.resultCreate.mockImplementation((args) => ({ op: "create", args }));
  m.waiverUpsert.mockImplementation((args) => ({ op: "upsert", args }));
  m.questionFindMany.mockResolvedValue(STORED);
  m.lessonFindMany.mockResolvedValue([]);
  m.pathFindFirst.mockResolvedValue(null);
  m.transaction.mockResolvedValue([]);
});

describe("placementTestFor", () => {
  it("never asks the database for the right answer or the explanation", async () => {
    m.questionFindMany.mockResolvedValue([
      {
        id: Q.dev1,
        category: "DEV",
        difficulty: "BEGINNER",
        question: "Que fait print ?",
        options: [
          { id: "a", text: "Affiche" },
          { id: "b", text: "Lit" },
        ],
      },
    ]);
    const state = await placementTestFor("user-1");
    const args = m.questionFindMany.mock.calls[0]?.[0] as { select: Record<string, unknown> };
    expect(Object.keys(args.select).sort()).toEqual(
      ["category", "difficulty", "id", "options", "question"].sort(),
    );
    expect(state).toEqual({
      status: "open",
      estimatedMinutes: 1,
      questions: [
        {
          id: Q.dev1,
          category: "DEV",
          difficulty: "BEGINNER",
          question: "Que fait print ?",
          options: [
            { id: "a", text: "Affiche" },
            { id: "b", text: "Lit" },
          ],
        },
      ],
    });
  });

  it("drops options that are not what the schema promises", async () => {
    m.questionFindMany.mockResolvedValue([
      {
        id: Q.dev1,
        category: "DEV",
        difficulty: "BEGINNER",
        question: "?",
        options: [{ id: "a", text: "ok" }, { id: 3 }, "nope", null],
      },
    ]);
    const state = await placementTestFor("user-1");
    expect(state.status === "open" && state.questions[0]?.options).toEqual([
      { id: "a", text: "ok" },
    ]);
  });

  it("is closed once taken, and empty with no active question", async () => {
    m.resultFindUnique.mockResolvedValueOnce({ id: "r" });
    expect(await placementTestFor("user-1")).toEqual({ status: "taken" });
    expect(m.questionFindMany).not.toHaveBeenCalled();

    m.questionFindMany.mockResolvedValue([]);
    expect(await placementTestFor("user-1")).toEqual({ status: "empty" });
  });
});

describe("submitPlacementFor", () => {
  it("scores against the stored answers, never the request's", async () => {
    const result = await submitPlacementFor("user-1", {
      answers: [answer(Q.dev1, "a"), answer(Q.dev2, "x"), answer(Q.cyber1, "c")],
    });
    expect(result).toEqual({
      ok: true,
      scores: { devScore: 50, cybersecScore: 100, networkScore: 0 },
      recommendedPathSlug: null,
    });
    expect(m.resultCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", devScore: 50, cybersecScore: 100, networkScore: 0 },
    });
  });

  it("waives the beginner and intermediate catalogue lessons of a mastered domain", async () => {
    m.lessonFindMany.mockResolvedValue([{ id: "l1" }, { id: "l2" }]);
    m.pathFindFirst.mockResolvedValue({ slug: "cyber-fondamentaux" });

    const result = await submitPlacementFor("user-1", { answers: [answer(Q.cyber1, "c")] });

    expect(m.lessonFindMany).toHaveBeenCalledWith({
      where: {
        category: { in: ["CYBERSEC"] },
        difficulty: { in: ["BEGINNER", "INTERMEDIATE"] },
        status: "PUBLISHED",
        audience: "CATALOGUE",
      },
      select: { id: true },
    });
    expect(m.waiverUpsert).toHaveBeenCalledTimes(2);
    expect(m.waiverUpsert).toHaveBeenCalledWith({
      where: { userId_lessonId: { userId: "user-1", lessonId: "l1" } },
      create: { userId: "user-1", lessonId: "l1" },
      update: {},
    });
    expect(m.transaction.mock.calls[0]?.[0]).toHaveLength(3);
    expect(result).toMatchObject({ ok: true, recommendedPathSlug: "cyber-fondamentaux" });
  });

  it("recommends a catalogue path only, never a class's", async () => {
    await submitPlacementFor("user-1", { answers: [answer(Q.net1, "d")] });
    expect(m.pathFindFirst).toHaveBeenCalledWith({
      where: { category: "NETWORK", status: "PUBLISHED", audience: "CATALOGUE" },
      orderBy: { difficulty: "asc" },
      select: { slug: true },
    });
  });

  it("recommends from the highest mastered domain", async () => {
    await submitPlacementFor("user-1", {
      answers: [answer(Q.dev1, "a"), answer(Q.dev2, "b"), answer(Q.net1, "d")],
    });
    expect(m.pathFindFirst.mock.calls[0]?.[0]).toMatchObject({ where: { category: "DEV" } });
  });

  it("awards the placement badge after the result is stored, only when something is mastered", async () => {
    await submitPlacementFor("user-1", { answers: [answer(Q.dev1, "x")] });
    expect(m.evaluateAndAwardBadges).not.toHaveBeenCalled();
    expect(m.lessonFindMany).not.toHaveBeenCalled();
    expect(m.pathFindFirst).not.toHaveBeenCalled();

    await submitPlacementFor("user-1", { answers: [answer(Q.dev1, "a")] });
    expect(m.evaluateAndAwardBadges).toHaveBeenCalledWith("user-1", ["CUSTOM"], {
      event: "placement_test_passed",
    });
    const stored = m.transaction.mock.invocationCallOrder[1] ?? 0;
    const awarded = m.evaluateAndAwardBadges.mock.invocationCallOrder[0] ?? 0;
    expect(stored).toBeLessThan(awarded);
  });

  it("ignores an answer to a question that is not an active one", async () => {
    const result = await submitPlacementFor("user-1", {
      answers: [answer("55555555-5555-4555-8555-555555555555", "a"), answer(Q.dev1, "a")],
    });
    expect(result).toMatchObject({ scores: { devScore: 100 } });
  });

  it("takes the test once", async () => {
    m.resultFindUnique.mockResolvedValue({ id: "r" });
    expect(await submitPlacementFor("user-1", { answers: [answer(Q.dev1, "a")] })).toEqual({
      ok: false,
      reason: "taken",
    });
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("refuses a submission that is not one, in French, and stores nothing", async () => {
    for (const input of [null, {}, { answers: [] }, { answers: [answer("not-a-uuid", "a")] }]) {
      expect(await submitPlacementFor("user-1", input)).toEqual({
        ok: false,
        reason: "invalid",
        error: PLACEMENT_INVALID,
      });
    }
    expect(m.transaction).not.toHaveBeenCalled();
  });
});
