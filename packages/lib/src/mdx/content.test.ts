import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkLessonMdx } from "./check.js";

/**
 * Every lesson in the repository renders.
 *
 * The same check the editors run before saving, over every file in content/.
 * It is what makes that check safe to have added: had any lesson already
 * failed it, that lesson would have become impossible to edit. None does -
 * and from here on, a commit that breaks one fails this instead of breaking a
 * page for the students who open it.
 */

const ROOT = path.resolve(__dirname, "../../../../content");

function lessonsIn(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return lessonsIn(full);
    return full.endsWith(".mdx") ? [full] : [];
  });
}

const FILES = lessonsIn(ROOT);

describe("the lessons in content/", () => {
  it("are there to check", () => {
    // Guards the test itself: a moved directory would otherwise make every
    // assertion below vacuous and the suite pass on nothing.
    expect(FILES.length).toBeGreaterThan(100);
  });

  it.each(FILES.map((f) => [path.relative(ROOT, f), f]))("%s renders", async (_name, file) => {
    const body = readFileSync(file, "utf8").replace(/^---[\s\S]*?---\n/, "");
    const result = await checkLessonMdx(body);
    expect(result).toEqual({ ok: true });
  });
});
