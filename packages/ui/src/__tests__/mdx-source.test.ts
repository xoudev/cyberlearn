import { describe, expect, it } from "vitest";
import {
  endOfOpeningTag,
  inlineTokens,
  innerText,
  isImportDeclaration,
  parseStringProps,
  stripImportDeclarations,
} from "../components/mdx-source";

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

describe("inlineTokens", () => {
  it("cuts a line of prose into its emphases, code and links", () => {
    expect(
      inlineTokens("Du **gras**, de l'*italique*, du `code` et un [lien](https://x.y)."),
    ).toEqual([
      { kind: "text", text: "Du " },
      { kind: "strong", text: "gras" },
      { kind: "text", text: ", de l'" },
      { kind: "em", text: "italique" },
      { kind: "text", text: ", du " },
      { kind: "code", text: "code" },
      { kind: "text", text: " et un " },
      { kind: "link", text: "lien", href: "https://x.y" },
      { kind: "text", text: "." },
    ]);
  });

  it("leaves a marker without its closing as text", () => {
    expect(inlineTokens("2 * 3 = 6 et [pas un lien] ni `ouvert")).toEqual([
      { kind: "text", text: "2 * 3 = 6 et [pas un lien] ni `ouvert" },
    ]);
    expect(inlineTokens("**")).toEqual([{ kind: "text", text: "**" }]);
  });

  it("answers a long line of brackets at once", () => {
    const start = performance.now();
    expect(inlineTokens("[".repeat(50_000))).toEqual([{ kind: "text", text: "[".repeat(50_000) }]);
    expect(inlineTokens("[(](".repeat(20_000)).length).toBeGreaterThan(0);
    expect(performance.now() - start).toBeLessThan(300);
  });
});

describe("parseStringProps", () => {
  it("reads every quoted prop of the opening tag, on one line or several", () => {
    expect(
      parseStringProps('<Quiz id="q-1" question="L\'image ?" options={["a"]} correct={1} />'),
    ).toEqual({
      id: "q-1",
      question: "L'image ?",
    });
    expect(
      parseStringProps(
        '<Callout\n  type="info"\n  title=\'Un titre\'\n>\nTexte avec x="y"\n</Callout>',
      ),
    ).toEqual({
      type: "info",
      title: "Un titre",
    });
  });

  it("stops at the end of the tag, braces and quotes included", () => {
    expect(endOfOpeningTag('<A b={">"} c="}" />')).toBe('<A b={">"} c="}" />'.length);
    expect(endOfOpeningTag("<A>\ntexte\n</A>")).toBe(3);
    expect(endOfOpeningTag("<A b=")).toBe(5);
  });

  it("answers a long run of zeros or of closing brackets at once", () => {
    const start = performance.now();
    expect(parseStringProps(`<A ${"0".repeat(100_000)}`)).toEqual({});
    expect(innerText(`<A>${">;".repeat(50_000)}`)).toContain(">;");
    expect(performance.now() - start).toBeLessThan(300);
  });
});

describe("innerText", () => {
  it("is the text between the tags, before any tag inside, and nothing for a self-closing one", () => {
    expect(innerText('<Callout type="info">\n  Un **mot**.\n</Callout>')).toBe("Un **mot**.");
    expect(innerText('<QuizGroup>\n  <Quiz id="q" />\n</QuizGroup>')).toBe("");
    expect(innerText('<Quiz id="q" />')).toBe("");
  });
});
