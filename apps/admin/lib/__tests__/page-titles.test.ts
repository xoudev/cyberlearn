/**
 * Every console tab names its page.
 *
 * The root layout holds the title: a default, "Admin · Cyber Learn", and the
 * "%s · Admin" template each page's own title goes through. The (admin) layout
 * once declared the same pair again, and Next runs a segment's default through
 * its parent's template: a page without a title of its own had a tab reading
 * "Admin · Cyber Learn · Admin". Read from the sources, like page-guard.test.ts.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ADMIN_ROUTES = join(__dirname, "..", "..", "app", "(admin)");

function pages(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pages(full, out);
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

describe("console tab titles", () => {
  it("are left to the root layout by the (admin) layout", () => {
    const source = readFileSync(join(ADMIN_ROUTES, "layout.tsx"), "utf8");
    expect(source).not.toMatch(/export const metadata\b/);
    expect(source).not.toMatch(/function generateMetadata\b/);
  });

  const found = pages(ADMIN_ROUTES);

  it("are found at all", () => {
    expect(found.length).toBeGreaterThan(20);
  });

  it.each(found.map((f) => [relative(ADMIN_ROUTES, f).split(sep).join("/"), f]))(
    "%s names its tab",
    (_name, file) => {
      const source = readFileSync(file, "utf8");
      expect(source).toMatch(/export (?:const metadata\b|(?:async )?function generateMetadata\b)/);
    },
  );
});
