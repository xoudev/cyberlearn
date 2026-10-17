import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: (props: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href: props.href }, props.children),
}));

const { DataGridSkeleton, FiltersSkeleton, KpiGridSkeleton } = await import(
  "../data-grid-skeleton"
);
const { FormSkeleton, TableSkeleton } = await import("../page-skeletons");

/**
 * The console's loading states: every page has one, it stands in for that
 * page alone, and it is drawn from the page's own constants.
 *
 * Three of them used to be drawn by hand, and none looked like its page: the
 * badges loaded as a grid of hexagons and rendered as a table, the paths as
 * seven columns for nine, the overview as four cards that were not its
 * figures. Twenty-three pages had none at all, and six fell back on a list's
 * skeleton they did not belong to. These checks read the sources, so a new
 * page without its skeleton, or a skeleton that writes its own headers, fails
 * here rather than on screen.
 */

const ADMIN = join(__dirname, "..", "..");

function filesUnder(dir: string, keep: (path: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      out.push(...filesUnder(path, keep));
    } else if (keep(path)) {
      out.push(path);
    }
  }
  return out;
}

function where(path: string): string {
  return relative(ADMIN, path).split(sep).join("/");
}

const PAGES = filesUnder(ADMIN, (path) => path.endsWith(`${sep}page.tsx`));
const LOADINGS = filesUnder(ADMIN, (path) => path.endsWith(`${sep}loading.tsx`));

/** The source of a JSX attribute's expression, braces balanced: crumbs={...}. */
function attribute(source: string, name: string): string | null {
  const start = source.indexOf(`${name}={`);
  if (start === -1) return null;
  let depth = 0;
  for (let index = start + name.length + 1; index < source.length; index++) {
    const char = source[index];
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(start + name.length + 2, index);
    }
  }
  return null;
}

/** A source from its PageHeader on: where the header's own attributes come first. */
function header(source: string): string {
  const start = source.indexOf("<PageHeader");
  return start === -1 ? "" : source.slice(start);
}

/** The SHOUTED constants an expression reads: BADGE_CRUMBS, USERS_HEADER. */
function constantsIn(expression: string): string[] {
  return expression.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/gu) ?? [];
}

/** The section a file belongs to: badges, lessons, users. */
function sectionOf(path: string): string {
  return where(path).split("/")[0] ?? "";
}

/** The page a loading state stands in for: the one beside it. */
function pageOf(loading: string): string {
  return join(dirname(loading), "page.tsx");
}

/**
 * The constants of a page that its skeleton must not restate: its trail and
 * title, its figures, its columns, its cards, its filters.
 */
const PAGE_CONSTANT = /_(?:HEADER|CRUMBS|COLUMNS|KPI_LABELS|CARDS|FILTER_LABELS)$/u;

/** Everything a section renders with, its loading states left out. */
function sectionSources(section: string): string[] {
  return filesUnder(join(ADMIN, section), (path) => /\.tsx?$/u.test(path)).filter(
    (path) => !path.endsWith(`${sep}loading.tsx`),
  );
}

