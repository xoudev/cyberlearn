import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  // The router's own props (scroll) are not the anchor's.
  default: (props: { href: string; children: React.ReactNode; scroll?: boolean }) => {
    const { href, children, ...rest } = props;
    delete rest.scroll;
    return React.createElement("a", { href, ...rest }, children);
  },
}));

const { DataGrid, nextSort, pagerSlots } = await import("../data-grid");
const { USER_SORT_KEYS, LESSON_SORT_KEYS } = await import("@/lib/list-params");
const { USER_COLUMNS } = await import("../../users/_components/columns");
const { LESSON_COLUMNS } = await import("../../lessons/_components/lesson-columns");

/**
 * The console's grid in its server-driven mode: what it links to, how its
 * headers sort, and that a column only offers the sorts the list reads.
 */

function serverGrid(overrides: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    React.createElement(DataGrid, {
      columns: [
        { label: "Utilisateur", sortKey: "user" },
        { label: "XP", align: "right", sortKey: "xp" },
        { label: "Certifs", align: "right" },
      ],
      rows: [{ id: "u1", cells: ["@amelie", "120", "1"] }],
      server: {
        path: "/users",
        params: { q: "amel", sort: "-xp", page: "3" },
        total: 260,
        page: 3,
        pageSize: 25,
        sort: { key: "xp", dir: "desc" },
        defaultSort: { key: "created", dir: "desc" },
      },
      facets: [
        {
          key: "role",
          label: "Rôle",
          value: undefined,
          options: [{ value: "ADMIN", label: "Admin" }],
        },
      ],
      ...overrides,
    }),
  );
}

describe("nextSort", () => {
  it("sorts up first, then down", () => {
    expect(nextSort("xp", undefined, undefined)).toBe("xp");
    expect(nextSort("xp", { key: "xp", dir: "asc" }, undefined)).toBe("-xp");
    expect(nextSort("xp", { key: "level", dir: "asc" }, undefined)).toBe("xp");
  });

  it("gives a list with an order of its own that order back on the third click", () => {
    expect(nextSort("xp", { key: "xp", dir: "desc" }, undefined)).toBeNull();
  });

  it("keeps the default order out of the URL", () => {
    const newest = { key: "created", dir: "desc" } as const;
    expect(nextSort("created", newest, newest)).toBe("created");
    expect(nextSort("created", { key: "created", dir: "asc" }, newest)).toBeNull();
    expect(nextSort("xp", { key: "xp", dir: "desc" }, newest)).toBe("xp");
  });
});

describe("pagerSlots", () => {
  it("shows the ends and the neighbours, with gaps between", () => {
    expect(pagerSlots(1, 1)).toEqual([1]);
    expect(pagerSlots(5, 11)).toEqual([1, null, 4, 5, 6, null, 11]);
    expect(pagerSlots(2, 4)).toEqual([1, 2, 3, 4]);
  });
});

describe("DataGrid, server-driven", () => {
  it("puts a real button in each sortable header, and says how the column is sorted", () => {
    const html = serverGrid();
    expect(html).toContain(
      '<th scope="col" style="text-align:right" aria-sort="descending"><button type="button" class="a-th-sort">XP',
    );
    expect(html).toContain('<th scope="col"><button type="button" class="a-th-sort">Utilisateur');
    // A column the list does not sort by stays plain text.
    expect(html).toContain('<th scope="col" style="text-align:right">Certifs</th>');
    expect(html.match(/aria-sort=/gu)).toHaveLength(1);
  });

  it("links every page, keeping the filters and the sort", () => {
    const html = serverGrid();
    expect(html).toContain('href="/users?q=amel&amp;sort=-xp&amp;page=2"');
    expect(html).toContain('href="/users?q=amel&amp;sort=-xp"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Page 3 / 11");
  });

  it("searches through a GET form that carries the other filters", () => {
    const html = serverGrid();
    expect(html).toContain('<form role="search" class="a-search" action="/users" method="get">');
    expect(html).toContain('name="q"');
    expect(html).toContain('<input type="hidden" name="sort" value="-xp"/>');
    expect(html).not.toContain('name="page"');
  });

  it("offers a reset that keeps the sort, and counts every match", () => {
    const html = serverGrid();
    expect(html).toContain('href="/users?sort=-xp"');
    expect(html).toContain("260 résultats");
  });

  it("says an empty filter is one, with the way back", () => {
    const html = serverGrid({
      rows: [],
      server: { path: "/users", params: { q: "zzz" }, total: 0, page: 1, pageSize: 25 },
    });
    expect(html).toContain("Aucun résultat");
    expect(html).toContain("Effacer les filtres");
    expect(html).not.toContain("a-pager");
  });

  it("adds a named checkbox to every row when rows can be selected", () => {
    const html = serverGrid({
      rows: [{ id: "l1", label: "Le modèle OSI", cells: ["OSI", "100", "0"] }],
      selection: { selected: new Set(["l1"]), onChange: () => undefined },
    });
    expect(html).toContain('aria-label="Sélectionner « Le modèle OSI »"');
    expect(html).toContain('aria-label="Sélectionner toutes les lignes de cette page"');
    expect(html).toContain('data-selected="true"');
  });
});

describe("the lists' columns", () => {
  it("only offer the sorts their URL reads", () => {
    const userKeys: readonly string[] = USER_SORT_KEYS;
    const lessonKeys: readonly string[] = LESSON_SORT_KEYS;
    for (const column of USER_COLUMNS) {
      if (column.sortKey !== undefined) expect(userKeys).toContain(column.sortKey);
    }
    for (const column of LESSON_COLUMNS) {
      if (column.sortKey !== undefined) expect(lessonKeys).toContain(column.sortKey);
    }
  });

  it("offer every sort their URL reads", () => {
    expect(
      USER_COLUMNS.flatMap((c) => (c.sortKey === undefined ? [] : [c.sortKey])).sort(),
    ).toEqual([...USER_SORT_KEYS].sort());
    expect(
      LESSON_COLUMNS.flatMap((c) => (c.sortKey === undefined ? [] : [c.sortKey])).sort(),
    ).toEqual([...LESSON_SORT_KEYS].sort());
  });
});
