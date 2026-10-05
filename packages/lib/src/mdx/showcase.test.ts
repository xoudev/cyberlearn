import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LESSON_COMPONENT_NAMES } from "./check.js";

/**
 * The showcase lesson renders every component the pipeline knows, once, so an
 * administrator can see them as the site draws them. A component added to
 * LESSON_COMPONENT_NAMES without an example there would be the one nobody
 * looked at; this fails until the example exists. The lesson's validity
 * itself is content.test.ts's business, like every other file in content/.
 */

/** Whether `<Name` opens a tag in the source: followed by a space, a newline, "/" or ">". */
function usesComponent(source: string, name: string): boolean {
  const tag = `<${name}`;
  let from = 0;
  for (;;) {
    const at = source.indexOf(tag, from);
    if (at === -1) return false;
    const next = source.charAt(at + tag.length);
    if (next === " " || next === "\n" || next === "/" || next === ">") return true;
    from = at + tag.length;
  }
}

const SHOWCASE = path.resolve(
  __dirname,
  "../../../../content/lessons/_vitrine/99001-vitrine-des-composants.mdx",
);

describe("the showcase lesson", () => {
  const source = readFileSync(SHOWCASE, "utf8");

  it("uses every component a lesson may use", () => {
    const missing = LESSON_COMPONENT_NAMES.filter((name) => !usesComponent(source, name));
    expect(missing).toEqual([]);
  });

  it("stays a draft: no path lists it, so the sync never publishes it", () => {
    // The manifests are what publishCatalogueDrafts reads.
    const manifestsDir = path.resolve(__dirname, "../../../../content/paths");
    const listed = readFileSync(path.join(manifestsDir, "fondamentaux-informatique.json"), "utf8");
    expect(listed).not.toContain("CL-LSN-99001-V01");
    expect(source).toContain("refCode: CL-LSN-99001-V01");
  });
});
