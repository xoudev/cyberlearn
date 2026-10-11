import { describe, expect, it } from "vitest";
import {
  CATALOG_SEARCH_MAX,
  type CatalogFilters,
  catalogHref,
  parseCatalogFilters,
} from "../catalog-filters";

const NONE: CatalogFilters = {
  category: undefined,
  difficulty: undefined,
  status: undefined,
  q: "",
  page: 1,
};

describe("parseCatalogFilters", () => {
  it("reads the filters the catalogue knows", () => {
    expect(
      parseCatalogFilters({
        category: "NETWORK",
        difficulty: "ADVANCED",
        status: "NOT_STARTED",
        q: "ssh",
        page: "3",
      }),
    ).toEqual({
      category: "NETWORK",
      difficulty: "ADVANCED",
      status: "NOT_STARTED",
      q: "ssh",
      page: 3,
    });
  });

  it("is no filter at all for an empty URL", () => {
    expect(parseCatalogFilters({})).toEqual(NONE);
  });

  it("drops a value that is not one of its enum's, instead of sending it to the query", () => {
    expect(parseCatalogFilters({ category: "dev", difficulty: "foo", status: "DONE" })).toEqual(
      NONE,
    );
  });

  it("keeps the valid filters beside an invalid one", () => {
    const filters = parseCatalogFilters({ difficulty: "EXPERT", status: "nope" });
    expect(filters.difficulty).toBe("EXPERT");
    expect(filters.status).toBeUndefined();
  });

  it("reads the first of a repeated param", () => {
    expect(parseCatalogFilters({ difficulty: ["BEGINNER", "EXPERT"] }).difficulty).toBe("BEGINNER");
  });

  it("falls back to the first page for a page that is not a whole number from 1", () => {
    for (const page of ["0", "-2", "1.5", "abc", ""]) {
      expect(parseCatalogFilters({ page }).page).toBe(1);
    }
  });

  it("trims the search, and cuts one longer than the box allows", () => {
    expect(parseCatalogFilters({ q: "  injection  " }).q).toBe("injection");
    const long = `${"a".repeat(CATALOG_SEARCH_MAX)}bcd`;
    expect(parseCatalogFilters({ q: long }).q).toBe("a".repeat(CATALOG_SEARCH_MAX));
  });
});

describe("catalogHref", () => {
  const filters: CatalogFilters = {
    category: "DEV",
    difficulty: "BEGINNER",
    status: undefined,
    q: "git",
    page: 2,
  };

  it("sets a filter and goes back to the first page", () => {
    expect(catalogHref(filters, { status: "COMPLETED" })).toBe(
      "/lessons?category=DEV&difficulty=BEGINNER&q=git&status=COMPLETED",
    );
  });

  it("clears a filter with null", () => {
    expect(catalogHref(filters, { difficulty: null })).toBe("/lessons?category=DEV&q=git");
  });

  it("keeps the other filters when it only turns the page", () => {
    expect(catalogHref(filters, { page: "3" })).toBe(
      "/lessons?category=DEV&difficulty=BEGINNER&q=git&page=3",
    );
  });

  it("is the bare catalogue once nothing is left", () => {
    expect(catalogHref(NONE, {})).toBe("/lessons");
    expect(catalogHref({ ...NONE, category: "DEV" }, { category: null })).toBe("/lessons");
  });

  it("carries only valid filters, never what the URL had beside them", () => {
    const parsed = parseCatalogFilters({ difficulty: "foo", status: "IN_PROGRESS", utm: "x" });
    expect(catalogHref(parsed, { category: "NETWORK" })).toBe(
      "/lessons?status=IN_PROGRESS&category=NETWORK",
    );
  });
});
