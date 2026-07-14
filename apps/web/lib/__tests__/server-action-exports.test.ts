import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceDirectories = [
  fileURLToPath(new URL("../../app/", import.meta.url)),
  fileURLToPath(new URL("../../lib/", import.meta.url)),
];

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe('module-level "use server" exports', () => {
  it("exports async functions only", () => {
    const violations = sourceDirectories.flatMap(collectSourceFiles).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      if (!/^\s*["']use server["'];/m.test(source)) return [];

      const hasRuntimeValueExport = [
        /^export\s+(?:const|let|var|class|enum)\b/m,
        /^export\s+(?!async\b)function\b/m,
        /^export\s+default\s+(?!async\b)/m,
        /^export\s+(?:\{|\*)/m,
      ].some((pattern) => pattern.test(source));

      return hasRuntimeValueExport ? [path.replaceAll("\\", "/")] : [];
    });

    expect(violations).toEqual([]);
  });
});
