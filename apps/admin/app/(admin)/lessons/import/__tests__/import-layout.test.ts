import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The import screen's layout, read from the stylesheet. The third column it
 * used to have (the metadata, 340px, beside a 320px list) left the differences
 * 260px at 1280px and a few pixels at 1024px, with the confirm button wider
 * than the pane. The screen is now two columns from 1100px and a stack below
 * it; a media query cannot be rendered here, so the rules are read.
 */

const APP = join(__dirname, "..", "..", "..", "..");
const sheet = readFileSync(join(APP, "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//gu, "");
const client = readFileSync(join(__dirname, "..", "_components", "import-client.tsx"), "utf8");
const loading = readFileSync(join(__dirname, "..", "loading.tsx"), "utf8");

interface Rule {
  /** The media query the rule sits in, null at the top level. */
  media: string | null;
  body: string;
}

const MEDIA = /@media([^{]+)\{((?:[^{}]|\{[^{}]*\})*)\}/gu;
const RULE = /([^{}]+)\{([^{}]*)\}/gu;

/** Every rule of the sheet whose selector list names `selector`, in file order. */
function rulesOf(selector: string): Rule[] {
  const found: { at: number; rule: Rule }[] = [];
  const collect = (text: string, media: string | null, offset: number): void => {
    for (const match of text.matchAll(RULE)) {
      const names = (match[1] ?? "").split(",").map((name) => name.trim());
      if (names.includes(selector)) {
        found.push({
          at: offset + match.index,
          rule: { media, body: match[2] ?? "" },
        });
      }
    }
  };
  for (const match of sheet.matchAll(MEDIA)) {
    collect(match[2] ?? "", (match[1] ?? "").trim(), match.index);
  }
  collect(
    sheet.replace(MEDIA, (whole) => " ".repeat(whole.length)),
    null,
    0,
  );
  return found.sort((a, b) => a.at - b.at).map((entry) => entry.rule);
}

/**
 * The values `property` is given across `rules`, whitespace collapsed. The body
 * is cut on ";" into declarations and each one on its first ":" (a value may
 * hold others, as in a url()); string operations rather than a RegExp built
 * from the property name, which the static analysis refuses.
 */
function declared(rules: Rule[], property: string): string[] {
  return rules.flatMap((rule) =>
    rule.body.split(";").flatMap((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon === -1 || declaration.slice(0, colon).trim() !== property) return [];
      const value = declaration.slice(colon + 1);
      // A declaration with nothing after its colon declares no value.
      return value === "" ? [] : [value.replace(/\s+/gu, " ").trim()];
    }),
  );
}

describe("the import grid", () => {
  const grid = rulesOf(".import-grid");

  it("is a stack by default, with no column of its own", () => {
    const base = grid.filter((rule) => rule.media === null);
    expect(declared(base, "flex-direction")).toEqual(["column"]);
    expect(declared(base, "grid-template-columns")).toEqual([]);
  });

  it("takes its columns from 1100px, the editor on the rest of the width", () => {
    const wide = grid.filter((rule) => rule.media !== null);
    expect(wide.map((rule) => rule.media)).toEqual(["(min-width: 1100px)"]);
    expect(declared(wide, "grid-template-columns")).toEqual(["320px minmax(0, 1fr)"]);
  });

  it("puts the metadata under the files, the editor beside both", () => {
    const areas = grid.flatMap((rule) => rule.body.match(/"[^"]+"/gu) ?? []).join(" ");
    expect(areas).toBe('"files editor" "preview editor"');
  });

  it("keeps the update pane's column from growing past the pane", () => {
    // An implicit `auto` column grows to a nowrap button: the pane then
    // scrolls sideways, with the differences in it.
    expect(declared(rulesOf(".import-update"), "grid-template-columns")).toEqual([
      "minmax(0, 1fr)",
    ]);
  });
});

describe("the panes the grid places", () => {
  const PANES = ["import-files", "import-editor", "import-preview", "import-actions"] as const;

  it.each(PANES)("styles .%s, and the screen wears it", (name) => {
    expect(rulesOf(`.${name}`).length, name).toBeGreaterThan(0);
    expect(client).toContain(`className="${name}"`);
  });

  it("is drawn by its loading state with the same panes", () => {
    for (const name of ["import-files", "import-editor", "import-preview"]) {
      expect(loading).toContain(`className="${name}"`);
    }
  });
});
