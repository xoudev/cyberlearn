import { describe, expect, it } from "vitest";
import {
  countSince,
  firstName,
  homePaths,
  leadAction,
  learningGoalsOf,
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
      {
        id: `${id}-3`,
        slug: `${id}-3`,
        title: "Trois",
        estimatedMinutes: 15,
        position: 3,
        moduleId: null,
      },
      {
        id: `${id}-1`,
        slug: `${id}-1`,
        title: "Un",
        estimatedMinutes: 10,
        position: 1,
        moduleId: null,
      },
      {
        id: `${id}-2`,
        slug: `${id}-2`,
        title: "Deux",
        estimatedMinutes: 12,
        position: 2,
        moduleId: null,
      },
    ],
    modules: [],
    ...overrides,
  };
}

const NEWCOMER = { level: 1, placement: null, recentCategories: [], goals: [] };

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

  it("passes over the missions the placement test waived, as the path screen does", () => {
    const progress = progressIn(path("p"), new Set(["p-1"]), new Set(["p-2"]));
    expect(progress.next?.title).toBe("Trois");
    // A waiver is not a completion: the count stays what was done.
    expect(progress.completed).toBe(1);
    // Only waived missions left: the first of them, rather than nothing.
    expect(progressIn(path("p"), new Set(["p-1"]), new Set(["p-2", "p-3"])).next?.title).toBe(
      "Deux",
    );
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

  it("leads with the domain the reader named at sign-up, as the site does", () => {
    const paths = [path("a", { category: "DEV" }), path("b", { category: "NETWORK" })];
    expect(homePaths(paths, new Set(), NEWCOMER).lead?.id).toBe("a");
    expect(homePaths(paths, new Set(), { ...NEWCOMER, goals: ["NETWORK"] }).lead?.id).toBe("b");
  });

  it("has nothing to lead with when every path is finished", () => {
    expect(homePaths([path("a", { status: "COMPLETED" })], new Set(), NEWCOMER)).toEqual({
      lead: null,
      leadProgress: null,
      leadRoute: null,
      other: null,
    });
  });

  it("draws the lead's module as a route, in path order, centred on the lesson open", () => {
    // The same calculation as the site's dashboard: done, now, to come.
    const result = homePaths([path("p", { status: "IN_PROGRESS" })], new Set(["p-1"]), NEWCOMER);
    expect(result.leadRoute?.label).toBe("Module 01");
    expect(result.leadRoute?.nodes.map((n) => [n.title, n.state])).toEqual([
      ["Un", "done"],
      ["Deux", "now"],
      ["Trois", "todo"],
    ]);
    // A lesson left open further on is the one the route points at.
    const resumed = homePaths(
      [path("p", { status: "IN_PROGRESS" })],
      new Set(["p-1"]),
      NEWCOMER,
      "p-3",
    );
    expect(resumed.leadRoute?.nodes.map((n) => n.state)).toEqual(["done", "todo", "now"]);
  });

  it("points the route and the next mission past the waived ones, as the site's dashboard", () => {
    const result = homePaths(
      [path("p", { status: "IN_PROGRESS" })],
      new Set(["p-1"]),
      NEWCOMER,
      null,
      new Set(["p-2"]),
    );
    expect(result.leadProgress?.next?.title).toBe("Trois");
    expect(result.leadRoute?.nodes.map((n) => [n.title, n.state])).toEqual([
      ["Un", "done"],
      ["Deux", "todo"],
      ["Trois", "now"],
    ]);
    // Nothing done yet, but placed past the first mission: the route says so.
    const fresh = homePaths([path("p")], new Set(), NEWCOMER, null, new Set(["p-1"]));
    expect(fresh.leadProgress).toBeNull();
    expect(fresh.leadRoute?.nodes.map((n) => n.state)).toEqual(["todo", "now", "todo"]);
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

describe("learningGoalsOf", () => {
  it("reads the goals kept from the sign-up", () => {
    expect(learningGoalsOf({ learningGoals: ["NETWORK", "CAREER"] })).toEqual([
      "NETWORK",
      "CAREER",
    ]);
  });

  it("has none without a row, a column, or anything but text", () => {
    expect(learningGoalsOf(null)).toEqual([]);
    expect(learningGoalsOf({})).toEqual([]);
    expect(learningGoalsOf({ learningGoals: null })).toEqual([]);
    expect(learningGoalsOf({ learningGoals: ["DEV", 3] })).toEqual(["DEV"]);
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
