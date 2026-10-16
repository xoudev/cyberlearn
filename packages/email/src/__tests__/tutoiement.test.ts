import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every mail says "tu", like the site. The deletion confirmation was the last
 * to say "vous", between settings and pages that said "tu": on the path read
 * most carefully, a change of register reads as a change of sender. Subjects
 * and previews live in the template files too, so reading the sources covers
 * them.
 */

const TEMPLATES = path.resolve(__dirname, "../templates");
const FORMAL = /\b(?:vous|votre|vos|veuillez)\b/iu;

describe("the mail templates", () => {
  it("say tu, like the rest of the site", () => {
    const offenders = readdirSync(TEMPLATES)
      .filter((name) => /\.tsx?$/u.test(name))
      .filter((name) => FORMAL.test(readFileSync(path.join(TEMPLATES, name), "utf8")));
    expect(offenders).toEqual([]);
  });
});
