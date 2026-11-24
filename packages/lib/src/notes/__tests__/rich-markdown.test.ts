import { describe, expect, it } from "vitest";
import {
  countNoteWords,
  extractFlashcards,
  extractWikiLinks,
  headingSlug,
  noteOutline,
  richExcerpt,
  parseRichInline,
  parseRichMarkdown,
  richInlineText,
  toggleTask,
  type RichBlock,
} from "../rich-markdown";

/**
 * The notes workspace's markdown: what the editor's preview, the reader and
 * the PDF draw. Every node is text; a link only ever carries a safe scheme.
 */

const kinds = (md: string): string[] => parseRichMarkdown(md).map((b) => b.kind);

describe("parseRichInline", () => {
  it("reads the forum's inline set", () => {
    expect(parseRichInline("**gras** *it* `code` [lien](https://x.fr)")).toEqual([
      { kind: "strong", children: [{ kind: "text", text: "gras" }] },
      { kind: "text", text: " " },
      { kind: "em", children: [{ kind: "text", text: "it" }] },
      { kind: "text", text: " " },
      { kind: "code", text: "code" },
      { kind: "text", text: " " },
      { kind: "link", href: "https://x.fr", children: [{ kind: "text", text: "lien" }] },
    ]);
  });

  it("colours text, and highlights it, from the palette only", () => {
    expect(parseRichInline("[alerte]{rouge}")).toEqual([
      {
        kind: "mark",
        color: "rouge",
        background: false,
        children: [{ kind: "text", text: "alerte" }],
      },
    ]);
    expect(parseRichInline("[clé]{fond-vert}")).toEqual([
      { kind: "mark", color: "vert", background: true, children: [{ kind: "text", text: "clé" }] },
    ]);
    expect(parseRichInline("==important==")).toEqual([
      {
        kind: "mark",
        color: "jaune",
        background: true,
        children: [{ kind: "text", text: "important" }],
      },
    ]);
    // Not a colour of the palette: left as typed.
    expect(richInlineText(parseRichInline("[x]{fuchsia}"))).toBe("[x]{fuchsia}");
  });

  it("strikes through", () => {
    expect(parseRichInline("~~faux~~")[0]).toEqual({
      kind: "strike",
      children: [{ kind: "text", text: "faux" }],
    });
  });

  it("links notes with [[ ]], with or without a label", () => {
    expect(parseRichInline("voir [[Modèle OSI]] et [[TCP|le handshake]]")).toEqual([
      { kind: "text", text: "voir " },
      { kind: "wikilink", target: "Modèle OSI", label: "Modèle OSI" },
      { kind: "text", text: " et " },
      { kind: "wikilink", target: "TCP", label: "le handshake" },
    ]);
  });

  it("never makes a link of an unsafe scheme", () => {
    const nodes = parseRichInline("[clic](javascript:alert(1)) [x](data:text/html,1)");
    expect(nodes.some((n) => n.kind === "link")).toBe(false);
  });

  it("leaves snake_case alone", () => {
    expect(parseRichInline("une_variable_python")).toEqual([
      { kind: "text", text: "une_variable_python" },
    ]);
  });

  it("takes a backslash as an escape", () => {
    expect(parseRichInline("\\*pas italique\\*")).toEqual([
      { kind: "text", text: "*pas italique*" },
    ]);
  });

  it("stays fast on a long line of unmatched delimiters", () => {
    const line = "*[`=~_".repeat(3_500);
    const start = performance.now();
    parseRichInline(line);
    expect(performance.now() - start).toBeLessThan(1_500);
  });
});

