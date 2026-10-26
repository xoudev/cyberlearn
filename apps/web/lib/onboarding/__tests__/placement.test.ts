import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The placement test's service: scoring, waivers, the recommended path and the
 * badge. What the database is asked is placementRepository's, and is checked
 * with it (packages/db/src/__tests__/placement-reads.test.ts).
 */

const m = vi.hoisted(() => ({
  hasResult: vi.fn<(userId: string) => Promise<boolean>>(),
  listActiveQuestions: vi.fn<() => Promise<unknown[]>>(),
  findAnswerKey: vi.fn<(ids: readonly string[]) => Promise<unknown[]>>(),
  findLessonIdsToWaive:
    vi.fn<(categories: readonly string[], difficulties: readonly string[]) => Promise<string[]>>(),
  saveResult:
    vi.fn<(userId: string, scores: unknown, waived: readonly string[]) => Promise<void>>(),
  findPathSlugToRecommend: vi.fn<(category: string) => Promise<string | null>>(),
  evaluateAndAwardBadges: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  placementRepository: {
    hasResult: m.hasResult,
    listActiveQuestions: m.listActiveQuestions,
    findAnswerKey: m.findAnswerKey,
    findLessonIdsToWaive: m.findLessonIdsToWaive,
    saveResult: m.saveResult,
    findPathSlugToRecommend: m.findPathSlugToRecommend,
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
  m.hasResult.mockResolvedValue(false);
  m.listActiveQuestions.mockResolvedValue([]);
  // The stored key answers for the questions asked, as the table would.
  m.findAnswerKey.mockImplementation((ids) =>
    Promise.resolve(STORED.filter((question) => ids.includes(question.id))),
  );
  m.findLessonIdsToWaive.mockResolvedValue([]);
  m.saveResult.mockResolvedValue(undefined);
  m.findPathSlugToRecommend.mockResolvedValue(null);
});

describe("placementTestFor", () => {
  it("draws the open test from the questions the repository gives, options kept as they are", async () => {
    m.listActiveQuestions.mockResolvedValue([
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
    m.listActiveQuestions.mockResolvedValue([
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
    m.hasResult.mockResolvedValueOnce(true);
    expect(await placementTestFor("user-1")).toEqual({ status: "taken" });
    expect(m.listActiveQuestions).not.toHaveBeenCalled();

    m.listActiveQuestions.mockResolvedValue([]);
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
    expect(m.findAnswerKey).toHaveBeenCalledWith([Q.dev1, Q.dev2, Q.cyber1]);
    expect(m.saveResult).toHaveBeenCalledWith(
      "user-1",
      { devScore: 50, cybersecScore: 100, networkScore: 0 },
      [],
    );
  });

  it("waives the beginner and intermediate catalogue lessons of a mastered domain", async () => {
    m.findLessonIdsToWaive.mockResolvedValue(["l1", "l2"]);
    m.findPathSlugToRecommend.mockResolvedValue("cyber-fondamentaux");

    const result = await submitPlacementFor("user-1", { answers: [answer(Q.cyber1, "c")] });

    expect(m.findLessonIdsToWaive).toHaveBeenCalledWith(["CYBERSEC"], ["BEGINNER", "INTERMEDIATE"]);
    expect(m.saveResult).toHaveBeenCalledWith("user-1", expect.anything(), ["l1", "l2"]);
    expect(result).toMatchObject({ ok: true, recommendedPathSlug: "cyber-fondamentaux" });
  });

  it("waives nothing when no domain is mastered", async () => {
    await submitPlacementFor("user-1", { answers: [answer(Q.dev1, "x")] });
    expect(m.findLessonIdsToWaive).toHaveBeenCalledWith([], expect.anything());
    expect(m.saveResult).toHaveBeenCalledWith("user-1", expect.anything(), []);
  });

  it("asks for a path of the mastered domain, the repository keeping to the catalogue", async () => {
    await submitPlacementFor("user-1", { answers: [answer(Q.net1, "d")] });
    expect(m.findPathSlugToRecommend).toHaveBeenCalledWith("NETWORK");
  });

  it("recommends from the highest mastered domain", async () => {
    await submitPlacementFor("user-1", {
      answers: [answer(Q.dev1, "a"), answer(Q.dev2, "b"), answer(Q.net1, "d")],
    });
    expect(m.findPathSlugToRecommend).toHaveBeenCalledWith("DEV");
  });

  it("awards the placement badge after the result is stored, only when something is mastered", async () => {
    await submitPlacementFor("user-1", { answers: [answer(Q.dev1, "x")] });
    expect(m.evaluateAndAwardBadges).not.toHaveBeenCalled();
    expect(m.findPathSlugToRecommend).not.toHaveBeenCalled();

    await submitPlacementFor("user-1", { answers: [answer(Q.dev1, "a")] });
    expect(m.evaluateAndAwardBadges).toHaveBeenCalledWith("user-1", ["CUSTOM"], {
      event: "placement_test_passed",
    });
    const stored = m.saveResult.mock.invocationCallOrder[1] ?? 0;
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
    m.hasResult.mockResolvedValue(true);
    expect(await submitPlacementFor("user-1", { answers: [answer(Q.dev1, "a")] })).toEqual({
      ok: false,
      reason: "taken",
    });
    expect(m.saveResult).not.toHaveBeenCalled();
  });

  it("refuses a submission that is not one, in French, and stores nothing", async () => {
    for (const input of [null, {}, { answers: [] }, { answers: [answer("not-a-uuid", "a")] }]) {
      expect(await submitPlacementFor("user-1", input)).toEqual({
        ok: false,
        reason: "invalid",
        error: PLACEMENT_INVALID,
      });
    }
    expect(m.saveResult).not.toHaveBeenCalled();
  });
});
