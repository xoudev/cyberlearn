import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as adminUi from "../admin-ui";
import { PageHeader, toneColor, type Tone } from "../admin-ui";

/**
 * The console's foundations: one palette, one page header, one width.
 *
 * Each of the three had drifted the same way, by copy. The palette was
 * restated in hex twice (admin-ui.css and a UI constant) and its danger, info
 * and warning no longer matched the site's; pages came with five kinds of
 * header and six max-widths. These checks read the sources, so a new page or
 * a new colour that goes back to the old ways fails here rather than on
 * screen.
 */

const APP = join(__dirname, "..", "..", "..");
const ADMIN = join(APP, "(admin)");

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

const SOURCES = filesUnder(APP, (path) => /\.(tsx?|css)$/u.test(path));
const PAGES = filesUnder(ADMIN, (path) => path.endsWith("page.tsx"));
const css = readFileSync(join(APP, "admin-ui.css"), "utf8");
const globals = readFileSync(join(APP, "globals.css"), "utf8");

/** The --a-* declarations of admin-ui.css, name to value. */
function consolePalette(): Map<string, string> {
  const palette = new Map<string, string>();
  for (const match of css.matchAll(/(--a-[\w-]+)\s*:\s*([^;]+);/gu)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) palette.set(name, value.trim());
  }
  return palette;
}

function where(path: string): string {
  return relative(APP, path).replace(/\\/gu, "/");
}

describe("the console palette", () => {
  it("names the shared tokens instead of restating them", () => {
    const palette = consolePalette();
    expect(palette.size).toBeGreaterThan(10);
    for (const [name, value] of palette) {
      // A reference, never a colour: no hex, no rgb(), and a --color-* token
      // at the bottom of it.
      expect(value, name).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/iu);
      expect(value, name).toMatch(/var\(--color-[\w-]+\)/u);
    }
  });

  it("declares every --a-* variable the console reads", () => {
    const declared = consolePalette();
    for (const path of SOURCES) {
      for (const match of readFileSync(path, "utf8").matchAll(/var\((--a-[\w-]+)/gu)) {
        expect(declared.has(match[1] ?? ""), `${where(path)} reads ${String(match[1])}`).toBe(true);
      }
    }
  });

  it("has no hex copy of itself left in TypeScript", () => {
    expect("UI" in adminUi).toBe(false);
    for (const path of SOURCES) {
      const source = readFileSync(path, "utf8");
      expect(source, where(path)).not.toMatch(
        /import\s*\{[^}]*\bUI\b[^}]*\}\s*from\s*"[^"]*admin-ui"/u,
      );
    }
  });

  it("gives every tone a token, so a role colour follows the site's", () => {
    const tones: Tone[] = ["neutral", "accent", "info", "warning", "danger", "purple"];
    for (const tone of tones) expect(toneColor(tone)).toMatch(/^var\(--a-[\w-]+\)$/u);
  });

  it("keeps none of the reds, blues and ambers that had drifted from the tokens", () => {
    // #FF4757 is the Cybersec category red, not the alert red; #4D8BFF and
    // #FFB547 were copies of the info blue and of an amber the tokens give to
    // something else. The console reaches danger, info and warning by name.
    for (const path of SOURCES) {
      expect(readFileSync(path, "utf8"), where(path)).not.toMatch(/#(?:ff4757|4d8bff|ffb547)\b/iu);
    }
  });
});

describe("the console layout", () => {
  it("has retired the legacy page classes", () => {
    expect(globals).not.toMatch(/\.admin-page-(?:content|header)\b/u);
    for (const path of SOURCES) {
      expect(readFileSync(path, "utf8"), where(path)).not.toMatch(/admin-page-(?:content|header)/u);
    }
  });

  it("finds the pages at all", () => {
    expect(PAGES.length).toBeGreaterThan(30);
  });

  // The page owns its width and its header, the client form under it neither:
  // that is how the edit pages ended up at 1100 px with a prompt for a title.
  it.each(PAGES.map((path) => [where(path), path]))(
    "%s sits in .a-page under a PageHeader",
    (_name, path) => {
      const source = readFileSync(path, "utf8");
      expect(source).toContain('<main className="a-page">');
      expect(source).toContain("<PageHeader");
    },
  );

  it("left the terminal prompts behind", () => {
    for (const path of SOURCES) {
      const source = readFileSync(path, "utf8");
      expect(source, where(path)).not.toContain("~/admin");
      expect(source, where(path)).not.toMatch(/\/\/ ADMIN ›|Admin \/ (?:Leçons|Badges|Parcours)/u);
      expect(source, where(path)).not.toContain("adm-caret");
    }
  });
});

describe("PageHeader", () => {
  function render(props: React.ComponentProps<typeof PageHeader>): string {
    return renderToStaticMarkup(React.createElement(PageHeader, props));
  }

  it("names the trail as a breadcrumb, parents as links and the section as text", () => {
    const html = render({
      crumbs: [{ label: "Contenu" }, { label: "Parcours", href: "/paths" }],
      title: "Quiz final",
    });
    expect(html).toContain('<nav class="a-eyebrow" aria-label="Fil d&#x27;Ariane">');
    expect(html).toContain("<li>Contenu</li>");
    expect(html).toContain('<li><a href="/paths">Parcours</a></li>');
    expect(html).toContain('<h1 class="a-h1">Quiz final</h1>');
  });

  it("does not repeat the page itself in the trail", () => {
    const html = render({ crumbs: [{ label: "Gamification" }], title: "Badges" });
    expect(html.match(/<li>/gu)).toHaveLength(1);
    expect(html).not.toContain("<li>Badges</li>");
  });

  it("shows the description and the actions only when given", () => {
    const bare = render({ crumbs: [{ label: "Système" }], title: "Audit" });
    expect(bare).not.toContain("a-sub");
    expect(bare).not.toContain("a-head-actions");

    const full = render({
      crumbs: [{ label: "Système" }],
      title: "Audit",
      description: "Les gestes tracés.",
      actions: React.createElement("a", { href: "/settings" }, "Paramètres"),
    });
    expect(full).toContain('<p class="a-sub">Les gestes tracés.</p>');
    expect(full).toContain('<div class="a-head-actions"><a href="/settings">Paramètres</a></div>');
  });
});
