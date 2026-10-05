import { describe, expect, it } from "vitest";
import { isImportDeclaration, stripImportDeclarations } from "../components/mdx-source";

describe("isImportDeclaration", () => {
  it("recognises the two shapes of an MDX import", () => {
    expect(isImportDeclaration('import { Chart } from "./chart"')).toBe(true);
    expect(isImportDeclaration("import Chart from './chart';")).toBe(true);
    expect(isImportDeclaration('import "./styles.css"')).toBe(true);
    expect(isImportDeclaration("import\t'side-effect'")).toBe(true);
  });

  it("leaves the imports of other languages, and prose, alone", () => {
    expect(isImportDeclaration("import hashlib")).toBe(false);
    expect(isImportDeclaration("import os, sys")).toBe(false);
    expect(isImportDeclaration("import java.util.List;")).toBe(false);
    expect(isImportDeclaration("importer un fichier")).toBe(false);
    expect(isImportDeclaration("  import x from 'y'")).toBe(false);
    expect(isImportDeclaration('import x from "unterminated')).toBe(false);
  });

  it("answers a long line of tabs at once", () => {
    const start = performance.now();
    expect(isImportDeclaration(`import${"\t".repeat(100_000)}`)).toBe(false);
    expect(isImportDeclaration(`import\t\tfrom\t"!"${'\tfrom\t"!"'.repeat(20_000)}`)).toBe(false);
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe("stripImportDeclarations", () => {
  it("drops the declarations and keeps every other line", () => {
    const mdx = 'import { X } from "x"\n\n# Titre\n\n```python\nimport hashlib\n```\n';
    expect(stripImportDeclarations(mdx)).toBe("\n# Titre\n\n```python\nimport hashlib\n```\n");
  });
});
