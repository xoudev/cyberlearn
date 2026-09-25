import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findProgress: vi.fn<(userId: string, lessonId: string) => Promise<{ status: string } | null>>(),
  upsertLessonRating:
    vi.fn<(userId: string, lessonId: string, score: number, feedback?: string) => Promise<void>>(),
  findLessonStats:
    vi.fn<
      (lessonId: string) => Promise<{ avgRating: number | null; ratingsCount: number } | null>
    >(),
}));

vi.mock("@cyberlearn/db", () => ({
  lessonRepository: { findProgress: m.findProgress },
  ratingRepository: {
    upsertLessonRating: m.upsertLessonRating,
    findLessonStats: m.findLessonStats,
  },
}));

const { rateLessonForUser } = await import("../rate-lesson");

const LESSON_ID = "0b9a8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
});

describe("rateLessonForUser", () => {
  it.each([[{ lessonId: "x", score: 4 }], [{ lessonId: LESSON_ID, score: 6 }], [null]])(
    "refuses a malformed rating (%#) without reading anything",
    async (input) => {
      expect(await rateLessonForUser("user-1", input)).toEqual({
        ok: false,
        error: "Données invalides.",
      });
      expect(m.findProgress).not.toHaveBeenCalled();
    },
  );

  it("refuses before the lesson is completed", async () => {
    m.findProgress.mockResolvedValue({ status: "IN_PROGRESS" });
    expect(await rateLessonForUser("user-1", { lessonId: LESSON_ID, score: 4 })).toEqual({
      ok: false,
      error: "Tu dois compléter la leçon avant de la noter.",
    });
    expect(m.upsertLessonRating).not.toHaveBeenCalled();
  });

  it("records the rating, a blank comment as none, and returns the new average", async () => {
    m.findProgress.mockResolvedValue({ status: "COMPLETED" });
    m.findLessonStats.mockResolvedValue({ avgRating: 4.2, ratingsCount: 5 });
    expect(
      await rateLessonForUser("user-1", { lessonId: LESSON_ID, score: 5, feedback: "   " }),
    ).toEqual({ ok: true, avgRating: 4.2, ratingsCount: 5 });
    expect(m.upsertLessonRating).toHaveBeenCalledWith("user-1", LESSON_ID, 5, undefined);
  });
});
