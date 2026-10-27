import { describe, expect, it } from "vitest";
import {
  currentLessonId,
  moduleRoute,
  nextLesson,
  routeWindow,
  type RouteLesson,
  type RouteNode,
} from "../module-route";

const MODULES = [
  { id: "m1", position: 1, title: "Comment fonctionne un ordinateur" },
  { id: "m2", position: 2, title: "Le terminal" },
];

function lesson(n: number, moduleId: string | null): RouteLesson {
  return { id: `l${String(n)}`, slug: `lecon-${String(n)}`, title: `Leçon ${String(n)}`, moduleId };
}

const LESSONS: RouteLesson[] = [
  lesson(1, "m1"),
  lesson(2, "m1"),
  lesson(3, "m1"),
  lesson(4, "m2"),
  lesson(5, "m2"),
  lesson(6, "m2"),
  lesson(7, "m2"),
];

describe("nextLesson", () => {
  it("is the first lesson not completed", () => {
    expect(nextLesson(LESSONS, new Set(["l1", "l2"]))?.id).toBe("l3");
  });

  it("passes over the lessons the placement test waived", () => {
    // A reader placed past the beginner lessons starts after them, as the
    // path page's "Commencer" does, not at the first lesson.
    expect(nextLesson(LESSONS, new Set(), new Set(["l1", "l2", "l3"]))?.id).toBe("l4");
    expect(nextLesson(LESSONS, new Set(["l4"]), new Set(["l1", "l2", "l3"]))?.id).toBe("l5");
  });

  it("offers the first waived lesson when every lesson left was waived", () => {
    const waived = new Set(["l5", "l6", "l7"]);
    expect(nextLesson(LESSONS, new Set(["l1", "l2", "l3", "l4"]), waived)?.id).toBe("l5");
  });

  it("is null once every lesson is completed, waived or not", () => {
    const all = new Set(LESSONS.map((l) => l.id));
    expect(nextLesson(LESSONS, all, new Set(["l1"]))).toBeNull();
  });
});

describe("currentLessonId", () => {
  it("keeps the lesson offered when it is in the path", () => {
    expect(currentLessonId(LESSONS, new Set(["l1"]), "l5")).toBe("l5");
  });

  it("falls back to the first lesson not done when the offer is foreign to the path", () => {
    // A lesson resumed from a class, say: the route still has to point somewhere.
    expect(currentLessonId(LESSONS, new Set(["l1", "l2"]), "elsewhere")).toBe("l3");
    expect(currentLessonId(LESSONS, new Set(["l1", "l2"]), null)).toBe("l3");
  });

  it("skips the waived lessons when nothing is offered", () => {
    expect(currentLessonId(LESSONS, new Set(), null, new Set(["l1", "l2"]))).toBe("l3");
    // A lesson left open still wins, even a waived one: it is what is on screen.
    expect(currentLessonId(LESSONS, new Set(), "l1", new Set(["l1", "l2"]))).toBe("l1");
  });

  it("has nothing to point at once every lesson is done", () => {
    expect(currentLessonId(LESSONS, new Set(LESSONS.map((l) => l.id)), null)).toBeNull();
  });
});

describe("moduleRoute", () => {
  it("draws the module of the current lesson, done then now then to come", () => {
    const route = moduleRoute(LESSONS, MODULES, new Set(["l1", "l2", "l3", "l4"]), "l5");
    expect(route).not.toBeNull();
    expect(route?.label).toBe("Module 02 · Le terminal");
    expect(route?.done).toBe(1);
    expect(route?.total).toBe(4);
    expect(route?.nodes.map((n) => n.state)).toEqual(["done", "now", "todo", "todo"]);
    expect(route?.nodes[1]?.slug).toBe("lecon-5");
  });

  it("names the block when the path has no modules", () => {
    const route = moduleRoute(LESSONS, [], new Set(), "l1");
    expect(route?.label).toBe("Module 01");
    // Blocks of six: the seventh lesson belongs to the second block.
    expect(route?.total).toBe(6);
    expect(moduleRoute(LESSONS, [], new Set(), "l7")?.label).toBe("Module 02");
  });

  it("shows the last module, all done, on a finished path", () => {
    const all = new Set(LESSONS.map((l) => l.id));
    const route = moduleRoute(LESSONS, MODULES, all, null);
    expect(route?.label).toBe("Module 02 · Le terminal");
    expect(route?.nodes.every((n) => n.state === "done")).toBe(true);
    expect(route?.done).toBe(4);
  });

  it("still marks the current lesson when it was completed before", () => {
    // Re-reading a finished lesson: it is the one on screen, so it is "now".
    const route = moduleRoute(LESSONS, MODULES, new Set(["l1", "l2"]), "l2");
    expect(route?.nodes.map((n) => n.state)).toEqual(["done", "now", "todo"]);
  });

  it("centres on the first lesson not waived, the waived ones still to come", () => {
    const route = moduleRoute(LESSONS, MODULES, new Set(), null, new Set(["l1", "l2", "l3"]));
    expect(route?.label).toBe("Module 02 · Le terminal");
    expect(route?.nodes.map((n) => n.state)).toEqual(["now", "todo", "todo", "todo"]);

    const first = moduleRoute(LESSONS, MODULES, new Set(), null, new Set(["l2"]));
    expect(first?.nodes.map((n) => n.state)).toEqual(["now", "todo", "todo"]);
  });

  it("returns null for an empty path", () => {
    expect(moduleRoute([], MODULES, new Set(), null)).toBeNull();
  });
});

describe("routeWindow", () => {
  const nodes = (states: ("done" | "now" | "todo")[]): RouteNode[] =>
    states.map((state, i) => ({
      id: `l${String(i)}`,
      slug: `l${String(i)}`,
      title: `L${String(i)}`,
      state,
    }));

  it("draws a short module whole", () => {
    const route = routeWindow(nodes(["done", "now", "todo"]));
    expect(route).toMatchObject({ hiddenBefore: 0, hiddenAfter: 0 });
    expect(route.nodes.map((n) => n.position)).toEqual([0, 1, 2]);
  });

  it("keeps one lesson behind the current one and counts the rest", () => {
    const states = Array.from({ length: 15 }, (_, i) =>
      i < 7 ? "done" : i === 7 ? "now" : "todo",
    );
    const route = routeWindow(nodes(states));
    expect(route.nodes.map((n) => n.position)).toEqual([6, 7, 8, 9, 10]);
    expect(route).toMatchObject({ hiddenBefore: 6, hiddenAfter: 4 });
  });

  it("starts at the first lesson when the module has just begun", () => {
    const states = Array.from({ length: 12 }, (_, i) => (i === 0 ? "now" : "todo"));
    const route = routeWindow(nodes(states));
    expect(route.nodes.map((n) => n.position)).toEqual([0, 1, 2, 3, 4]);
    expect(route).toMatchObject({ hiddenBefore: 0, hiddenAfter: 7 });
  });

  it("ends at the last lesson near the end, and when the module is done", () => {
    const near = Array.from({ length: 10 }, (_, i) => (i === 9 ? "now" : "done"));
    expect(routeWindow(nodes(near)).nodes.map((n) => n.position)).toEqual([5, 6, 7, 8, 9]);
    const done = routeWindow(nodes(Array.from({ length: 10 }, () => "done")));
    expect(done).toMatchObject({ hiddenBefore: 5, hiddenAfter: 0 });
  });
});
