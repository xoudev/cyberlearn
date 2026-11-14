import { describe, expect, it } from "vitest";
import { extractToc } from "../mdx/toc.js";
import { trimHyphens } from "../slug.js";

describe("trimHyphens", () => {
  it("removes the hyphens at both ends and keeps those inside", () => {
    expect(trimHyphens("--reseau-tcp-ip-")).toBe("reseau-tcp-ip");
    expect(trimHyphens("a--b")).toBe("a--b");
  });

  it("leaves a string without them as it is", () => {
    expect(trimHyphens("python")).toBe("python");
    expect(trimHyphens("")).toBe("");
  });

  it("is empty for nothing but hyphens", () => {
    expect(trimHyphens("-")).toBe("");
    expect(trimHyphens("-----")).toBe("");
  });

  it("says the same as the pattern it replaces", () => {
    for (const value of ["-a-", "--", "a", "-a", "a-", "a-b-", "---a---b---", "x--"]) {
      expect(trimHyphens(value), value).toBe(value.replace(/^-+|-+$/g, ""));
    }
  });

  it("stays quick on a long run of hyphens that does not reach the end", () => {
    // The pattern it replaces took a time that grew with the square of this.
    const value = `${"-".repeat(200_000)}a${"-".repeat(200_000)}b`;
    const started = performance.now();
    expect(trimHyphens(value)).toBe(`a${"-".repeat(200_000)}b`);
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe("extractToc", () => {
  it("reads a heading from its own line, hashes, a gap, then the text", () => {
    expect(extractToc("# Réseau\n\nDu texte.\n\n## Le modèle OSI\n### Couche 1")).toEqual([
      { level: 1, text: "Réseau", id: "reseau" },
      { level: 2, text: "Le modèle OSI", id: "le-modele-osi" },
      { level: 3, text: "Couche 1", id: "couche-1" },
    ]);
  });

  it("does not make a heading of hashes and the paragraph under them", () => {
    expect(extractToc("#\n\nUn paragraphe.")).toEqual([]);
  });

  it("takes a tab as the gap, and Windows line ends", () => {
    expect(extractToc("##\tTitre\r\ntexte")).toEqual([{ level: 2, text: "Titre", id: "titre" }]);
  });

  it("stays quick on a long run of blank lines after hashes", () => {
    const started = performance.now();
    expect(extractToc(`#${"\n".repeat(100_000)}`)).toEqual([]);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe("extractToc, a line of hashes and blanks", () => {
  it("is not a heading when nothing follows the gap", () => {
    expect(extractToc("## \t \t\nTexte")).toEqual([]);
  });

  it("stays quick on a long run of tabs after the hashes", () => {
    const started = performance.now();
    expect(extractToc(`#${"\t".repeat(100_000)}\n`)).toEqual([]);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("keeps the spaces inside a heading's text", () => {
    expect(extractToc("##   Le   modèle")).toEqual([
      { level: 2, text: "Le   modèle", id: "le-modele" },
    ]);
  });
});
