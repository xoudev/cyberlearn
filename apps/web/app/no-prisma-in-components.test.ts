import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Rule 8 of AGENTS.md: no direct Prisma call from a component. A page reads
 * through a repository of @cyberlearn/db, where the query has a name, a
 * comment and one place to change.
 *
 * Twenty-three pages of the site and the console had drifted from it, one
 * `prisma.x.findMany` at a time, because nothing said so when it happened.
 * This walks every .tsx under app/ and components/ and fails on the next one.
 */

const ROOT = join(__dirname, "..");

function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name === "__tests__"
        ? []
        : componentFiles(path);
    }
    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.") ? [path] : [];
  });
}

/** `prisma` named in an import from the data package, on one line or several. */
const PRISMA_IMPORT = /import\s*\{[^}]*\bprisma\b[^}]*\}\s*from\s*"@cyberlearn\/db"/u;

describe("components and Prisma", () => {
  it("finds the components to check", () => {
    expect(componentFiles(join(ROOT, "app")).length).toBeGreaterThan(100);
  });

  it("has no component that imports the Prisma client", () => {
    const offenders = [join(ROOT, "app"), join(ROOT, "components")]
      .flatMap(componentFiles)
      .filter((file) => PRISMA_IMPORT.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, file).replaceAll("\\", "/"));
    expect(offenders).toEqual([]);
  });
});
