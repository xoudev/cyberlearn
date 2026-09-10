import { describe, expect, it } from "vitest";
import { indexPlacements, isReadable, type PathWithLessons } from "@/lib/lessons/unlock";

function lesson(id: string) {
  return {
    id,
    slug: id,
    title: id.toUpperCase(),
    difficulty: "BEGINNER",
    category: "DEV",
    xpReward: 50,
    estimatedMinutes: 30,
  };
}

function path(id: string, lessonIds: string[]): PathWithLessons<ReturnType<typeof lesson>> {
  return {
    id,
    slug: id,
    title: `Parcours ${id}`,
    lessons: lessonIds.map((lid, i) => ({ position: i + 1, lesson: lesson(lid) })),
  };
}

const PYTHON = path("python", ["a", "b", "c", "d"]);

describe("indexPlacements", () => {
  it("opens the first lesson of a path to a reader who has done nothing", () => {
    const placements = indexPlacements([PYTHON], []);
    expect(placements.get("a")?.state).toBe("unlocked");
  });

  it("locks every lesson behind an unfinished predecessor", () => {
    const placements = indexPlacements([PYTHON], []);
    expect(placements.get("b")?.state).toBe("locked");
    expect(placements.get("c")?.state).toBe("locked");
    expect(placements.get("d")?.state).toBe("locked");
  });

  it("opens exactly the lesson after the last completed one", () => {
    const placements = indexPlacements([PYTHON], ["a", "b"]);
    expect(placements.get("a")?.state).toBe("completed");
    expect(placements.get("b")?.state).toBe("completed");
    expect(placements.get("c")?.state).toBe("unlocked");
    expect(placements.get("d")?.state).toBe("locked");
  });

  // Everything was open until now, so a reader can hold a completion that the
  // strict rule would otherwise revoke. Completing never un-completes.
  it("keeps a lesson completed out of order readable, without opening its successor", () => {
    const placements = indexPlacements([PYTHON], ["c"]);
    expect(placements.get("c")?.state).toBe("completed");
    expect(placements.get("b")?.state).toBe("locked");
    expect(placements.get("d")?.state).toBe("unlocked"); // its predecessor c is done
  });

  it("carries the path, the rank and both neighbours", () => {
    const placement = indexPlacements([PYTHON], ["a"]).get("b");
    expect(placement).toMatchObject({
      rank: 2,
      total: 4,
      path: { slug: "python", title: "Parcours python" },
    });
    expect(placement?.previous?.id).toBe("a");
    expect(placement?.next?.id).toBe("c");
  });

  it("reports no next lesson on the one that closes the path", () => {
    const placement = indexPlacements([PYTHON], ["a", "b", "c"]).get("d");
    expect(placement?.next).toBeNull();
    expect(placement?.previous?.id).toBe("c");
  });

  it("reports no previous lesson on the one that opens the path", () => {
    expect(indexPlacements([PYTHON], []).get("a")?.previous).toBeNull();
  });

  it("keeps the more permissive placement when a lesson sits in two paths", () => {
    // "x" opens the second path, so it is readable even though the first path
    // puts it behind an unfinished lesson.
    const locked = path("p1", ["a", "x"]);
    const opens = path("p2", ["x", "z"]);
    expect(indexPlacements([locked, opens], []).get("x")?.state).toBe("unlocked");
    // Order of the paths must not change the answer.
    expect(indexPlacements([opens, locked], []).get("x")?.state).toBe("unlocked");
  });

  it("returns nothing for a lesson in no path", () => {
    expect(indexPlacements([PYTHON], []).get("orphan")).toBeUndefined();
  });
});

describe("isReadable", () => {
  it("treats a lesson outside every path as readable", () => {
    expect(isReadable(undefined)).toBe(true);
  });

  it("refuses only a locked lesson", () => {
    const placements = indexPlacements([PYTHON], ["a"]);
    expect(isReadable(placements.get("a"))).toBe(true); // completed
    expect(isReadable(placements.get("b"))).toBe(true); // unlocked
    expect(isReadable(placements.get("c"))).toBe(false); // locked
  });
});
