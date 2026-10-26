import { describe, expect, it } from "vitest";
import { findPrerequisiteCycle, type PrerequisiteEdge } from "../lesson-prerequisites";

/** "b>a" reads "b requires a". */
function edges(...links: string[]): PrerequisiteEdge[] {
  return links.map((link) => {
    const [lessonId = "", prerequisiteId = ""] = link.split(">");
    return { lessonId, prerequisiteId };
  });
}

describe("findPrerequisiteCycle", () => {
  it("accepts prerequisites that lead nowhere back", () => {
    expect(findPrerequisiteCycle("c", ["b"], edges("b>a"))).toBeNull();
    expect(findPrerequisiteCycle("c", [], edges("b>a", "a>c"))).toBeNull();
  });

  it("refuses a lesson as its own prerequisite", () => {
    expect(findPrerequisiteCycle("a", ["a"], [])).toEqual(["a", "a"]);
  });

  it("refuses a loop through other lessons, and tells it in full", () => {
    // a requires c, c requires b; giving b the prerequisite a closes the loop.
    expect(findPrerequisiteCycle("b", ["a"], edges("a>c", "c>b"))).toEqual(["b", "a", "c", "b"]);
  });

  it("reads the lesson's own links from the new list, not the old one", () => {
    // b used to require a, and a requires b would loop with it; b drops a.
    expect(findPrerequisiteCycle("b", [], edges("b>a", "a>b"))).toBeNull();
    expect(findPrerequisiteCycle("a", ["b"], edges("b>a"))).toEqual(["a", "b", "a"]);
  });

  it("finds the shortest loop when there are several", () => {
    const chain = findPrerequisiteCycle(
      "x",
      ["long", "short"],
      edges("long>l2", "l2>x", "short>x"),
    );
    expect(chain).toEqual(["x", "short", "x"]);
  });

  it("is not lost in a diamond", () => {
    expect(
      findPrerequisiteCycle("top", ["left", "right"], edges("left>base", "right>base")),
    ).toBeNull();
  });
});
