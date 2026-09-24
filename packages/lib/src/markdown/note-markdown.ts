/**
 * The small markdown of notes and forum posts, parsed into a tree that any
 * renderer can draw: React elements on the site, native views in the app.
 *
 * Notes and posts are plain GFM-ish markdown (NOT MDX), so the lesson MDX
 * pipeline, which would choke on a bare `<` or `{` in free text, does not
 * apply. The tree only ever holds text: nothing in it is markup, so a renderer
 * that draws text as text cannot be made to run anything.
 *
 * Supported: fenced code blocks, ATX headings, blockquotes, unordered and
 * ordered lists, horizontal rules, paragraphs (with soft line breaks) and the
 * inline set bold / italic / inline code / links (http, https, mailto only).
 */

export type NoteInline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; children: NoteInline[] }
  | { kind: "em"; children: NoteInline[] }
  | { kind: "link"; href: string; children: NoteInline[] };

/** A paragraph's lines, joined by soft line breaks when drawn. */
export type NoteLines = NoteInline[][];

export type NoteBlock =
  | { kind: "code"; text: string }
  | { kind: "hr" }
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: NoteInline[] }
  | { kind: "quote"; lines: NoteLines }
  | { kind: "list"; ordered: boolean; items: NoteInline[][] }
  | { kind: "paragraph"; lines: NoteLines };

const SAFE_LINK = /^(https?:|mailto:)/i;

/** Parse the inline markdown of one line. */
export function parseNoteInline(text: string): NoteInline[] {
  const out: NoteInline[] = [];
  let buf = "";
  let i = 0;
  const flush = (): void => {
    if (buf) {
      out.push({ kind: "text", text: buf });
      buf = "";
    }
  };
  const push = (node: NoteInline): void => {
    flush();
    out.push(node);
  };

  while (i < text.length) {
    const rest = text.slice(i);

    // Inline code: literal, no nested parsing.
    if (rest.startsWith("`")) {
      const end = rest.indexOf("`", 1);
      if (end > 0) {
        push({ kind: "code", text: rest.slice(1, end) });
        i += end + 1;
        continue;
      }
    }

    // Link: [text](url) with a safe scheme, else fall through to plain text.
    // Label/URL lengths are bounded so a long run of unmatched "[" cannot make
    // [^\]] backtrack to end-of-string at every position (O(n^2) on the input).
    if (rest.startsWith("[")) {
      const m = /^\[([^\]\n]{1,300})\]\(([^)\s]{1,2000})\)/.exec(rest);
      if (m && SAFE_LINK.test(m[2] ?? "")) {
        push({ kind: "link", href: m[2] ?? "", children: parseNoteInline(m[1] ?? "") });
        i += m[0].length;
        continue;
      }
    }

    // Bold: ** or __ (checked before italic so the longer delimiter wins).
    const bold = /^(\*\*|__)([\s\S]+?)\1/.exec(rest);
    if (bold) {
      push({ kind: "strong", children: parseNoteInline(bold[2] ?? "") });
      i += bold[0].length;
      continue;
    }

    // Italic: single * or _.
    const italic = /^(\*|_)([\s\S]+?)\1/.exec(rest);
    if (italic) {
      push({ kind: "em", children: parseNoteInline(italic[2] ?? "") });
      i += italic[0].length;
      continue;
    }

    buf += text[i] ?? "";
    i += 1;
  }
  flush();
  return out;
}

const HR = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const isFence = (s: string): boolean => s.startsWith("```");
const QUOTE = /^>\s?(.*)$/;
const UL = /^\s*[-*+]\s+(.*)$/;
const OL = /^\s*\d+\.\s+(.*)$/;

function headingLevel(hashes: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = hashes.length;
  return n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 4 : n === 5 ? 5 : 6;
}

/** Parse note markdown into blocks. */
export function parseNoteMarkdown(markdown: string): NoteBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: NoteBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Blank line: block separator.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Fenced code block.
    if (isFence(line)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !isFence(lines[i] ?? "")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1; // consume the closing fence
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    // Horizontal rule.
    if (HR.test(line)) {
      blocks.push({ kind: "hr" });
      i += 1;
      continue;
    }

    // Heading.
    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: headingLevel(heading[1] ?? "#"),
        children: parseNoteInline(heading[2] ?? ""),
      });
      i += 1;
      continue;
    }

    // Blockquote (consecutive `>` lines).
    if (QUOTE.test(line)) {
      const quoted: NoteLines = [];
      while (i < lines.length && QUOTE.test(lines[i] ?? "")) {
        quoted.push(parseNoteInline(QUOTE.exec(lines[i] ?? "")?.[1] ?? ""));
        i += 1;
      }
      blocks.push({ kind: "quote", lines: quoted });
      continue;
    }

    // List (consecutive items of one kind), unordered checked first.
    const unordered = UL.test(line);
    if (unordered || OL.test(line)) {
      const pattern = unordered ? UL : OL;
      const items: NoteInline[][] = [];
      while (i < lines.length && pattern.test(lines[i] ?? "")) {
        items.push(parseNoteInline(pattern.exec(lines[i] ?? "")?.[1] ?? ""));
        i += 1;
      }
      blocks.push({ kind: "list", ordered: !unordered, items });
      continue;
    }

    // Paragraph: consecutive lines until a blank line or a block starter.
    const para: NoteLines = [];
    while (i < lines.length) {
      const l = lines[i] ?? "";
      if (
        l.trim() === "" ||
        isFence(l) ||
        HR.test(l) ||
        HEADING.test(l) ||
        QUOTE.test(l) ||
        UL.test(l) ||
        OL.test(l)
      ) {
        break;
      }
      para.push(parseNoteInline(l));
      i += 1;
    }
    blocks.push({ kind: "paragraph", lines: para });
  }

  return blocks;
}

/** The text of an inline run, without its markup: for a preview or a label. */
export function noteInlineText(nodes: readonly NoteInline[]): string {
  return nodes
    .map((node) =>
      node.kind === "text" || node.kind === "code" ? node.text : noteInlineText(node.children),
    )
    .join("");
}
