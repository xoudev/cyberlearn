/**
 * The console's read-only reference lists (cosmetics, quests, seasons, forum
 * sections, placement questions) and the learners' ratings it shows on a
 * lesson. Prisma is mocked: what this checks is the query each filter turns
 * into, and that nothing here writes.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ratingRepository } from "../repositories/rating.repository.js";
import {
  cosmeticReferenceWhere,
  forumCategoryReferenceWhere,
  placementReferenceWhere,
  questReferenceWhere,
  referenceRepository,
} from "../repositories/reference.repository.js";

const { mockPrisma } = vi.hoisted(() => {
  const model = () => ({ count: vi.fn(), findMany: vi.fn() });
  return {
    mockPrisma: {
      cosmetic: model(),
      quest: model(),
      season: model(),
      forumCategory: model(),
      placementQuestion: model(),
      rating: model(),
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

function firstArg(fn: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const arg = fn.mock.calls[0]?.[0];
  if (typeof arg !== "object" || arg === null) throw new Error("not called with an object");
  return { ...arg };
}

const insensitive = (term: string) => ({ contains: term, mode: "insensitive" });

beforeEach(() => {
  vi.clearAllMocks();
  for (const model of Object.values(mockPrisma)) {
    model.count.mockResolvedValue(3);
    model.findMany.mockResolvedValue([]);
  }
});

describe("the reference filters", () => {
  it("match everything with no filter", () => {
    expect(cosmeticReferenceWhere({ q: " ", type: undefined, page: 1, pageSize: 25 })).toEqual({
      AND: [],
    });
  });

  it("search a cosmetic's label, code and description, within a slot", () => {
    expect(
      cosmeticReferenceWhere({ q: " néon ", type: "TERMINAL_THEME", page: 1, pageSize: 25 }),
    ).toEqual({
      AND: [
        { type: "TERMINAL_THEME" },
        {
          OR: [
            { label: insensitive("néon") },
            { code: insensitive("néon") },
            { description: insensitive("néon") },
          ],
        },
      ],
    });
  });

  it("search a quest's title, code and description, of one kind", () => {
    expect(questReferenceWhere({ q: "quiz", type: "PERFECT_QUIZ", page: 1, pageSize: 25 })).toEqual(
      {
        AND: [
          { type: "PERFECT_QUIZ" },
          {
            OR: [
              { title: insensitive("quiz") },
              { code: insensitive("quiz") },
              { description: insensitive("quiz") },
            ],
          },
        ],
      },
    );
  });

  it("search a forum section's name, slug and description", () => {
    expect(forumCategoryReferenceWhere({ q: "réseau", page: 1, pageSize: 25 })).toEqual({
      AND: [
        {
          OR: [
            { name: insensitive("réseau") },
            { slug: insensitive("réseau") },
            { description: insensitive("réseau") },
          ],
        },
      ],
    });
  });

  it("search a placement question's text and explanation, by domain and level", () => {
    expect(
      placementReferenceWhere({
        q: "TCP",
        category: "NETWORK",
        difficulty: "BEGINNER",
        page: 1,
        pageSize: 25,
      }),
    ).toEqual({
      AND: [
        { category: "NETWORK" },
        { difficulty: "BEGINNER" },
        { OR: [{ question: insensitive("TCP") }, { explanation: insensitive("TCP") }] },
      ],
    });
  });
});

describe("referenceRepository", () => {
  it("reads the cosmetics by slot, in the locker's order, with their unlocks", async () => {
    await referenceRepository.listCosmetics({ q: "", type: undefined, page: 1, pageSize: 25 });
    expect(firstArg(mockPrisma.cosmetic.findMany)).toMatchObject({
      orderBy: [{ type: "asc" }, { orderIndex: "asc" }, { id: "asc" }],
      skip: 0,
      take: 25,
      select: { _count: { select: { unlocks: true } } },
    });
  });

  it("reads the quests in the dashboard's order", async () => {
    await referenceRepository.listQuests({ q: "", type: undefined, page: 1, pageSize: 25 });
    expect(firstArg(mockPrisma.quest.findMany)).toMatchObject({
      orderBy: [{ orderIndex: "asc" }, { id: "asc" }],
    });
  });

  it("reads the seasons latest first, under a status", async () => {
    await referenceRepository.listSeasons({ status: "CLOSED", page: 1, pageSize: 25 });
    expect(firstArg(mockPrisma.season.count)).toEqual({ where: { status: "CLOSED" } });
    expect(firstArg(mockPrisma.season.findMany)).toMatchObject({
      where: { status: "CLOSED" },
      orderBy: [{ index: "desc" }],
      select: { _count: { select: { memberships: true } } },
    });
  });

  it("reads the forum's sections in the forum's order, with their topics", async () => {
    await referenceRepository.listForumCategories({ q: "", page: 1, pageSize: 25 });
    expect(firstArg(mockPrisma.forumCategory.findMany)).toMatchObject({
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { _count: { select: { topics: true } } },
    });
  });

  it("reads the placement questions by domain, with the key the console checks", async () => {
    await referenceRepository.listPlacementQuestions({
      q: "",
      category: undefined,
      difficulty: undefined,
      page: 1,
      pageSize: 25,
    });
    expect(firstArg(mockPrisma.placementQuestion.findMany)).toMatchObject({
      orderBy: [{ category: "asc" }, { orderIndex: "asc" }, { id: "asc" }],
      select: { correctOptionId: true, options: true },
    });
  });
});

describe("ratingRepository.findLessonRatings", () => {
  it("reads a lesson's ratings newest first, as for a path", async () => {
    await ratingRepository.findLessonRatings("lesson-1", 20);
    expect(firstArg(mockPrisma.rating.findMany)).toEqual({
      where: { lessonId: "lesson-1" },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        score: true,
        feedback: true,
        updatedAt: true,
        user: { select: { displayName: true, username: true } },
      },
    });
  });

  it("reads a path's the same way", async () => {
    await ratingRepository.findPathRatings("path-1");
    expect(firstArg(mockPrisma.rating.findMany)).toMatchObject({
      where: { pathId: "path-1" },
      take: 50,
    });
  });
});
