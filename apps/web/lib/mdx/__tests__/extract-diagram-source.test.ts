/**
 * The trees below are what MDX actually hands <Diagram> for the corresponding
 * markdown - verified by compiling each snippet through the lesson page's own
 * remark/rehype chain. The old extractor joined every array of children with
 * "\n", which is why each of these used to come back with line breaks in the
 * middle of a mermaid statement.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { extractDiagramSource } from "@/lib/mdx/extract-diagram-source";

const p = (...children: React.ReactNode[]): React.ReactElement =>
  React.createElement("p", null, ...children);

describe("extractDiagramSource", () => {
  it("returns a single paragraph verbatim", () => {
    const source = "flowchart LR\n  A[Client] --> B[Serveur]";
    expect(extractDiagramSource(p(source)).trim()).toBe(source);
  });

  it("keeps an emphasised label on one line", () => {
    // `A[Le *vrai* serveur] --> B` -> text, <em>, text inside one paragraph.
    const tree = p(
      "flowchart LR\nA[Le ",
      React.createElement("em", { key: "e" }, "vrai"),
      " serveur] --> B[Cible]",
    );
    expect(extractDiagramSource(tree).trim()).toBe("flowchart LR\nA[Le vrai serveur] --> B[Cible]");
  });

  it("keeps a link-shaped label on one line", () => {
    // `A[Doc](ref) --> B[Suite]` -> markdown reads [Doc](ref) as a link.
    const tree = p(
      "flowchart LR\nA",
      React.createElement("a", { key: "a", href: "ref" }, "Doc"),
      " --> B[Suite]",
    );
    expect(extractDiagramSource(tree).trim()).toBe("flowchart LR\nA" + "Doc" + " --> B[Suite]");
  });

  it("restores <br/> instead of breaking the label in two", () => {
    // A line break inside a mermaid label is written <br/> and must stay that
    // way; turning it into a real newline splits the statement.
    const tree = p(
      "flowchart LR\nA[Ligne 1",
      React.createElement("br", { key: "b" }),
      "Ligne 2] --> B[Cible]",
    );
    expect(extractDiagramSource(tree).trim()).toBe(
      "flowchart LR\nA[Ligne 1<br/>Ligne 2] --> B[Cible]",
    );
  });

  it("separates block siblings with a newline", () => {
    // A blank line in the source makes MDX emit two paragraphs.
    const tree = [p("flowchart TD\nA --> B"), p("C --> D")];
    expect(extractDiagramSource(tree).trim()).toBe("flowchart TD\nA --> B\nC --> D");
  });

  it("ignores the empties React puts in a tree", () => {
    expect(extractDiagramSource([null, undefined, false, "graph LR", 42])).toBe("graph LR42");
  });

  it("returns an empty string for an empty tree", () => {
    expect(extractDiagramSource(null)).toBe("");
    expect(extractDiagramSource([])).toBe("");
  });
});
