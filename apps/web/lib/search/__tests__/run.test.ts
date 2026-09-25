import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  search: vi.fn<(userId: string, term: string) => Promise<unknown>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  MIN_SEARCH_LENGTH: 2,
  searchRepository: { search: m.search },
}));

const { MAX_TERM_LENGTH, searchFor } = await import("../run");

beforeEach(() => {
  m.search.mockReset();
  m.search.mockResolvedValue({ paths: [], lessons: [], notes: [] });
});

describe("searchFor", () => {
  it("asks nothing for a term shorter than the minimum, or none", async () => {
    expect(await searchFor("user-1", "a")).toEqual([]);
    expect(await searchFor("user-1", null)).toEqual([]);
    expect(await searchFor("user-1", "   ")).toEqual([]);
    expect(m.search).not.toHaveBeenCalled();
  });

  it("searches as the caller, the term trimmed and capped", async () => {
    await searchFor("user-1", "  sql  ");
    expect(m.search).toHaveBeenCalledWith("user-1", "sql");

    await searchFor("user-1", "x".repeat(500));
    expect(m.search.mock.calls[1]?.[1]).toHaveLength(MAX_TERM_LENGTH);
  });
});