describe("parseRichMarkdown", () => {
  it("keeps a fenced block's language and text, markup untouched", () => {
    const [block] = parseRichMarkdown("```bash\nnmap -sV **x**\n```");
    expect(block).toEqual({ kind: "code", lang: "bash", text: "nmap -sV **x**" });
  });

  it("reads tilde fences too", () => {
    expect(parseRichMarkdown("~~~\na\n~~~")[0]).toEqual({ kind: "code", lang: "", text: "a" });
  });

  it("gives headings an anchor", () => {
    const [h] = parseRichMarkdown("## Le modèle OSI");
    expect(h).toMatchObject({ kind: "heading", level: 2, slug: "le-modele-osi" });
  });

  it("nests lists by indentation and reads task boxes", () => {
    const [list] = parseRichMarkdown("- [ ] scanner\n  - [x] ports\n- notes");
    expect(list).toMatchObject({
      kind: "list",
      ordered: false,
      items: [
        {
          checked: false,
          line: 0,
          sublist: { kind: "list", items: [{ checked: true, line: 1 }] },
        },
        { checked: null, line: 2 },
      ],
    });
  });

  it("starts an ordered list where its first number says", () => {
    expect(parseRichMarkdown("3. trois\n4. quatre")[0]).toMatchObject({
      kind: "list",
      ordered: true,
      start: 3,
    });
  });

  it("reads tables with their alignment", () => {
    const [table] = parseRichMarkdown("| Port | Service |\n| ---: | :---: |\n| 22 | ssh |");
    expect(table).toMatchObject({ kind: "table", align: ["right", "center"] });
    expect((table as Extract<RichBlock, { kind: "table" }>).rows).toHaveLength(1); // checked kind above
  });

  it("reads callouts, French keys and Obsidian's", () => {
    expect(parseRichMarkdown("> [!astuce] Retenir\n> Toujours chiffrer")[0]).toMatchObject({
      kind: "callout",
      variant: "astuce",
    });
    expect(parseRichMarkdown("> [!warning]\n> x")[0]).toMatchObject({
      kind: "callout",
      variant: "attention",
    });
    expect(parseRichMarkdown("> [!inconnu] x")[0]).toMatchObject({ kind: "quote" });
  });

  it("reads a `question :: réponse` line as a flashcard", () => {
    expect(kinds("Port SSH ? :: 22")).toEqual(["flashcard"]);
    expect(kinds("a::b")).toEqual(["paragraph"]);
  });

  it("splits blocks as written", () => {
    expect(kinds("# T\n\ntexte\nsuite\n\n---\n\n> cité")).toEqual([
      "heading",
      "paragraph",
      "hr",
      "quote",
    ]);
  });
});

describe("flashcards and links", () => {
  it("takes the cards outside code, once per question", () => {
    expect(extractFlashcards("Q1 :: R1\n```\nQ2 :: R2\n```\nq1 :: autre\nQ3 :: R3")).toEqual([
      { front: "Q1", back: "R1" },
      { front: "Q3", back: "R3" },
    ]);
  });

  it("lists the titles a note links to, folded, outside code", () => {
    expect(extractWikiLinks("[[Modèle OSI]] `[[Pas ça]]`\n```\n[[Ni ça]]\n```\n[[tcp|x]]")).toEqual(
      ["modele osi", "tcp"],
    );
  });
});

describe("toggleTask", () => {
  it("ticks and unticks the box on a line, and nothing else", () => {
    const md = "- [ ] a\n- [x] b\ntexte";
    expect(toggleTask(md, 0)).toBe("- [x] a\n- [x] b\ntexte");
    expect(toggleTask(md, 1)).toBe("- [ ] a\n- [ ] b\ntexte");
    expect(toggleTask(md, 2)).toBe(md);
    expect(toggleTask(md, 9)).toBe(md);
  });
});

describe("helpers", () => {
  it("counts words without the markup or the code", () => {
    expect(countNoteWords("## Titre\n**deux mots** [x]{rouge}\n```\nignored code\n```")).toBe(5);
  });

  it("slugs headings for anchors", () => {
    expect(headingSlug("Étape 2 : l'exploitation !")).toBe("etape-2-l-exploitation");
  });

  it("makes a plain excerpt, markup and code left out", () => {
    expect(
      richExcerpt(
        "## Titre\nUn [scan]{vert} ==léger== [[Ports]]\n```\nnmap\n```\n- [ ] TCP\nQ :: R",
      ),
    ).toBe("Titre Un scan léger Ports TCP Q → R");
    expect(richExcerpt("x".repeat(400))).toHaveLength(150);
  });

  it("lists a note's outline", () => {
    expect(noteOutline("# A\ntexte\n## B")).toEqual([
      { level: 1, text: "A", slug: "a" },
      { level: 2, text: "B", slug: "b" },
    ]);
  });
});

describe("linear trims (no regex retried from each character)", () => {
  const headingText = (line: string): string => {
    const block = parseRichMarkdown(line)[0];
    return block?.kind === "heading" ? richInlineText(block.children) : "";
  };

  it("slugs a heading exactly as the old pattern did", () => {
    const old = (text: string): string =>
      text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    for (const text of [
      "  Les ports : TCP/UDP !! ",
      "---",
      "",
      "Été 2026 : bilan",
      "a-b",
      "!!a!!",
    ]) {
      expect(headingSlug(text)).toBe(old(text));
    }
  });

  it("drops closing hashes only after a blank, as the old pattern did", () => {
    expect(headingText("## Titre ##")).toBe("Titre");
    expect(headingText("## Titre ##   ")).toBe("Titre");
    expect(headingText("## C#")).toBe("C#");
    expect(headingText("## ##")).toBe("##");
    expect(headingText("# Un # deux")).toBe("Un # deux");
  });

  it("stays fast on a long line of blanks and dashes", () => {
    const line = `# a${" ".repeat(20_000)}b`;
    const dashes = `a${"-".repeat(20_000)}b`;
    const started = performance.now();
    parseRichMarkdown(line);
    headingSlug(dashes);
    expect(performance.now() - started).toBeLessThan(200);
  });
});
