import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The path lock as the server applies it to what records progress (a
 * completion, a quiz answer) and as the app reads it for its catalogue and its
 * lesson screen: the rule of @cyberlearn/lib/paths/unlock, over the reader's
 * own completions, with the administrator's exception.
 */

const m = vi.hoisted(() => ({
  findPathContexts: vi.fn(),
  findRoleById: vi.fn(),
}));

vi.mock("@cyberlearn/db", () => ({
  lessonRepository: { findPathContexts: m.findPathContexts },
  userRepository: { findRoleById: m.findRoleById },
}));

const { lessonLocks, pathLockOf } = await import("../access");

const PYTHON = {
  id: "p1",
  slug: "python-bases",
  title: "Python : les bases",
  lessons: ["a", "b", "c", "d"].map((id, i) => ({ position: i + 1, lesson: { id } })),
};

beforeEach(() => {
  vi.clearAllMocks();
  m.findRoleById.mockResolvedValue({ role: "STUDENT" });
  m.findPathContexts.mockResolvedValue({
    paths: [PYTHON],
    completedLessonIds: ["a"],
    waivedLessonIds: [],
  });
});

describe("lessonLocks", () => {
  it("names the path of each lesson not earned yet, and only those", async () => {
    const locks = await lessonLocks("u1", ["a", "b", "c", "d"]);
    expect(m.findPathContexts).toHaveBeenCalledWith("u1", ["a", "b", "c", "d"]);
    expect([...locks.entries()]).toEqual([
      ["c", { slug: "python-bases", title: "Python : les bases" }],
      ["d", { slug: "python-bases", title: "Python : les bases" }],
    ]);
  });

  it("never locks a lesson outside every published path", async () => {
    m.findPathContexts.mockResolvedValue({
      paths: [],
      completedLessonIds: [],
      waivedLessonIds: [],
    });
    expect((await lessonLocks("u1", ["seule"])).size).toBe(0);
  });

  it("opens everything to an administrator", async () => {
    m.findRoleById.mockResolvedValue({ role: "ADMIN" });
    expect((await lessonLocks("u1", ["c", "d"])).size).toBe(0);
  });

  it("counts a lesson the placement test waived as done: it opens, and opens the next", async () => {
    // a is completed, b is waived: c (behind the waived b) opens, d (behind c) does not.
    m.findPathContexts.mockResolvedValue({
      paths: [PYTHON],
      completedLessonIds: ["a"],
      waivedLessonIds: ["b"],
    });
    const locks = await lessonLocks("u1", ["a", "b", "c", "d"]);
    expect([...locks.keys()]).toEqual(["d"]);
  });

  it("opens a waived lesson even when the one before it is not done", async () => {
    m.findPathContexts.mockResolvedValue({
      paths: [PYTHON],
      completedLessonIds: [],
      waivedLessonIds: ["c"],
    });
    const locks = await lessonLocks("u1", ["b", "c", "d"]);
    expect([...locks.keys()]).toEqual(["b"]);
  });

  it("asks nothing of the database for no lesson", async () => {
    expect((await lessonLocks("u1", [])).size).toBe(0);
    expect(m.findPathContexts).not.toHaveBeenCalled();
  });
});

describe("pathLockOf", () => {
  it("gives the path a locked lesson waits in, or null for one the reader may read", async () => {
    expect(await pathLockOf("u1", "c")).toEqual({
      slug: "python-bases",
      title: "Python : les bases",
    });
    expect(await pathLockOf("u1", "b")).toBeNull();
    expect(await pathLockOf("u1", "a")).toBeNull();
  });

  it("lets a completion through on the lesson a waiver opens, as the page does", async () => {
    m.findPathContexts.mockResolvedValue({
      paths: [PYTHON],
      completedLessonIds: [],
      waivedLessonIds: ["a", "b"],
    });
    expect(await pathLockOf("u1", "c")).toBeNull();
    expect(await pathLockOf("u1", "d")).toEqual({
      slug: "python-bases",
      title: "Python : les bases",
    });
  });
});
