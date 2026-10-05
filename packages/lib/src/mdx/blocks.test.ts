import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  attributeSource,
  componentSource,
  headingSource,
  parseLessonBlocks,
  serializeLessonBlocks,
  type ComponentBlock,
  type LessonBlock,
} from "./blocks.js";
import { checkLessonMdx } from "./check.js";

/**
 * Blocks are a view of the MDX, not a copy of it: cutting a lesson and
 * joining it again gives the lesson back, and a block written from its
 * fields reads back as those fields. Both are checked over every lesson in
 * content/, since those are what the editor will open first.
 */

const ROOT = path.resolve(__dirname, "../../../../content");

function lessonsIn(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return lessonsIn(full);
    return full.endsWith(".mdx") ? [full] : [];
  });
}

function body(file: string): string {
  return readFileSync(file, "utf8").replace(/^---[\s\S]*?---\n/, "");
}

/**
 * The lesson's lines, blank ones aside. The editor writes one blank line
 * between blocks; a lesson may have none between two components, or several
 * between paragraphs, and neither changes what the page shows.
 */
function lines(mdx: string): string[] {
  return mdx.split("\n").filter((line) => line.trim() !== "");
}

function parsed(mdx: string): LessonBlock[] {
  const result = parseLessonBlocks(mdx);
  if (!result.ok) throw new Error(result.error);
  return result.blocks;
}

describe("parseLessonBlocks", () => {
  it("cuts headings, stretches of Markdown and components apart", () => {
    const blocks = parsed(
      [
        "Une intro.",
        "",
        "## Section *une*",
        "",
        "Un paragraphe.",
        "",
        "- une liste",
        "- à deux",
        "",
        '<Quiz id="q-1" question="Pourquoi ?" options={["a", "b"]} correct={1} />',
        "",
        "### Sous-titre",
        "",
        '<Callout type="info">',
        "  Un **mot**.",
        "</Callout>",
        "",
        "Fin.",
      ].join("\n"),
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      "text",
      "heading",
      "text",
      "component",
      "heading",
      "component",
      "text",
    ]);
    expect(blocks[1]).toEqual({
      kind: "heading",
      depth: 2,
      text: "Section *une*",
      source: "## Section *une*",
    });
    // Neighbouring Markdown is one block, blank line included.
    expect(blocks[2]).toEqual({ kind: "text", source: "Un paragraphe.\n\n- une liste\n- à deux" });
    expect(blocks[3]).toMatchObject({
      kind: "component",
      name: "Quiz",
      known: true,
      attrs: { id: "q-1", question: "Pourquoi ?", options: ["a", "b"], correct: 1 },
      inner: null,
    });
    expect(blocks[5]).toMatchObject({
      name: "Callout",
      attrs: { type: "info" },
      inner: "Un **mot**.",
      source: '<Callout type="info">\n  Un **mot**.\n</Callout>',
    });
  });

  it("leaves a tag inside a code fence to the text it belongs to", () => {
    const blocks = parsed('```mdx\n<Quiz id="x" />\n```\n');
    expect(blocks).toEqual([{ kind: "text", source: '```mdx\n<Quiz id="x" />\n```' }]);
  });

  it("flags a component the pipeline does not draw", () => {
    const [block] = parsed('<Frobnicator id="x" />\n');
    expect(block).toMatchObject({ kind: "component", name: "Frobnicator", known: false });
  });

  it("leaves out an attribute whose braces compute a value, keeping the source", () => {
    const [block] = parsed('<Quiz id="q" correct={1 + 1} />\n') as [ComponentBlock];
    expect(block.attrs).toEqual({ id: "q" });
    expect(block.source).toBe('<Quiz id="q" correct={1 + 1} />');
  });

  it("reports MDX that does not parse instead of throwing", () => {
    const result = parseLessonBlocks("<Callout>\n\nsans fermeture\n");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });

  it("gives an empty lesson no blocks", () => {
    expect(parsed("")).toEqual([]);
    expect(parsed("\n\n")).toEqual([]);
  });
});

