import { describe, expect, it } from "vitest";
import { SEARCH_COPY, isSearchable, searchTarget, type SearchResultItem } from "../search";

function result(kind: SearchResultItem["kind"], ref: string): SearchResultItem {
  return {
    kind,
    id: "x",
    title: "Injection SQL",
    subtitle: "",
    ref,
    meta: "",
    category: "CYBERSEC",
  };
}

describe("the search in the app", () => {
  it("sends nothing below two characters, spaces aside", () => {
    expect(isSearchable("s")).toBe(false);
    expect(isSearchable(" s ")).toBe(false);
    expect(isSearchable("sq")).toBe(true);
  });

  it("opens a parcours, a lesson, and a note on its lesson", () => {
    expect(searchTarget(result("path", "cyber-fondamentaux"))).toEqual({
      pathname: "/paths/[slug]",
      params: { slug: "cyber-fondamentaux" },
    });
    expect(searchTarget(result("lesson", "injection-sql"))).toEqual({
      pathname: "/lessons/[slug]",
      params: { slug: "injection-sql" },
    });
    expect(searchTarget(result("note", "lesson-7"))).toEqual({
      pathname: "/notes/[lessonId]",
      params: { lessonId: "lesson-7", title: "Injection SQL" },
    });
  });

  it("says so when nothing matches", () => {
    expect(SEARCH_COPY.empty("xyz")).toBe("Aucun résultat pour « xyz ».");
  });
});
