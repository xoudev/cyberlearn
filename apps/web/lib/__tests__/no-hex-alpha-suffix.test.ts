import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A colour made transparent by appending two hex digits (`${color}33`) only
 * works while the colour is a hex literal. Once it reads a token
 * (`var(--color-info)`), the result is not CSS and the browser drops the
 * whole declaration: callouts lost their border that way. `color-mix(in
 * srgb, ${color} 20%, transparent)` works for both.
 */

const REPO = path.resolve(__dirname, "../../../..");
const ROOTS = ["apps/web", "apps/admin", "packages/ui/src", "packages/lib/src"];
const SKIP = new Set(["node_modules", ".next", "__tests__", "dist", "public"]);
const SUFFIX = /\$\{[^}`]+\}[0-9A-Fa-f]{2}(?=["`;, )]|$)/mu;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(tsx?|mts)$/u.test(name) ? [full] : [];
  });
}

describe("transparent colours", () => {
  it("are written with color-mix, never with a hex suffix", () => {
    const offenders = ROOTS.flatMap((root) => sources(path.join(REPO, root)))
      .filter((file) => SUFFIX.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(REPO, file));
    expect(offenders).toEqual([]);
  });
});
