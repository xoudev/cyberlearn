import { describe, expect, it } from "vitest";
import { availableFirst } from "../catalog-order";
import { indexPlacements } from "../unlock";

describe("catalogue availability order", () => {
  it("moves available lessons across pagination boundaries without changing recency within groups", () => {
    const lessons = Array.from({ length: 12 }, (_, i) => ({ id: String(i) }));
    const placements = indexPlacements(
      [
        {
          id: "path",
          slug: "path",
          title: "Path",
          lessons: lessons.map((lesson, position) => ({ lesson, position })),
        },
      ],
      ["9"],
    );
    const sorted = availableFirst(lessons, placements);
    expect(sorted.slice(0, 3).map((lesson) => lesson.id)).toEqual(["0", "9", "10"]);
    expect(sorted.slice(3).map((lesson) => lesson.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "11",
    ]);
    expect(lessons[1]?.id).toBe("1");
  });

  it("keeps lessons outside a path accessible", () => {
    expect(availableFirst([{ id: "standalone" }], new Map())).toEqual([{ id: "standalone" }]);
  });
});
