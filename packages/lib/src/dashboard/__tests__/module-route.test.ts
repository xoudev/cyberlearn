import { describe, expect, it } from "vitest";
import { currentLessonId, moduleRoute, type RouteLesson } from "../module-route";

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

describe("currentLessonId", () => {
  it("keeps the lesson offered when it is in the path", () => {
    expect(currentLessonId(LESSONS, new Set(["l1"]), "l5")).toBe("l5");
  });

  it("falls back to the first lesson not done when the offer is foreign to the path", () => {
    // A lesson resumed from a class, say: the route still has to point somewhere.
    expect(currentLessonId(LESSONS, new Set(["l1", "l2"]), "elsewhere")).toBe("l3");
    expect(currentLessonId(LESSONS, new Set(["l1", "l2"]), null)).toBe("l3");
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

  it("returns null for an empty path", () => {
    expect(moduleRoute([], MODULES, new Set(), null)).toBeNull();
  });
});
