import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activeSectionHref,
  breadcrumbOf,
  CONSOLE_DESTINATIONS,
  CONSOLE_MAIN_SECTIONS,
  CONSOLE_SYSTEM_SECTIONS,
} from "../console-nav";
import { matchDestinations } from "../command-palette";

/**
 * The console's map against the console itself: every page a person can
 * reach by its address is in the quick search, and the breadcrumb names every
 * segment of it. Both had fallen behind - Tournois was in the sidebar and
 * nowhere else, and /lessons/sync read "Leçons".
 */

const ADMIN = join(__dirname, "..", "..", "app", "(admin)");

function pagesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "__tests__" && !entry.startsWith("_")) pagesUnder(full, out);
    } else if (entry === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

/** The address a page answers at: route groups such as (list) are not in it. */
function routeOf(page: string): string {
  const segments = relative(ADMIN, page)
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !/^\(.*\)$/u.test(segment));
  return `/${segments.join("/")}`;
}

const ROUTES = pagesUnder(ADMIN).map(routeOf);
const STATIC_ROUTES = ROUTES.filter((route) => !route.includes("["));

describe("the console's pages", () => {
  it("are found, the static ones among them", () => {
    expect(ROUTES.length).toBeGreaterThan(30);
    expect(STATIC_ROUTES).toEqual(
      expect.arrayContaining(["/lessons", "/users", "/tournaments", "/lessons/sync"]),
    );
  });

  it.each(STATIC_ROUTES)("%s is a destination of the quick search", (route) => {
    expect(CONSOLE_DESTINATIONS.map((d) => d.href)).toContain(route);
  });

  it.each(ROUTES)("%s has a name in the breadcrumb for every segment but an id", (route) => {
    const named = route.split("/").filter((s) => s !== "" && !s.startsWith("["));
    expect(breadcrumbOf(route)).toHaveLength(named.length);
  });

  it("go nowhere the console does not have", () => {
    for (const destination of CONSOLE_DESTINATIONS) {
      expect(STATIC_ROUTES, destination.label).toContain(destination.href);
    }
  });

  it("are each listed once", () => {
    const hrefs = CONSOLE_DESTINATIONS.map((d) => d.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("the sidebar", () => {
  it("is a subset of the quick search, so the two cannot drift again", () => {
    for (const section of [...CONSOLE_MAIN_SECTIONS, ...CONSOLE_SYSTEM_SECTIONS]) {
      expect(CONSOLE_DESTINATIONS).toContainEqual(
        expect.objectContaining({ label: section.label, href: section.href, kind: "page" }),
      );
    }
  });

  it("lists Tournois", () => {
    expect(CONSOLE_MAIN_SECTIONS.map((s) => s.href)).toContain("/tournaments");
  });

  it("lists Signalements with its count, once", () => {
    const reports = CONSOLE_MAIN_SECTIONS.filter((s) => s.href === "/moderation/reports");
    expect(reports).toEqual([expect.objectContaining({ label: "Signalements", count: "reports" })]);
  });
});

describe("activeSectionHref", () => {
  const sections = [...CONSOLE_MAIN_SECTIONS, ...CONSOLE_SYSTEM_SECTIONS];

  it("lights the most specific section, not its parent too", () => {
    expect(activeSectionHref("/moderation/reports", sections)).toBe("/moderation/reports");
    expect(activeSectionHref("/moderation", sections)).toBe("/moderation");
    expect(activeSectionHref("/moderation/content", sections)).toBe("/moderation");
  });

  it("lights a section from a page under it, and nothing elsewhere", () => {
    expect(activeSectionHref("/lessons/abc/edit", sections)).toBe("/lessons");
    expect(activeSectionHref("/lessonsx", sections)).toBeNull();
    expect(activeSectionHref("/search", sections)).toBeNull();
  });

  it("lights an entry from any page under its match prefix", () => {
    expect(activeSectionHref("/reference/quests", sections)).toBe("/reference/cosmetics");
    expect(activeSectionHref("/reference/cosmetics", sections)).toBe("/reference/cosmetics");
  });
});

describe("breadcrumbOf", () => {
  it("names the sections it used to miss", () => {
    expect(breadcrumbOf("/tournaments")).toEqual(["Tournois"]);
    expect(breadcrumbOf("/classes")).toEqual(["Classes"]);
    expect(breadcrumbOf("/moderation")).toEqual(["Modération"]);
    expect(breadcrumbOf("/moderation/notes")).toEqual(["Modération", "Notes signalées"]);
    expect(breadcrumbOf("/moderation/reports")).toEqual(["Modération", "Signalements"]);
    expect(breadcrumbOf("/moderation/content")).toEqual(["Modération", "Contenus publiés"]);
    expect(breadcrumbOf("/lessons/reports")).toEqual(["Leçons", "Questions signalées"]);
    expect(breadcrumbOf("/lessons/sync")).toEqual(["Leçons", "Synchronisation"]);
    expect(breadcrumbOf("/classes/structure")).toEqual(["Classes", "Établissements et promos"]);
  });

  it("names a creation under its section, in the section's own words", () => {
    expect(breadcrumbOf("/tournaments/new")).toEqual(["Tournois", "Nouveau"]);
    expect(breadcrumbOf("/lessons/new")).toEqual(["Leçons", "Nouvelle"]);
    expect(breadcrumbOf("/classes/new")).toEqual(["Classes", "Créer"]);
  });

  it("leaves an id out", () => {
    expect(breadcrumbOf("/lessons/3b7c0f4e-1111-4111-8111-111111111111/edit")).toEqual([
      "Leçons",
      "Édition",
    ]);
    expect(breadcrumbOf("/paths/3b7c0f4e/quiz")).toEqual(["Parcours", "Quiz"]);
  });

  it("knows nothing on Object.prototype, nor the root", () => {
    expect(breadcrumbOf("/constructor/toString")).toEqual([]);
    expect(breadcrumbOf("/")).toEqual([]);
  });
});

describe("the quick search's words", () => {
  const labels = (query: string): string[] =>
    matchDestinations(query, CONSOLE_DESTINATIONS).map((d) => d.label);

  it("finds the tournaments", () => {
    expect(labels("tournoi")).toEqual(["Tournois", "Nouveau tournoi"]);
  });

  it("finds every reported list by « signalements », the reports queue first", () => {
    expect(labels("signalements")).toEqual(
      expect.arrayContaining(["Signalements", "Questions signalées", "Notes signalées"]),
    );
    expect(labels("signalements")[0]).toBe("Signalements");
  });

  it("finds the sync by « synchro »", () => {
    expect(labels("synchro")).toEqual(["Synchroniser avec le dépôt"]);
  });

  it("finds the archives of both kinds", () => {
    expect(labels("archives").sort()).toEqual(["Leçons archivées", "Parcours archivés"]);
  });
});