describe("the round trip over every lesson in content/", () => {
  const files = lessonsIn(ROOT);

  it("has lessons to check", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(files.map((f) => [path.relative(ROOT, f), f]))("%s", (_name, file) => {
    const mdx = body(file);
    const blocks = parsed(mdx);
    const again = serializeLessonBlocks(blocks);
    // Nothing lost, nothing added: the same lines, in the same order.
    expect(lines(again)).toEqual(lines(mdx));
    // And cutting it again finds the same blocks.
    expect(parsed(again)).toEqual(blocks);
    // Every component the lesson uses is read with its attributes.
    for (const block of blocks) {
      if (block.kind === "component") expect(block.known, block.name).toBe(true);
    }
  });
});

describe("headingSource", () => {
  it("writes a heading of the given depth", () => {
    expect(headingSource(2, " Section ")).toBe("## Section");
    expect(parsed(headingSource(3, "Sous-titre"))).toEqual([
      { kind: "heading", depth: 3, text: "Sous-titre", source: "### Sous-titre" },
    ]);
  });
});

describe("attributeSource", () => {
  it("writes each kind of value as the guide does", () => {
    expect(attributeSource("id", "q-1")).toBe('id="q-1"');
    expect(attributeSource("correct", 1)).toBe("correct={1}");
    expect(attributeSource("secret", true)).toBe("secret={true}");
    expect(attributeSource("options", ["a", "b"])).toBe('options={["a","b"]}');
    expect(attributeSource("expected", { rows: [[1, "x"]] })).toBe('expected={{"rows":[[1,"x"]]}}');
    expect(attributeSource("hint", undefined)).toBeNull();
    expect(attributeSource("hint", null)).toBeNull();
  });

  it("puts a string with a quote or a newline between backticks", () => {
    expect(attributeSource("code", 'print("hi")')).toBe('code={`print("hi")`}');
    expect(attributeSource("code", "a\nb")).toBe("code={`a\nb`}");
  });
});

describe("componentSource", () => {
  it.each([
    ["one attribute, self-closing", "StepAnimation", { id: "anim", scene: "tcp-handshake" }, null],
    [
      "strings with quotes, newlines, backticks and dollars",
      "FindTheFlaw",
      {
        id: "flaw-1",
        code: 'def f():\n    return "a `b` ${c}" \\ end',
        line: 1,
        options: ["a", "b"],
        correct: 0,
        explanation: "Parce que.",
      },
      null,
    ],
    ["children between the tags", "Callout", { type: "warning" }, "Un point, avec du **gras**."],
    [
      "nested values",
      "LinuxTerminal",
      {
        files: { "notes.txt": "Réunion\n", "a/b.txt": "x" },
        checks: [{ label: "ok", path: "notes.txt", expect: "file", contains: "Réunion" }],
      },
      null,
    ],
    ["a single attribute and children", "ExternalLink", { href: "https://example.com" }, "Lien"],
    [
      "no attribute at all",
      "QuizGroup",
      {},
      '<Quiz id="q-1" question="?" options={["a", "b"]} correct={0} />',
    ],
  ] as [string, string, Record<string, unknown>, string | null][])(
    "reads back as the fields it was written from: %s",
    async (_label, name, attrs, inner) => {
      const source = componentSource(name, attrs, inner);
      expect(await checkLessonMdx(source)).toEqual({ ok: true });
      const [block] = parsed(`${source}\n`) as [ComponentBlock];
      expect(block.name).toBe(name);
      expect(block.attrs).toEqual(attrs);
      expect(block.inner).toBe(inner);
      expect(block.source).toBe(source);
    },
  );

  it("lays several attributes out one per line, as the guide writes them", () => {
    expect(componentSource("Quiz", { id: "q-1", correct: 1 }, null)).toBe(
      '<Quiz\n  id="q-1"\n  correct={1}\n/>',
    );
    expect(componentSource("Callout", { type: "info" }, "Texte.")).toBe(
      '<Callout type="info">\nTexte.\n</Callout>',
    );
  });
});
