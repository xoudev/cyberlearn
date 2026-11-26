import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every class the site names in its markup has a rule somewhere, or is listed
 * below as one that needs none.
 *
 * The redesign of October 2026 (#546) rewrote the stylesheets and left the
 * dashboard's « Tes amis », « Tournois en cours » and « Rappel du jour »
 * without a rule: the markup still named the classes, nothing drew them, and
 * nothing failed. This is what fails now.
 *
 * Only the site's own classes are read: Tailwind's utilities are generated
 * from the markup itself, so they never have a rule to find.
 */

const WEB = path.resolve(__dirname, "../..");
const UI = path.resolve(WEB, "../../packages/ui/src");

/**
 * Classes that name an element without styling it: a wrapper whose children
 * carry the rules, a hook for a script or a test, a variant whose look went
 * with the old palette. Adding one here is a decision, not a fix.
 */
const UNSTYLED = new Set([
  // Wrappers: the children are styled, the box needs nothing of its own.
  "challenge-runner",
  "cls-tabpanel",
  "cp-final",
  "dfx-card__preview",
  "dfx-tabs",
  "home-bench-panel",
  "home-progression-copy",
  "leaderboard-view-tabs",
  "learning-dashboard-inner",
  "lesson-discussion",
  "lesson-plan__text",
  "lesson-toolbar__tool",
  "lesson-toolbar__tools",
  "note-editor__colors",
  "note-editor__preview-body",
  "nw-chip--lesson",
  "nw-review",
  "ob-avatar",
  "ob-profile",
  "path-map",
  "r-ans__text",
  "rp-question",
  "rp-window",
  "workspace-loading",
  // Sized by its width and height attributes.
  "kind-ico",
  // Read by the terminal's script and its tests, drawn by its inline styles.
  "linux-terminal",
  "linux-terminal--broken",
  // The teal button of the old palette: the redesign kept one colour.
  "cp-boss__cta--teal",
]);

/** Tailwind's utilities, by their first segment: generated, never written. */
const UTILITY =
  /^-?(m[xytrbl]?|p[xytrbl]?|w|h|size|min-w|min-h|max-w|max-h|gap|space|text|bg|border|ring|font|leading|tracking|flex|grid|col|row|items|justify|self|place|content|overflow|top|left|right|bottom|inset|z|opacity|shadow|rounded|transition|duration|ease|delay|animate|shrink|grow|basis|order|cursor|select|pointer|sr|not|whitespace|break|truncate|object|aspect|line|underline|decoration|outline|fill|stroke|translate|scale|rotate|backdrop|blur|divide|from|via|to)(-|$)/u;

/** A class of the site's own: lowercase, hyphenated, BEM elements and modifiers allowed. */
const OWN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$/u;

function files(dir: string, ext: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "__tests__") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...files(full, ext));
    else if (entry.name.endsWith(ext)) found.push(full);
  }
  return found;
}

/** The classes written as plain strings in `className="…"`. */
function namedClasses(): Map<string, string> {
  const named = new Map<string, string>();
  for (const file of [
    ...files(path.join(WEB, "app"), ".tsx"),
    ...files(path.join(WEB, "components"), ".tsx"),
  ]) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/className="([^"]+)"/gu)) {
      for (const name of (match[1] ?? "").split(/\s+/u)) {
        if (!/[-_]/u.test(name) || !OWN.test(name) || UTILITY.test(name)) continue;
        if (!named.has(name)) named.set(name, path.relative(WEB, file));
      }
    }
  }
  return named;
}

const STYLESHEETS = [
  ...files(path.join(WEB, "app"), ".css"),
  ...files(path.join(WEB, "components"), ".css"),
  ...files(UI, ".css"),
]
  .map((file) => readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//gu, ""))
  .join("\n");

function hasRule(name: string): boolean {
  // `OWN` lets through letters, digits, "-" and "_" only: nothing to escape.
  return new RegExp(`\\.${name}(?![a-zA-Z0-9_-])`, "u").test(STYLESHEETS);
}

describe("class coverage", () => {
  const named = namedClasses();

  it("reads the site's markup", () => {
    // A guard that reads nothing passes everything.
    expect(named.size).toBeGreaterThan(500);
    expect(named.has("dash-friend")).toBe(true);
  });

  it("finds a rule for every class the markup names", () => {
    const missing = [...named]
      .filter(([name]) => !UNSTYLED.has(name) && !hasRule(name))
      .map(([name, file]) => `${name} (${file})`);
    expect(missing).toEqual([]);
  });

  it("lists as unstyled only classes that still exist and still have no rule", () => {
    // A class that left the markup, or gained a rule, comes off the list.
    const stale = [...UNSTYLED].filter((name) => !named.has(name) || hasRule(name));
    expect(stale).toEqual([]);
  });
});
