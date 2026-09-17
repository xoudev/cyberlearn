/**
 * The lesson editor is one editor, and stays one.
 *
 * The point of moving it here was that a teacher writing for their class and an
 * administrator writing the catalogue get the same tool. Nothing about the type
 * system holds that: someone adding a component to the MDX pipeline can add its
 * guide entry to a copy under apps/, and the other writer quietly ends up with
 * the lesser half of the product. That is the drift this file catches.
 *
 * It reads the repository rather than importing anything: the panel pulls in
 * Monaco and next/dynamic, neither of which belongs in a unit test, and what is
 * being asserted is about where the code lives, not what it renders.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The repository root, found by walking up to the workspace manifest.
 *
 * Not import.meta: this package compiles to CommonJS and the compiler refuses
 * it. Not a fixed number of "..": the working directory is the package when
 * turbo runs this and could be the root when someone runs it by hand, and the
 * two would need different counts.
 */
function repoRoot(): string {
  let dir = process.cwd();
  while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
    const up = dirname(dir);
    if (up === dir) throw new Error("racine du dépôt introuvable");
    dir = up;
  }
  return dir;
}

const REPO = repoRoot();
const PANEL = join(REPO, "packages/ui/src/components/mdx-editor-panel.tsx");

const SKIP = new Set(["node_modules", ".next", ".turbo", "dist", ".git", "coverage"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx") || full.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("the shared lesson editor", () => {
  const appFiles = [join(REPO, "apps/web"), join(REPO, "apps/admin")].flatMap((d) => walk(d));

  it("lives in the design system, not in one app", () => {
    const source = readFileSync(PANEL, "utf8");
    expect(source).toContain("export function MdxEditorPanel");
    // The guide is the part that rots when there are two copies: each entry is
    // a component the lesson pipeline understands.
    expect(source).toContain("GUIDE_SECTIONS");
  });

  it("is reached through the package everywhere it is used", () => {
    const importers = appFiles.filter((f) => readFileSync(f, "utf8").includes("MdxEditorPanel"));

    // Both writers: the admin console and the teacher's class editor.
    expect(importers.length).toBeGreaterThanOrEqual(2);
    expect(importers.some((f) => f.includes("apps/admin"))).toBe(true);
    expect(importers.some((f) => f.includes("apps/web"))).toBe(true);

    for (const file of importers) {
      expect(readFileSync(file, "utf8")).toContain('from "@cyberlearn/ui/mdx-editor"');
    }
  });

  it("has no second copy hiding under either app", () => {
    const copies = appFiles.filter((f) =>
      readFileSync(f, "utf8").includes("export function MdxEditorPanel"),
    );
    expect(copies).toEqual([]);
  });
});
