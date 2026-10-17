import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as adminUi from "../admin-ui";
import { PageHeader, toneColor, type Tone } from "../admin-ui";
import { CONTENT_STATUS_OPTIONS } from "../content-status";

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
const AUTH = join(APP, "(auth)");
const COMPONENTS = join(ADMIN, "_components");

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

/** A colour written out instead of named: a hex value, rgb() or rgba(). */
const RAW_COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(/iu;

/** The red, blue and amber that had drifted from the tokens, as hex or rgb(). */
const DRIFTED =
  /#(?:ff4757|4d8bff|ffb547)\b|rgba?\(\s*(?:255,\s*71,\s*87|77,\s*139,\s*255|255,\s*181,\s*71)\b/iu;

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
      expect(value, name).not.toMatch(RAW_COLOUR);
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
      expect(readFileSync(path, "utf8"), where(path)).not.toMatch(DRIFTED);
    }
  });

  it("knows a drifted colour as a tint too", () => {
    // Most of the copies were rgba() tints rather than hex.
    expect("rgba(255,71,87,0.3)").toMatch(DRIFTED);
    expect("rgba(77, 139, 255, 0.08)").toMatch(DRIFTED);
    expect("rgba(255, 181, 71, 0.12)").toMatch(DRIFTED);
    expect("color-mix(in srgb, var(--a-danger) 30%, transparent)").not.toMatch(DRIFTED);
  });

  it("knows a written-out colour in any of its forms", () => {
    expect("#ff8aa0").toMatch(RAW_COLOUR);
    expect("#FFF").toMatch(RAW_COLOUR);
    expect("rgba(0, 36, 255, 0.22)").toMatch(RAW_COLOUR);
    expect("rgb(10 255 212)").toMatch(RAW_COLOUR);
    expect("color-mix(in srgb, var(--a-blue) 22%, transparent)").not.toMatch(RAW_COLOUR);
  });

  it("colours a badge's rarity from the site's rarity ramp", () => {
    const palette = consolePalette();
    for (const rarity of ["common", "rare", "epic", "legendary"]) {
      expect(palette.get(`--a-rarity-${rarity}`)).toBe(`var(--color-rarity-${rarity})`);
    }
    const badges = readFileSync(join(ADMIN, "badges", "page.tsx"), "utf8");
    expect(badges).toContain('RARE: { color: "var(--a-rarity-rare)"');
    expect(badges).not.toMatch(/tone: "info", label: "Rare"/u);
  });

  it("resolves the tokens against the dark theme on every root element", () => {
    // globals.css reads var(--a-bg) and var(--a-fg) on html and body, and
    // those are the dark values only under the "dark" class.
    const roots = SOURCES.filter((path) => readFileSync(path, "utf8").includes("<html"));
    expect(roots.map(where).sort()).toEqual(["global-error.tsx", "layout.tsx"]);
    for (const path of roots) {
      expect(readFileSync(path, "utf8"), where(path)).toMatch(/<html[^>]*className=[^>]*\bdark\b/u);
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

describe("the console chrome", () => {
  // The sidebar, the top bar and the pieces every page shares. The sidebar
  // kept its own BORDER, MUTED and TURQUOISE in hex after the UI constant went.
  const shared = filesUnder(COMPONENTS, (path) => path.endsWith(".tsx"));

  it("finds the shared components, the sidebar and the top bar among them", () => {
    expect(shared.map(where)).toEqual(
      expect.arrayContaining([
        "(admin)/_components/admin-sidebar.tsx",
        "(admin)/_components/admin-topbar.tsx",
        "(admin)/_components/admin-shell-client.tsx",
      ]),
    );
  });

  it.each(shared.map((path) => [where(path), path]))(
    "%s names its colours from the palette",
    (_name, path) => {
      expect(readFileSync(path, "utf8")).not.toMatch(RAW_COLOUR);
    },
  );

  it("reaches the raised surface and the faint rule through the tokens", () => {
    const palette = consolePalette();
    expect(palette.get("--a-overlay")).toBe("var(--color-bg-overlay)");
    expect(palette.get("--a-faint-2")).toBe("var(--color-text-faint)");
  });
});

describe("the sign-in screens", () => {
  const screens = filesUnder(AUTH, (path) => path.endsWith(".tsx"));

  it("finds the screens", () => {
    expect(screens.length).toBeGreaterThan(5);
  });

  it.each(screens.map((path) => [where(path), path]))(
    "%s takes its colours and its type from the stylesheet",
    (_name, path) => {
      const source = readFileSync(path, "utf8");
      expect(source).not.toMatch(RAW_COLOUR);
      // The logo is sized for next/image; anything else wears a class.
      expect(source.replace(/<Image\b[\s\S]*?\/>/gu, "")).not.toContain("style=");
    },
  );

  it("are styled from the palette, the QR code's white ground aside", () => {
    const start = css.indexOf("/* ─── Auth screens");
    const end = css.indexOf("/* ─── Stacks");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // A scanner wants dark modules on a light ground, whatever the theme.
    const section = css.slice(start, end).replace(/\.a-qr-canvas \{[^}]*\}/u, "");
    expect(section).not.toMatch(RAW_COLOUR);
  });
});

describe("the content status", () => {
  it("gives the edit forms' status field the labels and colours of the list badge", () => {
    expect(CONTENT_STATUS_OPTIONS).toEqual([
      { value: "DRAFT", label: "Brouillon", tone: "var(--a-muted)" },
      { value: "PUBLISHED", label: "Publié", tone: "var(--a-accent)" },
      { value: "ARCHIVED", label: "Archivé", tone: "var(--a-danger)" },
    ]);
    for (const form of [
      join(ADMIN, "lessons", "[id]", "edit", "_components", "edit-lesson-client.tsx"),
      join(ADMIN, "paths", "[id]", "edit", "_components", "EditPathClient.tsx"),
    ]) {
      expect(readFileSync(form, "utf8"), where(form)).toContain("options={CONTENT_STATUS_OPTIONS}");
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

  it("is no navigation landmark when nothing in the trail is a link", () => {
    // A top-level page: the trail is its section's name and goes nowhere.
    const html = render({ crumbs: [{ label: "Système" }], title: "Audit" });
    expect(html).not.toContain("<nav");
    expect(html).not.toContain("Fil d&#x27;Ariane");
    expect(html).toContain(
      '<div class="a-eyebrow"><ol class="a-crumbs"><li>Système</li></ol></div>',
    );
  });

  it("mutes the steps you cannot click, so the links read as the live ones", () => {
    expect(css).toMatch(/\.a-crumbs li \{[^}]*color: var\(--a-muted\);/u);
    expect(css).toMatch(/\.a-crumbs a \{[^}]*color: var\(--a-fg-2\);/u);
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
