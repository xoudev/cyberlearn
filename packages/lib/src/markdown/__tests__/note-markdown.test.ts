import { describe, expect, it } from "vitest";
import { noteInlineText, parseNoteInline, parseNoteMarkdown } from "../note-markdown";

const text = (t: string) => ({ kind: "text", text: t }) as const;

describe("parseNoteInline", () => {
  it("keeps plain text as one run", () => {
    expect(parseNoteInline("Bonjour tout le monde")).toEqual([text("Bonjour tout le monde")]);
  });

  it("reads bold, italic and code, the longer delimiter first", () => {
    expect(parseNoteInline("**a** *b* __c__ _d_ `e`")).toEqual([
      { kind: "strong", children: [text("a")] },
      text(" "),
      { kind: "em", children: [text("b")] },
      text(" "),
      { kind: "strong", children: [text("c")] },
      text(" "),
      { kind: "em", children: [text("d")] },
      text(" "),
      { kind: "code", text: "e" },
    ]);
  });

  it("does not read markup inside inline code", () => {
    expect(parseNoteInline("`**pas du gras**`")).toEqual([
      { kind: "code", text: "**pas du gras**" },
    ]);
  });

  it("keeps a link with a safe scheme, with markup in its label", () => {
    expect(parseNoteInline("[**nmap**](https://nmap.org)")).toEqual([
      {
        kind: "link",
        href: "https://nmap.org",
        children: [{ kind: "strong", children: [text("nmap")] }],
      },
    ]);
    expect(parseNoteInline("[écrire](mailto:a@b.fr)")[0]).toMatchObject({ kind: "link" });
  });

  it("leaves a link with any other scheme as the text it was", () => {
    expect(parseNoteInline("[x](javascript:alert(1))")).toEqual([text("[x](javascript:alert(1))")]);
    expect(parseNoteInline("[x](data:text/html,hi)")).toEqual([text("[x](data:text/html,hi)")]);
  });

  it("leaves unclosed delimiters as text", () => {
    expect(parseNoteInline("un ` seul et **pas fermé")).toEqual([text("un ` seul et **pas fermé")]);
  });

  it("stays linear on a long run of unmatched brackets", () => {
    const start = Date.now();
    parseNoteInline("[".repeat(20_000));
    expect(Date.now() - start).toBeLessThan(2_000);
  });
});

describe("parseNoteMarkdown", () => {
  it("splits paragraphs on blank lines and keeps soft breaks inside one", () => {
    expect(parseNoteMarkdown("un\r\ndeux\n\ntrois")).toEqual([
      { kind: "paragraph", lines: [[text("un")], [text("deux")]] },
      { kind: "paragraph", lines: [[text("trois")]] },
    ]);
  });

  it("keeps a fenced block verbatim, and closes one left open at the end", () => {
    expect(parseNoteMarkdown("```bash\nnmap <cible>\n  **x**\n```")).toEqual([
      { kind: "code", text: "nmap <cible>\n  **x**" },
    ]);
    expect(parseNoteMarkdown("```\nsans fin")).toEqual([{ kind: "code", text: "sans fin" }]);
  });

  it("reads headings up to six levels, and a seventh # as text", () => {
    expect(parseNoteMarkdown("# Un\n###### Six\n####### sept")).toEqual([
      { kind: "heading", level: 1, children: [text("Un")] },
      { kind: "heading", level: 6, children: [text("Six")] },
      { kind: "paragraph", lines: [[text("####### sept")]] },
    ]);
  });

  it("reads rules, quotes and both kinds of list", () => {
    expect(parseNoteMarkdown("---\n> a\n>b\n- c\n* d\n1. e\n10. f")).toEqual([
      { kind: "hr" },
      { kind: "quote", lines: [[text("a")], [text("b")]] },
      { kind: "list", ordered: false, items: [[text("c")], [text("d")]] },
      { kind: "list", ordered: true, items: [[text("e")], [text("f")]] },
    ]);
  });

  it("ends a paragraph at the first block starter", () => {
    expect(parseNoteMarkdown("intro\n- item").map((b) => b.kind)).toEqual(["paragraph", "list"]);
  });

  it("returns nothing for an empty or blank text", () => {
    expect(parseNoteMarkdown("")).toEqual([]);
    expect(parseNoteMarkdown("\n  \n")).toEqual([]);
  });
});

describe("noteInlineText", () => {
  it("keeps the words and drops the markup", () => {
    expect(noteInlineText(parseNoteInline("**Voir** [le *site*](https://a.fr) et `ls`"))).toBe(
      "Voir le site et ls",
    );
  });
});
