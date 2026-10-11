/**
 * The catalogue's filters, as the where clause Prisma receives. Prisma is
 * mocked: what is checked here is the shape of the question, and the class
 * lessons integration spec checks the answers against a real database.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CatalogueFilters,
  catalogueWhere,
  lessonRepository,
  lessonsVisibleTo,
} from "../repositories/lesson.repository.js";

// Hoisted above the import: the repository reads the mocked client.
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { lesson: { groupBy: vi.fn() } },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("catalogueWhere", () => {
  it("is the reader's visibility rule alone when nothing is chosen", () => {
    expect(catalogueWhere(USER)).toEqual({ AND: [lessonsVisibleTo(USER)] });
  });

  it("keeps the visibility rule beside a search, both being an OR", () => {
    // Spread into one object, the search's OR replaced the audience's: a
    // search then listed the lessons written for every other class.
    const where = catalogueWhere(USER, { search: "sql" });
    expect(where.AND).toEqual([
      lessonsVisibleTo(USER),
      {
        OR: [
          { title: { contains: "sql", mode: "insensitive" } },
          { description: { contains: "sql", mode: "insensitive" } },
        ],
      },
    ]);
  });

  it("adds one term per chosen facet", () => {
    const where = catalogueWhere(USER, {
      category: "DEV",
      difficulty: "EXPERT",
      progressStatus: "COMPLETED",
    });
    expect(where.AND).toEqual([
      lessonsVisibleTo(USER),
      { category: "DEV" },
      { difficulty: "EXPERT" },
      { progress: { some: { userId: USER, status: "COMPLETED" } } },
    ]);
  });

  it("reads 'not started' as no progress row at all for this reader", () => {
    expect(catalogueWhere(USER, { progressStatus: "NOT_STARTED" }).AND).toContainEqual({
      progress: { none: { userId: USER } },
    });
    expect(catalogueWhere(USER, { progressStatus: "IN_PROGRESS" }).AND).toContainEqual({
      progress: { some: { userId: USER, status: "IN_PROGRESS" } },
    });
  });

  it("ignores an empty search", () => {
    expect(catalogueWhere(USER, { search: "" })).toEqual({ AND: [lessonsVisibleTo(USER)] });
  });
});

describe("countByCategory", () => {
  it("counts under the reader's other filters, so each badge matches its list", async () => {
    mockPrisma.lesson.groupBy.mockResolvedValue([
      { category: "DEV", _count: { id: 4 } },
      { category: "NETWORK", _count: { id: 1 } },
    ]);
    const counts = await lessonRepository.countByCategory(USER, {
      difficulty: "BEGINNER",
      progressStatus: "IN_PROGRESS",
      search: "ssh",
    });
    expect(counts).toEqual({ DEV: 4, NETWORK: 1 });
    expect(mockPrisma.lesson.groupBy).toHaveBeenCalledWith({
      by: ["category"],
      where: catalogueWhere(USER, {
        difficulty: "BEGINNER",
        progressStatus: "IN_PROGRESS",
        search: "ssh",
      }),
      _count: { id: true },
    });
  });

  it("leaves the category out, even when the object it is given carries one", async () => {
    mockPrisma.lesson.groupBy.mockResolvedValue([]);
    const withCategory = { difficulty: "ADVANCED", category: "DEV" } satisfies CatalogueFilters;
    await lessonRepository.countByCategory(USER, withCategory);
    expect(mockPrisma.lesson.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: catalogueWhere(USER, { difficulty: "ADVANCED" }) }),
    );
  });

  it("counts the whole visible catalogue when no filter is given", async () => {
    mockPrisma.lesson.groupBy.mockResolvedValue([]);
    await lessonRepository.countByCategory(USER);
    expect(mockPrisma.lesson.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [lessonsVisibleTo(USER)] } }),
    );
  });
});
