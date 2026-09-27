/**
 * Every console page checks its caller itself.
 *
 * The (admin) layout checks too, but a layout is not a gate: a client
 * navigation renders only the segments the request says are missing, so a
 * crafted request had /users render - and run its user query - without the
 * layout ever running. This reads the pages rather than rendering them: what
 * is asserted is that the check is there, in the page, as its first await.
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

describe("console pages", () => {
  const found = pages(ADMIN_ROUTES);

  it("are found at all", () => {
    expect(found.length).toBeGreaterThan(20);
  });

  it.each(found.map((f) => [relative(ADMIN_ROUTES, f).split(sep).join("/"), f]))(
    "%s checks the caller first",
    (_name, file) => {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/^["']use client["']/);
      expect(source).toContain('import { requireAdminPage } from "@/lib/auth";');
      // First statement of the page: before any query, before params.
      expect(source).toMatch(
        /export default async function[\s\S]*?\{\r?\n\s*await requireAdminPage\(\);/,
      );
    },
  );
});
