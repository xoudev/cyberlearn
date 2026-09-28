import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkLessonMdx } from "./check.js";
import { extractLessonQuizzes } from "./quizzes.js";

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

  it("each declare a refCode and a slug no other file declares", () => {
    // The database refuses a second lesson with a taken slug or refCode, and
    // the import says so only once the file reaches it. CL-LSN-02026 took
    // the slug of the older linux/05-permissions and was refused in production.
    const patterns = { refCode: /^refCode:\s*(\S+)\s*$/m, slug: /^slug:\s*(\S+)\s*$/m };
    for (const [key, pattern] of Object.entries(patterns)) {
      const owners = new Map<string, string[]>();
      for (const file of FILES) {
        const value = pattern.exec(readFileSync(file, "utf8"))?.[1];
        if (value === undefined) continue;
        owners.set(value, [...(owners.get(value) ?? []), path.relative(ROOT, file)]);
      }
      const duplicates = [...owners].filter(([, files]) => files.length > 1);
      expect(duplicates, key).toEqual([]);
    }
  });

  it("have every quiz scorable: the server reads as many as the lesson shows", () => {
    // The answer key is read off the syntax tree. A quiz the reader missed
    // would be one the page shows and the server refuses to score.
    let total = 0;
    for (const file of FILES) {
      const mdx = readFileSync(file, "utf8");
      const written = (mdx.match(/<Quiz\s/g) ?? []).length;
      const read = extractLessonQuizzes(mdx);
      expect(read.length, path.relative(ROOT, file)).toBe(written);
      total += read.length;
    }
    expect(total).toBeGreaterThan(500);
    // Parses every lesson: a few seconds alone, more beside the other suites.
  }, 30_000);
});
