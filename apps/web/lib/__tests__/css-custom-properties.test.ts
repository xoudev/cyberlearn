import { type Dirent, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A custom property defined from itself (`--font-mono: var(--font-mono, …)`)
 * is a cycle, and CSS resolves a cycle to nothing, fallback included. Three
 * path pages did this to re-state the layout's mono font: every mono label on
 * the catalogue, a path's page and its exam rendered in the sans font.
 */

const WEB = path.resolve(__dirname, "../..");
const ROOTS = [path.join(WEB, "app"), path.join(WEB, "components")];

function cssFiles(dir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : cssFiles(full);
    return e.name.endsWith(".css") ? [full] : [];
  });
}

const SELF_REFERENCE = /(--[\w-]+)\s*:\s*var\(\s*\1\s*[,)]/g;

/**
 * Tailwind's `@theme inline` blocks are left out. There `--color-x: var(--color-x)`
 * names a utility after a token: Tailwind emits it in its theme layer, and
 * the unlayered token (@cyberlearn/ui/tokens.css) wins, so it resolves.
 */
function withoutThemeBlocks(css: string): string {
  return css.replace(/@theme[^{]*\{[^}]*\}/g, "");
}

describe("CSS custom properties", () => {
  const files = ROOTS.flatMap(cssFiles);

  it("finds the stylesheets", () => {
    expect(files.some((f) => f.endsWith("paths-catalog-v2.css"))).toBe(true);
  });

  it("never defines a property from itself", () => {
    const found = files.flatMap((file) =>
      [...withoutThemeBlocks(readFileSync(file, "utf8")).matchAll(SELF_REFERENCE)].map(
        (m) => `${path.relative(WEB, file)}: ${m[0]}`,
      ),
    );
    expect(found).toEqual([]);
  });

  it("leaves Tailwind's theme blocks out, and only them", () => {
    const css = "@theme inline { --color-a: var(--color-a); }\n.x { --b: var(--b); }";
    expect([...withoutThemeBlocks(css).matchAll(SELF_REFERENCE)].map((m) => m[1])).toEqual(["--b"]);
  });

  it("recognises the pattern it guards against", () => {
    const sample = '.x { --font-mono: var(--font-mono, "JetBrains Mono"); --a: var(--b); }';
    expect([...sample.matchAll(SELF_REFERENCE)].map((m) => m[1])).toEqual(["--font-mono"]);
  });
});