describe("console loading states", () => {
  it("finds the pages and their skeletons at all", () => {
    expect(PAGES.length).toBeGreaterThan(30);
    expect(LOADINGS.length).toBe(PAGES.length);
  });

  it.each(PAGES.map((path) => [where(path), path]))("%s has its own loading state", (_n, path) => {
    // Beside it: in its segment, or in the (list) group that holds the list
    // apart from the pages under it.
    expect(existsSync(join(dirname(path), "loading.tsx"))).toBe(true);
  });

  it.each(LOADINGS.map((path) => [where(path), path]))(
    "%s stands in for its own page and no other",
    (_n, path) => {
      // A loading.tsx wraps every page below it: a list's skeleton next to
      // the list's children is the one /badges/new loaded under.
      const covered = PAGES.filter((page) => page.startsWith(dirname(path) + sep));
      expect(covered.map(where)).toEqual([where(pageOf(path))]);
    },
  );

  it.each(LOADINGS.map((path) => [where(path), path]))(
    "%s is a console page in the console's style",
    (_n, path) => {
      const source = readFileSync(path, "utf8");
      expect(source).toContain('<main className="a-page" aria-busy="true">');
      expect(source).toContain("<PageHeader");
      // No colour of its own, and square like the console.
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
      expect(source).not.toMatch(/borderRadius:\s*(?!0\b)/u);
      expect(source).not.toMatch(/border-radius|rounded/u);
      // The shared Skeleton, not a shimmer of its own.
      expect(source).not.toMatch(/skeleton-shimmer|components\/ui\/skeleton/u);
    },
  );

  it.each(LOADINGS.map((path) => [where(path), path]))(
    "%s takes its trail and title from the page's constants",
    (_n, path) => {
      const source = header(readFileSync(path, "utf8"));
      const page = header(readFileSync(pageOf(path), "utf8"));

      const crumbs = attribute(source, "crumbs") ?? "";
      const named = constantsIn(crumbs);
      expect(named, "a trail written out in the skeleton").not.toEqual([]);
      for (const constant of named) {
        expect(attribute(page, "crumbs") ?? "", `the page's trail reads ${constant}`).toContain(
          constant,
        );
      }

      // A title the page reads from the database waits as a block; a fixed
      // one comes from the same constant as the page's.
      for (const constant of constantsIn(attribute(source, "title") ?? "")) {
        expect(attribute(page, "title") ?? "", `the page's title reads ${constant}`).toContain(
          constant,
        );
      }
    },
  );

  it.each(LOADINGS.map((path) => [where(path), path]))(
    "%s reads nothing of the page's that the page does not",
    (_n, path) => {
      const source = readFileSync(path, "utf8");
      const section = sectionSources(sectionOf(path));
      const imported = [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.[^"]*"/gu)]
        .flatMap((match) => (match[1] ?? "").split(","))
        .map((name) => name.trim())
        .filter((name) => PAGE_CONSTANT.test(name));
      for (const constant of imported) {
        // Read by the page, or by a component of its section that renders
        // for it (the paths grid, the account figures, the tournament form).
        const readers = section.filter((file) => {
          const text = readFileSync(file, "utf8");
          return (
            !text.includes(`export const ${constant}`) &&
            new RegExp(`\\b${constant}\\b`, "u").test(text)
          );
        });
        expect(readers.map(where), `${constant} is read by the page`).not.toEqual([]);
      }
    },
  );

  it.each(PAGES.map((path) => [where(path), path]))(
    "%s and its skeleton draw the same grid",
    (_n, path) => {
      const page = readFileSync(path, "utf8");
      const loading = readFileSync(join(dirname(path), "loading.tsx"), "utf8");
      const section = sectionSources(sectionOf(path)).map((file) => readFileSync(file, "utf8"));

      // A grid's columns are a constant, never a list written in the page.
      if (page.includes("<DataGrid")) {
        expect(attribute(page, "columns") ?? "").toMatch(/^[A-Z][A-Z0-9_]*_COLUMNS$/u);
      }

      const grid = /<[A-Z]\w*Grid[\s/>]/u.test(page);
      expect(loading.includes("<DataGridSkeleton"), "a grid loads as a grid").toBe(grid);
      if (!grid) return;

      const columns = attribute(loading, "columns") ?? "";
      expect(columns).toMatch(/^[A-Z][A-Z0-9_]*_COLUMNS$/u);
      expect(
        section.some((text) => text.includes(`columns={${columns}}`)),
        `the page's grid takes ${columns}`,
      ).toBe(true);
    },
  );

  it.each(LOADINGS.map((path) => [where(path), path]))("%s renders", async (_n, path) => {
    const loaded: unknown = await import(pathToFileURL(path).href);
    const component =
      typeof loaded === "object" && loaded !== null && "default" in loaded
        ? loaded.default
        : undefined;
    expect(typeof component).toBe("function");
    if (typeof component !== "function") return;
    // SAFETY: a loading.tsx default export is a component without props.
    const html = renderToStaticMarkup(React.createElement(component as () => React.ReactElement));
    expect(html).toMatch(/^<main class="a-page" aria-busy="true">/u);
    expect(html).toContain('<h1 class="a-h1">');
    expect(html).toContain("cl-skel");
  });
});

