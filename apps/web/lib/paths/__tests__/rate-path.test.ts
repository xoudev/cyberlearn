import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Rating a path: open once one of its lessons is completed, and only for a
 * path the learner can see.
 */

const PATH = "22222222-2222-4222-8222-222222222222";

const m = vi.hoisted(() => ({
  pathFindFirst: vi.fn(),
  progressCount: vi.fn(),
  upsertPathRating: vi.fn(),
  findPathStats: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  pathsVisibleTo: (userId: string) => ({ visibleTo: userId }),
  prisma: {
    path: { findFirst: m.pathFindFirst },
    userLessonProgress: { count: m.progressCount },
  },
  ratingRepository: { upsertPathRating: m.upsertPathRating, findPathStats: m.findPathStats },
}));

const { ratePathForUser } = await import("../rate-path");

beforeEach(() => {
  vi.clearAllMocks();
  m.pathFindFirst.mockResolvedValue({ lessons: [{ lessonId: "l1" }, { lessonId: "l2" }] });
  m.progressCount.mockResolvedValue(1);
  m.upsertPathRating.mockResolvedValue({});
  m.findPathStats.mockResolvedValue({ avgRating: 4.5, ratingsCount: 2 });
});

describe("ratePathForUser", () => {
  it("records the rating and returns the path's new average", async () => {
    expect(await ratePathForUser("u1", PATH, 4, "  Très clair.  ")).toEqual({
      ok: true,
      avgRating: 4.5,
      ratingsCount: 2,
    });
    expect(m.upsertPathRating).toHaveBeenCalledWith("u1", PATH, 4, "Très clair.");
  });

  it("stores no comment when the field was left blank", async () => {
    await ratePathForUser("u1", PATH, 5, "   ");
    expect(m.upsertPathRating).toHaveBeenCalledWith("u1", PATH, 5, undefined);
  });

  it("looks the path up as the learner sees it", async () => {
    await ratePathForUser("u1", PATH, 5);
    expect(m.pathFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PATH, visibleTo: "u1" } }) as unknown,
    );
  });

  it("refuses a path the learner cannot see", async () => {
    m.pathFindFirst.mockResolvedValue(null);
    expect(await ratePathForUser("u1", PATH, 5)).toEqual({
      ok: false,
      error: "Parcours introuvable.",
    });
    expect(m.upsertPathRating).not.toHaveBeenCalled();
  });

  it("waits until one lesson of the path is completed", async () => {
    m.progressCount.mockResolvedValue(0);
    const result = await ratePathForUser("u1", PATH, 5);
    expect(result.ok).toBe(false);
    expect(m.upsertPathRating).not.toHaveBeenCalled();
  });

  it("counts only this path's lessons", async () => {
    await ratePathForUser("u1", PATH, 3);
    expect(m.progressCount).toHaveBeenCalledWith({
      where: { userId: "u1", status: "COMPLETED", lessonId: { in: ["l1", "l2"] } },
    });
  });
});
