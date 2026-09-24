import { describe, expect, it } from "vitest";
import {
  countSince,
  firstName,
  homePaths,
  leadAction,
  monthStart,
  pathsTitle,
  progressIn,
  type HomePath,
} from "../home";

function path(id: string, overrides: Partial<HomePath> = {}): HomePath {
  return {
    id,
    slug: id,
    title: id,
    description: "",
    category: "NETWORK",
    difficulty: "BEGINNER",
    estimatedHours: 3,
    status: null,
    lessons: [
      { id: `${id}-3`, slug: `${id}-3`, title: "Trois", estimatedMinutes: 15, position: 3 },
      { id: `${id}-1`, slug: `${id}-1`, title: "Un", estimatedMinutes: 10, position: 1 },
      { id: `${id}-2`, slug: `${id}-2`, title: "Deux", estimatedMinutes: 12, position: 2 },
    ],
    ...overrides,
  };
}

const NEWCOMER = { level: 1, placement: null, recentCategories: [] };

describe("progressIn", () => {
  it("counts the missions done and finds the next one in path order", () => {
    const progress = progressIn(path("p"), new Set(["p-1", "p-3"]));
    expect(progress.completed).toBe(2);
    expect(progress.total).toBe(3);
    expect(progress.next?.title).toBe("Deux");
  });

  it("has no next mission once all are done", () => {
    expect(progressIn(path("p"), new Set(["p-1", "p-2", "p-3"])).next).toBeNull();
  });
});

describe("homePaths", () => {
  it("leads with the path in progress, with its progress", () => {
    const result = homePaths(
      [path("a"), path("b", { status: "IN_PROGRESS" })],
      new Set(["b-1"]),
      NEWCOMER,
    );
    expect(result.lead?.id).toBe("b");
    expect(result.other?.id).toBe("a");
    expect(result.leadProgress).toMatchObject({ completed: 1, total: 3 });
    expect(result.leadProgress?.next?.title).toBe("Deux");
  });

  it("shows a path not started as a poster, without progress", () => {
    expect(homePaths([path("a")], new Set(), NEWCOMER).leadProgress).toBeNull();
  });

  it("has nothing to lead with when every path is finished", () => {
    expect(homePaths([path("a", { status: "COMPLETED" })], new Set(), NEWCOMER)).toEqual({
      lead: null,
      leadProgress: null,
      other: null,
    });
  });
});

describe("wording", () => {
  it("words the button and the title as the site does", () => {
    expect(leadAction(null)).toBe("Commencer le parcours");
    const started = progressIn(path("p"), new Set(["p-1"]));
    expect(leadAction(started)).toBe("Reprendre le parcours");
    expect(leadAction(progressIn(path("p"), new Set(["p-1", "p-2", "p-3"])))).toBe(
      "Terminer le parcours",
    );
    expect(pathsTitle(null)).toBe("Ta prochaine mission.");
    expect(pathsTitle(started)).toBe("Reprends ton parcours.");
  });

  it("greets by the first name, or by a fallback", () => {
    expect(firstName("Alex Martin")).toBe("Alex");
    expect(firstName("  ")).toBe("Opérateur");
    expect(firstName(null)).toBe("Opérateur");
  });

  it("starts the month at local midnight on the first", () => {
    const start = monthStart(new Date(2026, 8, 24, 15, 30));
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([
      2026, 8, 1, 0,
    ]);
  });
});

describe("countSince", () => {
  it("counts the dates on or after the start, skipping empty ones", () => {
    const since = new Date("2026-09-01T00:00:00.000Z");
    expect(
      countSince(
        ["2026-08-31T23:59:59", "2026-09-01T00:00:00", "2026-09-20T08:00:00", null],
        since,
      ),
    ).toBe(2);
  });
});