describe("DataGridSkeleton", () => {
  const COLUMNS = [{ label: "Nom" }, { label: "XP", align: "right" as const }, { label: "Statut" }];

  it("heads the table with the page's columns, in order, aligned as the grid aligns them", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataGridSkeleton, { columns: COLUMNS, rows: 2 }),
    );
    expect([...html.matchAll(/<th[^>]*>([^<]*)<\/th>/gu)].map((match) => match[1])).toEqual([
      "Nom",
      "XP",
      "Statut",
    ]);
    expect(html).toContain('<th style="text-align:right">XP</th>');
    expect(html.match(/<tr>/gu)).toHaveLength(3);
  });

  it("draws as many filter menus as the page's toolbar holds, and a box column when it selects", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataGridSkeleton, {
        columns: COLUMNS,
        rows: 1,
        facets: 3,
        selectable: true,
      }),
    );
    expect(html.match(/width:132px;height:36px/gu)).toHaveLength(3);
    expect(html.match(/class="a-check-cell"/gu)).toHaveLength(2);
    expect(html).toContain('class="cl-skel a-search"');
  });

  it("takes a toolbar of its own in place of the search and the menus", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataGridSkeleton, {
        columns: COLUMNS,
        rows: 1,
        facets: 2,
        toolbar: React.createElement(FiltersSkeleton, { labels: ["Acteur", "Du"] }),
      }),
    );
    expect(html).not.toContain("a-search");
    expect(html).not.toContain("width:132px;height:36px");
    expect(html).toContain('<span class="a-filter">Acteur');
    expect(html).toContain('<span class="a-filter">Du');
  });

  it("is square: no block of it is rounded", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataGridSkeleton, { columns: COLUMNS, facets: 1, selectable: true }),
    );
    expect(html).not.toContain("border-radius");
  });
});

describe("KpiGridSkeleton", () => {
  it("names the figures and lets only their values wait", () => {
    const html = renderToStaticMarkup(
      React.createElement(KpiGridSkeleton, { labels: ["Total", "Actifs"], className: "a-x" }),
    );
    expect(html).toContain('<div class="a-kpi-grid a-x" aria-hidden="true">');
    expect(
      [...html.matchAll(/<div class="a-kpi-label">([^<]*)<\/div>/gu)].map((m) => m[1]),
    ).toEqual(["Total", "Actifs"]);
  });
});

describe("FormSkeleton", () => {
  it("draws fields under their labels, never a grid", () => {
    const html = renderToStaticMarkup(
      React.createElement(FormSkeleton, { rows: [2, 1, { height: 90 }, 3] }),
    );
    expect(html.match(/class="a-field"/gu)).toHaveLength(7);
    expect(html.match(/class="a-label"/gu)).toHaveLength(7);
    expect(html).toContain('class="admin-form-grid-2"');
    expect(html).toContain("height:90px");
    expect(html).not.toContain("<table");
  });

  it("ends on its submit button unless told there is none", () => {
    const withSubmit = renderToStaticMarkup(React.createElement(FormSkeleton, { rows: [1] }));
    expect(withSubmit).toContain("width:160px;height:40px");
    const without = renderToStaticMarkup(
      React.createElement(FormSkeleton, { rows: [1], submit: 0 }),
    );
    expect(without).not.toContain("height:40px");
  });
});

describe("TableSkeleton", () => {
  it("heads a table with known columns, and leaves a bare one without a head", () => {
    const headed = renderToStaticMarkup(
      React.createElement(TableSkeleton, {
        columns: [{ label: "Utilisateur" }, { label: "Niveau", align: "right" }],
        rows: 2,
      }),
    );
    expect(headed).toContain("<th>Utilisateur</th>");
    expect(headed.match(/<tr>/gu)).toHaveLength(3);

    const bare = renderToStaticMarkup(React.createElement(TableSkeleton, { columns: 3, rows: 2 }));
    expect(bare).not.toContain("<thead>");
    expect(bare.match(/<td/gu)).toHaveLength(6);
  });
});
