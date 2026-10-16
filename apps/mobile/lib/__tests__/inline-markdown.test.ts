import { describe, expect, it } from "vitest";
import { inlineTokens, isLessonLinkHref, markdownLink } from "../inline-markdown";

/**
 * The inline Markdown of a lesson's text, as the reader draws it: a link the
 * authoring guide documents, `[Texte](https://…)`, used to be shown as its
 * raw syntax in the middle of a paragraph.
 */

describe("inlineTokens", () => {
  it("cuts bold, code and italics as before", () => {
    expect(inlineTokens("Un **mot**, du `code` et un *accent*.")).toEqual([
      { kind: "text", text: "Un " },
      { kind: "bold", text: "mot" },
      { kind: "text", text: ", du " },
      { kind: "code", text: "code" },
      { kind: "text", text: " et un " },
      { kind: "italic", text: "accent" },
      { kind: "text", text: "." },
    ]);
  });

  it("reads a Markdown link as a link, with its text and its address", () => {
    expect(inlineTokens("Lis [le guide](https://example.com/guide) avant.")).toEqual([
      { kind: "text", text: "Lis " },
      { kind: "link", text: "le guide", href: "https://example.com/guide" },
      { kind: "text", text: " avant." },
    ]);
  });

  it("keeps an address that holds parentheses whole", () => {
    expect(inlineTokens("[Article](https://fr.wikipedia.org/wiki/Ping_(logiciel)).")).toEqual([
      { kind: "link", text: "Article", href: "https://fr.wikipedia.org/wiki/Ping_(logiciel)" },
      { kind: "text", text: "." },
    ]);
  });

  it("leaves link syntax that is not an http(s) address as text", () => {
    expect(inlineTokens("md0 : sdb1[1](F) en panne")).toEqual([
      { kind: "text", text: "md0 : sdb1[1](F) en panne" },
    ]);
    expect(inlineTokens("[clic](javascript:alert(1))")).toEqual([
      { kind: "text", text: "[clic](javascript:alert(1))" },
    ]);
  });

  it("does not take a link inside inline code for a link", () => {
    expect(inlineTokens("`[x](https://a.fr)`")).toEqual([
      { kind: "code", text: "[x](https://a.fr)" },
    ]);
  });
});

describe("isLessonLinkHref", () => {
  it("accepts http(s) only, as the site's ExternalLink does", () => {
    expect(isLessonLinkHref("https://nmap.org/book/man.html")).toBe(true);
    expect(isLessonLinkHref("http://example.com")).toBe(true);
    expect(isLessonLinkHref("javascript:alert(1)")).toBe(false);
    expect(isLessonLinkHref("mailto:a@b.fr")).toBe(false);
    expect(isLessonLinkHref("https://a b.fr")).toBe(false);
    expect(isLessonLinkHref("")).toBe(false);
  });
});

describe("markdownLink", () => {
  it("writes a link the tokenizer reads back whole", () => {
    const written = markdownLink("Ping [logiciel]", "https://fr.wikipedia.org/wiki/Ping_(x)y");
    expect(written).toBe("[Ping logiciel](https://fr.wikipedia.org/wiki/Ping_%28x%29y)");
    expect(inlineTokens(written)).toEqual([
      { kind: "link", text: "Ping logiciel", href: "https://fr.wikipedia.org/wiki/Ping_%28x%29y" },
    ]);
  });

  it("shows the address when the link has no text", () => {
    expect(markdownLink("  ", "https://owasp.org")).toBe("[https://owasp.org](https://owasp.org)");
  });
});
