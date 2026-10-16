import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The path lock, for the writes that do not go through the lesson page: a
 * completion sent straight to the action or from the app.
 */

const m = vi.hoisted(() => ({
  findRoleById: vi.fn<(id: string) => Promise<{ role: string } | null>>(),
  findPathContexts: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  userRepository: { findRoleById: m.findRoleById },
  lessonRepository: { findPathContexts: m.findPathContexts },
}));

const { pathOpensLesson } = await import("../access");

/** A path of three lessons, a → b → c. */
const PATH = {
  id: "p1",
  slug: "reseau",
  title: "Réseau",
  lessons: ["a", "b", "c"].map((id, i) => ({ position: i, lesson: { id } })),
};

beforeEach(() => {
  m.findRoleById.mockReset().mockResolvedValue({ role: "STUDENT" });
  m.findPathContexts.mockReset();
});

describe("pathOpensLesson", () => {
  it("refuses a lesson whose predecessor is not finished", async () => {
    m.findPathContexts.mockResolvedValue({ paths: [PATH], completedLessonIds: ["a"] });
    expect(await pathOpensLesson("u1", "c")).toBe(false);
    expect(m.findPathContexts).toHaveBeenCalledWith("u1", ["c"]);
  });

  it("opens the next lesson once the one before it is finished", async () => {
    m.findPathContexts.mockResolvedValue({ paths: [PATH], completedLessonIds: ["a"] });
    expect(await pathOpensLesson("u1", "b")).toBe(true);
  });

  it("opens a lesson in no path: nothing sequences it", async () => {
    m.findPathContexts.mockResolvedValue({ paths: [], completedLessonIds: [] });
    expect(await pathOpensLesson("u1", "loose")).toBe(true);
  });

  it("opens every lesson to an administrator", async () => {
    m.findRoleById.mockResolvedValue({ role: "ADMIN" });
    m.findPathContexts.mockResolvedValue({ paths: [PATH], completedLessonIds: [] });
    expect(await pathOpensLesson("admin", "c")).toBe(true);
  });
});
