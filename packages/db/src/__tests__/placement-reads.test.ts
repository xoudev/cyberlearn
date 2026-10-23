/**
 * What the placement test reads and writes, as its service asks for it
 * (apps/web/lib/onboarding/placement.ts). Prisma is mocked: what this checks is
 * what the statements ask for, above all that nothing which gives an answer
 * away is selected for the questions, and that waivers and recommendations
 * stay in the catalogue.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { placementRepository } from "../repositories/placement.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    userPlacementResult: { findUnique: vi.fn(), create: vi.fn() },
    placementQuestion: { count: vi.fn(), findMany: vi.fn() },
    lesson: { findMany: vi.fn() },
    userSkipWaiver: { upsert: vi.fn() },
    path: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.userPlacementResult.create.mockImplementation((args: unknown) => ({
    op: "create",
    args,
  }));
  mockPrisma.userSkipWaiver.upsert.mockImplementation((args: unknown) => ({
    op: "upsert",
    args,
  }));
  mockPrisma.$transaction.mockResolvedValue([]);
});

describe("the questions", () => {
  it("never selects the right option or the explanation", async () => {
    mockPrisma.placementQuestion.findMany.mockResolvedValue([]);
    await placementRepository.listActiveQuestions();

    // The mock is untyped; its one argument is the findMany's options.
    const [args] = mockPrisma.placementQuestion.findMany.mock.calls[0] as [
      { where: unknown; select: Record<string, unknown>; orderBy: unknown },
    ];
    expect(Object.keys(args.select).sort()).toEqual(
      ["category", "difficulty", "id", "options", "question"].sort(),
    );
    expect(args.where).toEqual({ isActive: true });
    expect(args.orderBy).toEqual([{ category: "asc" }, { orderIndex: "asc" }]);
  });

  it("counts the active ones", async () => {
    mockPrisma.placementQuestion.count.mockResolvedValue(24);
    expect(await placementRepository.countActiveQuestions()).toBe(24);
    expect(mockPrisma.placementQuestion.count).toHaveBeenCalledWith({ where: { isActive: true } });
  });

  it("reads the key of the active questions asked, and nothing else of them", async () => {
    mockPrisma.placementQuestion.findMany.mockResolvedValue([]);
    await placementRepository.findAnswerKey(["q1", "q2"]);
    expect(mockPrisma.placementQuestion.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["q1", "q2"] }, isActive: true },
      select: { id: true, category: true, correctOptionId: true },
    });
  });
});

describe("the result", () => {
  it("says whether there is one, from its id alone", async () => {
    mockPrisma.userPlacementResult.findUnique.mockResolvedValueOnce({ id: "r" });
    expect(await placementRepository.hasResult("user-1")).toBe(true);
    mockPrisma.userPlacementResult.findUnique.mockResolvedValueOnce(null);
    expect(await placementRepository.hasResult("user-1")).toBe(false);
    expect(mockPrisma.userPlacementResult.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true },
    });
  });

  it("reads the three scores", async () => {
    mockPrisma.userPlacementResult.findUnique.mockResolvedValue({
      devScore: 80,
      cybersecScore: 45,
      networkScore: 20,
    });
    expect(await placementRepository.findScoresFor("user-1")).toEqual({
      devScore: 80,
      cybersecScore: 45,
      networkScore: 20,
    });
    expect(mockPrisma.userPlacementResult.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { devScore: true, cybersecScore: true, networkScore: true },
    });
  });

  it("stores the result and the waivers in one transaction", async () => {
    await placementRepository.saveResult(
      "user-1",
      { devScore: 50, cybersecScore: 100, networkScore: 0 },
      ["l1", "l2"],
    );

    expect(mockPrisma.userPlacementResult.create).toHaveBeenCalledWith({
      data: { userId: "user-1", devScore: 50, cybersecScore: 100, networkScore: 0 },
    });
    expect(mockPrisma.userSkipWaiver.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.userSkipWaiver.upsert).toHaveBeenCalledWith({
      where: { userId_lessonId: { userId: "user-1", lessonId: "l1" } },
      create: { userId: "user-1", lessonId: "l1" },
      update: {},
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction.mock.calls[0]?.[0]).toHaveLength(3);
  });

  it("stores the result alone when nothing is waived", async () => {
    await placementRepository.saveResult(
      "user-1",
      { devScore: 10, cybersecScore: 10, networkScore: 10 },
      [],
    );
    expect(mockPrisma.userSkipWaiver.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction.mock.calls[0]?.[0]).toHaveLength(1);
  });
});

describe("the waivers and the recommendation", () => {
  it("waives the catalogue's lessons of the mastered domains, at the difficulties given", async () => {
    mockPrisma.lesson.findMany.mockResolvedValue([{ id: "l1" }, { id: "l2" }]);
    const ids = await placementRepository.findLessonIdsToWaive(
      ["CYBERSEC"],
      ["BEGINNER", "INTERMEDIATE"],
    );

    expect(ids).toEqual(["l1", "l2"]);
    expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith({
      where: {
        category: { in: ["CYBERSEC"] },
        difficulty: { in: ["BEGINNER", "INTERMEDIATE"] },
        status: "PUBLISHED",
        audience: "CATALOGUE",
      },
      select: { id: true },
    });
  });

  it("asks nothing when no domain is mastered", async () => {
    expect(await placementRepository.findLessonIdsToWaive([], ["BEGINNER"])).toEqual([]);
    expect(mockPrisma.lesson.findMany).not.toHaveBeenCalled();
  });

  it("recommends the easiest catalogue path of a domain, never a class's", async () => {
    mockPrisma.path.findFirst.mockResolvedValue({ slug: "reseaux-bases" });
    expect(await placementRepository.findPathSlugToRecommend("NETWORK")).toBe("reseaux-bases");
    expect(mockPrisma.path.findFirst).toHaveBeenCalledWith({
      where: { category: "NETWORK", status: "PUBLISHED", audience: "CATALOGUE" },
      orderBy: { difficulty: "asc" },
      select: { slug: true },
    });
  });

  it("has no path to recommend when the domain has none", async () => {
    mockPrisma.path.findFirst.mockResolvedValue(null);
    expect(await placementRepository.findPathSlugToRecommend("DEV")).toBeNull();
  });
});
