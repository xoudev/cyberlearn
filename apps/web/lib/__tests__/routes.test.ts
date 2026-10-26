import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { navGroupsFor } from "@cyberlearn/lib/navigation/groups";
import robots from "@/app/robots";
import { sidebarGroups } from "@/lib/sidebar/items";
import {
  APP_ROUTES,
  isProtectedRoute,
  PROTECTED_ROUTE_PREFIXES,
  ROBOTS_DISALLOWED,
  sidebarIconOf,
} from "../routes";

/**
 * The route registry against the folders it describes. A page added under
 * app/(app) is a signed-in page: without its line in lib/routes.ts the
 * middleware would let a visitor through to it (the page itself then sent
 * them to the login without the way back) and robots.txt would let crawlers
 * index the login page under its name. This test walks the folder so that
 * cannot be forgotten.
 */

const APP_DIR = path.join(__dirname, "..", "..", "app");

/** The first segment of every route under a folder: no _private, (group) or file. */
function topSegments(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("_") && !name.startsWith("("));
}

/** Whether a folder holds a page.tsx, itself or anywhere beneath it. */
function holdsPage(dir: string): boolean {
  return readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory() ? holdsPage(path.join(dir, entry.name)) : entry.name === "page.tsx",
  );
}

/**
 * Whether pages answer at `href` or beneath it, in any route group: /tournaments
 * has no page of its own any more, a tournament's pages live beneath it.
 */
function hasPage(href: string): boolean {
  const segment = href.slice(1);
  const roots = [
    APP_DIR,
    ...readdirSync(APP_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
      .map((entry) => path.join(APP_DIR, entry.name)),
  ];
  return roots.some((root) => {
    const dir = path.join(root, segment);
    return existsSync(dir) && holdsPage(dir);
  });
}

function disallowed(): string[] {
  const policy = robots();
  const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
  const disallow = rules.find((rule) => rule.userAgent === "*")?.disallow ?? [];
  return Array.isArray(disallow) ? disallow : [disallow];
}

describe("every signed-in page is in the registry", () => {
  const segments = topSegments(path.join(APP_DIR, "(app)"));

  it("finds the pages to check", () => {
    expect(segments).toEqual(expect.arrayContaining(["dashboard", "lessons", "duels"]));
  });

  it.each(segments)("/%s sends a visitor to the login", (segment) => {
    expect(isProtectedRoute(`/${segment}`)).toBe(true);
    expect(isProtectedRoute(`/${segment}/anything`)).toBe(true);
  });

  it.each(segments)("/%s is kept off by robots.txt, with the pages beneath it", (segment) => {
    expect(disallowed()).toContain(`/${segment}`);
    expect(disallowed()).toContain(`/${segment}/`);
  });
});

describe("the registry names no page that is not there", () => {
  it.each(APP_ROUTES.filter((route) => route.protected).map((route) => route.href))(
    "%s has a page",
    (href) => {
      expect(hasPage(href)).toBe(true);
    },
  );

  it("protects nothing that has no page: the retired addresses are redirects", () => {
    for (const href of [
      "/revisions",
      "/review",
      "/badges",
      "/certificates",
      "/settings",
      "/changelog",
    ]) {
      expect(hasPage(href)).toBe(false);
      expect(isProtectedRoute(href)).toBe(false);
      expect(disallowed()).toContain(href);
    }
  });

  it("protects the onboarding, outside (app) but behind the login all the same", () => {
    expect(isProtectedRoute("/onboarding/placement-test")).toBe(true);
  });

  it("lists every address once", () => {
    const hrefs = APP_ROUTES.map((route) => route.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("derives the middleware's list and robots.txt's from the same rows", () => {
    expect(PROTECTED_ROUTE_PREFIXES).toEqual(
      APP_ROUTES.filter((route) => route.protected).map((route) => route.href),
    );
    expect(disallowed()).toEqual([...ROBOTS_DISALLOWED]);
    for (const prefix of PROTECTED_ROUTE_PREFIXES) {
      expect(ROBOTS_DISALLOWED).toContain(prefix);
    }
  });
});

describe("the sidebar and the registry agree", () => {
  const listed = navGroupsFor("web").flatMap((group) => group.entries);
  // The entries that open a window over the page rather than lead to one.
  const windows = sidebarGroups({ hasClasses: true, showRevisions: true, duelInvitations: 0 })
    .flatMap((group) => group.items)
    .filter((item) => item.opens !== undefined)
    .map((item) => item.href);
  const pages = listed.map((entry) => entry.href).filter((href) => !windows.includes(href));

  it.each(pages)("%s has a page and an icon", (href) => {
    expect(hasPage(href)).toBe(true);
    expect(sidebarIconOf(href)).not.toBeNull();
  });

  it("finds the one entry that opens a window: the day's recall", () => {
    expect(windows).toEqual(["/revisions"]);
  });

  it.each(windows)("%s has an icon, and only a redirect to its window behind it", (href) => {
    expect(sidebarIconOf(href)).not.toBeNull();
    expect(hasPage(href)).toBe(false);
    expect(isProtectedRoute(href)).toBe(false);
    expect(disallowed()).toContain(href);
  });

  it("gives an icon to the pages the sidebar lists, and to no other", () => {
    const withIcon = APP_ROUTES.filter((route) => route.icon !== null).map((route) => route.href);
    expect(withIcon.sort()).toEqual(listed.map((entry) => entry.href).sort());
  });

  it("leaves the glossary public and in the sitemap's reach", () => {
    expect(isProtectedRoute("/glossaire")).toBe(false);
    expect(disallowed()).not.toContain("/glossaire");
  });
});
