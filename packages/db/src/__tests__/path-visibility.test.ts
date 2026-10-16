/**
 * Which paths a visitor is shown, and which of a path's lessons count as its
 * missions, as the where clauses Prisma receives. Prisma is mocked: what is
 * checked here is the shape of the question; the class paths and unpublished
 * lessons integration specs check the answers against a real database.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { lessonRepository } from "../repositories/lesson.repository.js";
import {
  CATALOGUE_PATH,
  PUBLISHED_PATH_LESSON,
  pathRepository,
} from "../repositories/path.repository.js";
import { statsRepository } from "../repositories/stats.repository.js";

// Hoisted above the imports: the repositories read the mocked client.
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    path: { findMany: vi.fn(), findFirst: vi.fn() },
    pathLesson: { findMany: vi.fn() },
    userLessonProgress: { count: vi.fn() },
    lesson: { findMany: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";
const PATH = "22222222-2222-4222-8222-222222222222";

/** The where clause of the first call to a mocked Prisma method. */
function whereOf(fn: { mock: { calls: unknown[][] } }): unknown {
  const [args] = fn.mock.calls[0] ?? [];
  // SAFETY: every repository call under test passes one args object.
  return (args as { where?: unknown } | undefined)?.where;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.path.findMany.mockResolvedValue([]);
  mockPrisma.path.findFirst.mockResolvedValue(null);
  mockPrisma.pathLesson.findMany.mockResolvedValue([]);
  mockPrisma.userLessonProgress.count.mockResolvedValue(0);
  mockPrisma.lesson.findMany.mockResolvedValue([]);
});

describe("the public lists of paths", () => {
  it("is the catalogue's own rule, published and not built for a class", () => {
    expect(CATALOGUE_PATH).toEqual({ status: "PUBLISHED", audience: "CATALOGUE" });
  });

  it("shows a visitor the catalogue only on the public catalogue page", async () => {
    await statsRepository.findPublicCatalog();
    // "Published" alone handed a class's path to every visitor.
    expect(whereOf(mockPrisma.path.findMany)).toEqual(CATALOGUE_PATH);
  });

  it("features catalogue paths only on the landing", async () => {
    await statsRepository.findFeaturedPaths();
    expect(whereOf(mockPrisma.path.findMany)).toEqual(CATALOGUE_PATH);
  });

  it("counts a card's lessons and XP over its published lessons", async () => {
    mockPrisma.path.findMany.mockResolvedValue([
      {
        slug: "reseau",
        title: "Réseau",
        description: "",
        category: "NETWORK",
        difficulty: "BEGINNER",
        lessons: [{ lesson: { xpReward: 10 } }, { lesson: { xpReward: 20 } }],
      },
    ]);

    const [card] = await statsRepository.findFeaturedPaths();
    expect(card).toMatchObject({ lessons: 2, xp: 30 });

    const [args] = mockPrisma.path.findMany.mock.calls[0] ?? [];
    expect(args).toMatchObject({ select: { lessons: { where: PUBLISHED_PATH_LESSON } } });
  });

  it("filters the catalogue page's lesson counts the same way", async () => {
    await statsRepository.findPublicCatalog();
    const [args] = mockPrisma.path.findMany.mock.calls[0] ?? [];
    expect(args).toMatchObject({ select: { lessons: { where: PUBLISHED_PATH_LESSON } } });
  });
});

describe("a path's missions", () => {
  it("are its published lessons", () => {
    expect(PUBLISHED_PATH_LESSON).toEqual({ lesson: { status: "PUBLISHED" } });
  });

  it("leaves a draft or an archived lesson out of the lessons to finish", async () => {
    await pathRepository.findLessonIds(PATH);
    expect(whereOf(mockPrisma.pathLesson.findMany)).toEqual({
      pathId: PATH,
      lesson: { status: "PUBLISHED" },
    });
  });

  it("counts only the published lessons the learner finished", async () => {
    await pathRepository.countCompletedLessons(USER, PATH);
    // A lesson finished before it was archived must not make up for one to do.
    expect(whereOf(mockPrisma.userLessonProgress.count)).toEqual({
      userId: USER,
      status: "COMPLETED",
      lesson: { status: "PUBLISHED", pathLessons: { some: { pathId: PATH } } },
    });
  });

  it("finishes a path whose only unpublished lesson is left undone", async () => {
    // Two published lessons, both done: the draft linked beside them is not
    // asked for, so the exam and the certificate open.
    mockPrisma.pathLesson.findMany.mockResolvedValue([{ lessonId: "a" }, { lessonId: "b" }]);
    mockPrisma.userLessonProgress.count.mockResolvedValue(2);
    expect(await pathRepository.areLessonsComplete(USER, PATH)).toBe(true);
  });

  it("never finishes a path with no published lesson left", async () => {
    // Every link points at a draft or an archived lesson: "nothing left to do"
    // opened the exam and the certificate for zero lessons.
    mockPrisma.pathLesson.findMany.mockResolvedValue([]);
    mockPrisma.userLessonProgress.count.mockResolvedValue(0);
    expect(await pathRepository.areLessonsComplete(USER, PATH)).toBe(false);
  });

  it("cuts the revision sheet from the published lessons", async () => {
    await pathRepository.findSheetOutline("reseau", USER);
    const [args] = mockPrisma.path.findFirst.mock.calls[0] ?? [];
    expect(args).toMatchObject({ select: { lessons: { where: PUBLISHED_PATH_LESSON } } });
  });

  it("never hands out the recap of a lesson that is not published", async () => {
    await lessonRepository.findRecapSources(["a", "b"]);
    expect(whereOf(mockPrisma.lesson.findMany)).toEqual({
      id: { in: ["a", "b"] },
      status: "PUBLISHED",
    });
  });
});
