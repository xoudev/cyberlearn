/**
 * The markdown of the notes workspace, parsed into a tree any renderer can
 * draw: the site's reader and editor preview, and the PDF export.
 *
 * It is a superset of the forum's small markdown (@cyberlearn/lib/markdown/
 * note-markdown), kept apart so that posts and the app, which draw that tree,
 * are not handed node kinds they do not know. Like it, the tree only ever
 * holds text: nothing in it is markup, so a renderer drawing text as text
 * cannot be made to run anything, and a link only ever carries http, https or
 * mailto.
 *
 * Added over the forum's set:
 * - inline: ~~barré~~, ==surligné==, [texte]{rouge} (coloured text),
 *   [texte]{fond-vert} (coloured highlight), [[Titre d'une note]] and
 *   [[Titre|libellé]] (links between notes);
 * - blocks: a fenced block's language, nested lists, task items (- [ ] / - [x])
 *   with their source line so a preview can tick them, tables, callouts
 *   (> [!astuce] Titre, the Obsidian keys too) and flashcards, a line written
 *   `question :: réponse`.
 *
 * Every delimiter search is bounded (MAX_SPAN), so a long line full of
 * unmatched `*` or `[` stays linear rather than quadratic.
 */

/** The colours text and highlights may take: the toolbar's palette. */
export const NOTE_COLORS = ["rouge", "orange", "jaune", "vert", "bleu", "violet", "gris"] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export const NOTE_COLOR_LABELS: Record<NoteColor, string> = {
  rouge: "Rouge",
  orange: "Orange",
  jaune: "Jaune",
  vert: "Vert",
  bleu: "Bleu",
  violet: "Violet",
  gris: "Gris",
};

/** Callout kinds, as written after `> [!`. French keys first, then Obsidian's. */
export const CALLOUT_KINDS = [
  "note",
  "info",
  "astuce",
  "attention",
  "danger",
  "succes",
  "question",
  "exemple",
] as const;
export type CalloutKind = (typeof CALLOUT_KINDS)[number];

export const CALLOUT_LABELS: Record<CalloutKind, string> = {
  note: "Note",
  info: "Info",
  astuce: "Astuce",
  attention: "Attention",
  danger: "Danger",
  succes: "Réussi",
  question: "Question",
  exemple: "Exemple",
};

const CALLOUT_ALIASES: Record<string, CalloutKind> = {
  note: "note",
  info: "info",
  abstract: "info",
  summary: "info",
  resume: "info",
  tip: "astuce",
  hint: "astuce",
  astuce: "astuce",
  important: "attention",
  warning: "attention",
  caution: "attention",
  attention: "attention",
  danger: "danger",
  error: "danger",
  bug: "danger",
  failure: "danger",
  success: "succes",
  check: "succes",
  done: "succes",
  succes: "succes",
  question: "question",
  faq: "question",
  help: "question",
  example: "exemple",
  exemple: "exemple",
};

export type RichInline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; children: RichInline[] }
  | { kind: "em"; children: RichInline[] }
  | { kind: "strike"; children: RichInline[] }
  | { kind: "mark"; color: NoteColor; background: boolean; children: RichInline[] }
  | { kind: "link"; href: string; children: RichInline[] }
  | { kind: "wikilink"; target: string; label: string };

export type RichLines = RichInline[][];

export interface RichListItem {
  children: RichInline[];
  /** null for a plain item; true/false for a task item. */
  checked: boolean | null;
  /** The source line of the item (0-based), for ticking a task in a preview. */
  line: number;
  /** A list nested under the item, if any. */
  sublist: RichList | null;
}

export interface RichList {
  kind: "list";
  ordered: boolean;
  start: number;
  items: RichListItem[];
}

export type TableAlign = "left" | "center" | "right" | null;

export type RichBlock =
  | { kind: "code"; lang: string; text: string }
  | { kind: "hr" }
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: RichInline[]; slug: string }
  | { kind: "quote"; lines: RichLines }
  | { kind: "callout"; variant: CalloutKind; title: RichInline[]; lines: RichLines }
  | RichList
  | { kind: "table"; align: TableAlign[]; header: RichInline[][]; rows: RichInline[][][] }
  | { kind: "flashcard"; front: RichInline[]; back: RichInline[] }
  | { kind: "paragraph"; lines: RichLines };

/** Longest run a delimiter pair may enclose: past it, the opener is text. */
const MAX_SPAN = 1000;
const SAFE_LINK = /^(https?:|mailto:)/i;
const COLOR_SET: ReadonlySet<string> = new Set(NOTE_COLORS);

/** Where `delim` next occurs in `text` after `from`, within MAX_SPAN, or -1. */
function findCloser(text: string, delim: string, from: number): number {
  const end = text.indexOf(delim, from);
  if (end < 0 || end - from > MAX_SPAN) return -1;
  return end;
}

/** `[label]` followed by `(url)` or `{colour}` at `i`; null when it is neither. */
function bracketSpan(
  text: string,
  i: number,
): { label: string; next: number; close: "(" | "{"; arg: string } | null {
  let depth = 0;
  let j = i;
  const limit = Math.min(text.length, i + 300);
  for (; j < limit; j += 1) {
    const c = text[j];
    if (c === "\n") return null;
    if (c === "[") depth += 1;
    else if (c === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  if (j >= limit || text[j] !== "]") return null;
  const label = text.slice(i + 1, j);
  const opener = text[j + 1];
  if (opener === "(") {
    const end = text.indexOf(")", j + 2);
    if (end < 0 || end - j > 2000) return null;
    const arg = text.slice(j + 2, end);
    if (/\s/.test(arg)) return null;
    return { label, next: end + 1, close: "(", arg };
  }
  if (opener === "{") {
    const end = text.indexOf("}", j + 2);
    if (end < 0 || end - j > 20) return null;
    return {
      label,
      next: end + 1,
      close: "{",
      arg: text
        .slice(j + 2, end)
        .trim()
        .toLowerCase(),
    };
  }
  return null;
}

/** The colour a `{…}` names, and whether it is a background (fond-…). */
function parseColorArg(arg: string): { color: NoteColor; background: boolean } | null {
  const background = arg.startsWith("fond-");
  const name = background ? arg.slice(5) : arg;
  if (!COLOR_SET.has(name)) return null;
  return { color: name as NoteColor, background }; // checked against NOTE_COLORS above
}

/** Parse the inline markdown of one line. */
export function parseRichInline(text: string): RichInline[] {
  const out: RichInline[] = [];
  let buf = "";
  let i = 0;
  const flush = (): void => {
    if (buf) {
      out.push({ kind: "text", text: buf });
      buf = "";
    }
  };
  const push = (node: RichInline): void => {
    flush();
    out.push(node);
  };

  while (i < text.length) {
    const c = text[i] ?? "";

    // Backslash escape: the next character is text.
    if (c === "\\" && i + 1 < text.length && /[\\`*_~=[\]{}()#>|:!-]/.test(text[i + 1] ?? "")) {
      buf += text[i + 1] ?? "";
      i += 2;
      continue;
    }

    // Inline code: literal, no nested parsing.
    if (c === "`") {
      const end = findCloser(text, "`", i + 1);
      if (end > i + 1) {
        push({ kind: "code", text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Link between notes: [[Titre]] or [[Titre|libellé]].
    if (c === "[" && text[i + 1] === "[") {
      const end = text.indexOf("]]", i + 2);
      if (end > i + 2 && end - i <= 200) {
        const inner = text.slice(i + 2, end);
        if (!inner.includes("\n") && !inner.includes("[")) {
          const bar = inner.indexOf("|");
          const target = (bar >= 0 ? inner.slice(0, bar) : inner).trim();
          const label = (bar >= 0 ? inner.slice(bar + 1) : inner).trim() || target;
          if (target) {
            push({ kind: "wikilink", target, label });
            i = end + 2;
            continue;
          }
        }
      }
    }

    // [label](url) and [label]{colour}.
    if (c === "[") {
      const span = bracketSpan(text, i);
      if (span?.close === "(" && SAFE_LINK.test(span.arg)) {
        push({ kind: "link", href: span.arg, children: parseRichInline(span.label) });
        i = span.next;
        continue;
      }
      if (span?.close === "{") {
        const color = parseColorArg(span.arg);
        if (color) {
          push({ kind: "mark", ...color, children: parseRichInline(span.label) });
          i = span.next;
          continue;
        }
      }
    }

    // ==highlight== (yellow).
    if (c === "=" && text[i + 1] === "=") {
      const end = findCloser(text, "==", i + 2);
      if (end > i + 2) {
        push({
          kind: "mark",
          color: "jaune",
          background: true,
          children: parseRichInline(text.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }

    // ~~strike~~.
    if (c === "~" && text[i + 1] === "~") {
      const end = findCloser(text, "~~", i + 2);
      if (end > i + 2) {
        push({ kind: "strike", children: parseRichInline(text.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }

    // Bold: ** or __ (checked before italic so the longer delimiter wins).
    if ((c === "*" || c === "_") && text[i + 1] === c) {
      const delim = c + c;
      const end = findCloser(text, delim, i + 2);
      if (end > i + 2) {
        push({ kind: "strong", children: parseRichInline(text.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }

    // Italic: single * or _. An underscore inside a word (snake_case) is text.
    if (c === "*" || (c === "_" && !/\w/.test(text[i - 1] ?? ""))) {
      const end = findCloser(text, c, i + 1);
      if (end > i + 1 && !(c === "_" && /\w/.test(text[end + 1] ?? ""))) {
        push({ kind: "em", children: parseRichInline(text.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }

    buf += c;
    i += 1;
  }
  flush();
  return out;
}

const HR = /^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]{0,30})/;
const QUOTE = /^ {0,3}>\s?(.*)$/;
const CALLOUT_HEAD = /^\[!([a-zA-Zéè]{1,20})\][+-]?\s*(.*)$/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+(.*)$/;
const TABLE_SEP = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;
/** `question :: réponse`: both sides non-empty, outside code. */
const FLASHCARD = /^(.{1,500}?)\s+::\s+(.{1,2000})$/;

function headingLevel(hashes: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = hashes.length;
  return n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 4 : n === 5 ? 5 : 6;
}

/** Lowercase, accents folded away, spaces collapsed: how titles are compared. */
export function normalizeNoteTitle(title: string): string {
  return title.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** An anchor for a heading: its words, folded, joined by dashes. */
export function headingSlug(text: string): string {
  return normalizeNoteTitle(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Split a table row into its cells, `\|` staying in its cell. */
function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let k = 0; k < s.length; k += 1) {
    const ch = s[k];
    if (ch === "\\" && s[k + 1] === "|") {
      cur += "|";
      k += 1;
    } else if (ch === "|") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch ?? "";
    }
  }
  cells.push(cur.trim());
  return cells;
}

function cellAlign(sep: string): TableAlign {
  const s = sep.trim();
  const left = s.startsWith(":");
  const right = s.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

function indentWidth(ws: string): number {
  let w = 0;
  for (const ch of ws) w += ch === "\t" ? 4 : 1;
  return w;
}

function isListLine(line: string): boolean {
  return LIST_ITEM.test(line);
}

function startsBlock(line: string, next: string | undefined): boolean {
  return (
    line.trim() === "" ||
    FENCE.test(line) ||
    HR.test(line) ||
    HEADING.test(line) ||
    QUOTE.test(line) ||
    isListLine(line) ||
    (line.includes("|") && next !== undefined && TABLE_SEP.test(next) && next.includes("-"))
  );
}

/**
 * Parse list lines from `lines[from]` into a list, nesting by indentation.
 * Returns the list and the index of the first line after it.
 */
function parseList(lines: string[], from: number): { list: RichList; next: number } {
  interface Frame {
    indent: number;
    list: RichList;
  }
  const first = LIST_ITEM.exec(lines[from] ?? "");
  const firstMarker = first?.[2] ?? "-";
  const ordered = /\d/.test(firstMarker);
  const root: RichList = {
    kind: "list",
    ordered,
    start: ordered ? Math.min(Number.parseInt(firstMarker, 10) || 1, 1_000_000) : 1,
    items: [],
  };
  const stack: Frame[] = [{ indent: indentWidth(first?.[1] ?? ""), list: root }];
  let i = from;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const m = LIST_ITEM.exec(line);
    if (!m) {
      // A continuation line indented under the last item joins its text.
      const top = stack[stack.length - 1];
      const last = top?.list.items[top.list.items.length - 1];
      if (line.trim() !== "" && /^\s{2,}/.test(line) && last) {
        last.children.push({ kind: "text", text: " " }, ...parseRichInline(line.trim()));
        i += 1;
        continue;
      }
      break;
    }
    const indent = indentWidth(m[1] ?? "");
    const marker = m[2] ?? "-";
    let body = m[3] ?? "";
    while (stack.length > 1 && indent < (stack[stack.length - 1]?.indent ?? 0)) stack.pop();
    const top = stack[stack.length - 1];
    if (!top) break;
    let frame = top;
    if (indent > frame.indent + 1) {
      const parentItem = frame.list.items[frame.list.items.length - 1];
      if (parentItem && stack.length < 6) {
        const nestedOrdered = /\d/.test(marker);
        const nested: RichList = {
          kind: "list",
          ordered: nestedOrdered,
          start: nestedOrdered ? Math.min(Number.parseInt(marker, 10) || 1, 1_000_000) : 1,
          items: [],
        };
        parentItem.sublist = nested;
        frame = { indent, list: nested };
        stack.push(frame);
      }
    } else if (stack.length === 1 && /\d/.test(marker) !== root.ordered && indent <= frame.indent) {
      // A top-level item of the other kind starts another list.
      break;
    }
    let checked: boolean | null = null;
    const task = TASK.exec(body);
    if (task) {
      checked = (task[1] ?? " ") !== " ";
      body = task[2] ?? "";
    }
    frame.list.items.push({ children: parseRichInline(body), checked, line: i, sublist: null });
    i += 1;
  }
  return { list: root, next: i };
}

/** Parse workspace markdown into blocks. */
export function parseRichMarkdown(markdown: string): RichBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: RichBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Fenced code block, ``` or ~~~, with an optional language.
    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1] ?? "```";
      const lang = (fence[2] ?? "").toLowerCase();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").trimStart().startsWith(marker)) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ kind: "code", lang, text: body.join("\n") });
      continue;
    }

    if (HR.test(line)) {
      blocks.push({ kind: "hr" });
      i += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const text = (heading[2] ?? "").replace(/\s+#+\s*$/, "");
      blocks.push({
        kind: "heading",
        level: headingLevel(heading[1] ?? "#"),
        children: parseRichInline(text),
        slug: headingSlug(text),
      });
      i += 1;
      continue;
    }

    // Blockquote, or a callout when its first line is [!kind].
    if (QUOTE.test(line)) {
      const raw: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i] ?? "")) {
        raw.push(QUOTE.exec(lines[i] ?? "")?.[1] ?? "");
        i += 1;
      }
      const head = CALLOUT_HEAD.exec(raw[0] ?? "");
      const variant = head ? CALLOUT_ALIASES[(head[1] ?? "").toLowerCase()] : undefined;
      if (head && variant) {
        blocks.push({
          kind: "callout",
          variant,
          title: parseRichInline((head[2] ?? "").trim() || CALLOUT_LABELS[variant]),
          lines: raw.slice(1).map((l) => parseRichInline(l)),
        });
      } else {
        blocks.push({ kind: "quote", lines: raw.map((l) => parseRichInline(l)) });
      }
      continue;
    }

    if (isListLine(line)) {
      const { list, next } = parseList(lines, i);
      blocks.push(list);
      i = next;
      continue;
    }

    // Table: a header row, then a separator row of dashes.
    const sepLine = lines[i + 1];
    if (
      line.includes("|") &&
      sepLine !== undefined &&
      TABLE_SEP.test(sepLine) &&
      sepLine.includes("-")
    ) {
      const header = splitRow(line);
      const align = splitRow(sepLine).map(cellAlign);
      if (align.length === header.length) {
        const rows: RichInline[][][] = [];
        i += 2;
        while (
          i < lines.length &&
          (lines[i] ?? "").includes("|") &&
          (lines[i] ?? "").trim() !== ""
        ) {
          const cells = splitRow(lines[i] ?? "").slice(0, header.length);
          while (cells.length < header.length) cells.push("");
          rows.push(cells.map((c) => parseRichInline(c)));
          i += 1;
        }
        blocks.push({ kind: "table", align, header: header.map((c) => parseRichInline(c)), rows });
        continue;
      }
    }

    // Flashcard: one line, `question :: réponse`.
    const card = FLASHCARD.exec(line.trim());
    if (card) {
      blocks.push({
        kind: "flashcard",
        front: parseRichInline((card[1] ?? "").trim()),
        back: parseRichInline((card[2] ?? "").trim()),
      });
      i += 1;
      continue;
    }

    // Paragraph: consecutive lines until a blank line or a block starter.
    const para: RichLines = [];
    while (i < lines.length) {
      const l = lines[i] ?? "";
      if (para.length > 0 && (startsBlock(l, lines[i + 1]) || FLASHCARD.test(l.trim()))) break;
      if (para.length === 0 && l.trim() === "") break;
      para.push(parseRichInline(l));
      i += 1;
    }
    blocks.push({ kind: "paragraph", lines: para });
  }

  return blocks;
}

/** The text of an inline run, without its markup: for a preview or a label. */
export function richInlineText(nodes: readonly RichInline[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case "text":
        case "code":
          return node.text;
        case "wikilink":
          return node.label;
        case "strong":
        case "em":
        case "strike":
        case "mark":
        case "link":
          return richInlineText(node.children);
      }
    })
    .join("");
}

/** The source lines of `markdown` that sit inside a fenced code block. */
function codeLines(lines: readonly string[]): Set<number> {
  const inside = new Set<number>();
  let marker: string | null = null;
  lines.forEach((line, idx) => {
    const fence = FENCE.exec(line);
    if (marker === null && fence) {
      marker = fence[1] ?? "```";
      inside.add(idx);
    } else if (marker !== null) {
      inside.add(idx);
      if (line.trimStart().startsWith(marker)) marker = null;
    }
  });
  return inside;
}

/** The flashcards written in a note (`question :: réponse`), outside code. */
export function extractFlashcards(markdown: string): { front: string; back: string }[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const code = codeLines(lines);
  const cards: { front: string; back: string }[] = [];
  const seen = new Set<string>();
  lines.forEach((line, idx) => {
    if (code.has(idx)) return;
    const m = FLASHCARD.exec(line.trim());
    if (!m) return;
    const front = (m[1] ?? "").trim();
    const back = (m[2] ?? "").trim();
    const key = normalizeNoteTitle(front);
    if (!front || !back || seen.has(key)) return;
    seen.add(key);
    cards.push({ front, back });
  });
  return cards;
}

/** The titles a note links to with [[…]], outside code, folded for matching. */
export function extractWikiLinks(markdown: string): string[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const code = codeLines(lines);
  const out = new Set<string>();
  lines.forEach((line, idx) => {
    if (code.has(idx)) return;
    const re = /\[\[([^[\]\n|]{1,200})(?:\|[^[\]\n]{0,200})?\]\]/g;
    // Inline code is literal: a [[link]] written inside it is not one.
    const text = line.replace(/`[^`\n]{1,1000}`/g, "");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const target = normalizeNoteTitle(m[1] ?? "");
      if (target) out.add(target);
    }
  });
  return [...out];
}

/**
 * Tick or untick the task item on `line` (0-based) of `markdown`. Returns the
 * markdown unchanged when that line is not a task item.
 */
export function toggleTask(markdown: string, line: number): string {
  const lines = markdown.split("\n");
  const current = lines[line];
  if (current === undefined) return markdown;
  const m = /^(\s*(?:[-*+]|\d{1,9}[.)])\s+)\[([ xX])\](.*)$/.exec(current);
  if (!m) return markdown;
  lines[line] = `${m[1] ?? ""}[${(m[2] ?? " ") === " " ? "x" : " "}]${m[3] ?? ""}`;
  return lines.join("\n");
}

/** Rough markdown-aware word count, for the editor's footer and the cards. */
export function countNoteWords(markdown: string): number {
  const text = markdown.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`~=\-[\]{}()!|]/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** The headings of a note, for its outline. */
export function noteOutline(markdown: string): { level: number; text: string; slug: string }[] {
  return parseRichMarkdown(markdown)
    .filter((b): b is Extract<RichBlock, { kind: "heading" }> => b.kind === "heading")
    .map((b) => ({ level: b.level, text: richInlineText(b.children), slug: b.slug }));
}

/** The text of a list, its sublists included. */
function listText(list: RichList): string[] {
  return list.items.flatMap((item) => [
    richInlineText(item.children),
    ...(item.sublist ? listText(item.sublist) : []),
  ]);
}

/**
 * A note as one line of plain text, for a card in the library: the markup
 * gone (colours, links, callout keys), code blocks left out, cut at `max`.
 */
export function richExcerpt(markdown: string, max = 150): string {
  const parts: string[] = [];
  for (const block of parseRichMarkdown(markdown)) {
    switch (block.kind) {
      case "heading":
        parts.push(richInlineText(block.children));
        break;
      case "paragraph":
      case "quote":
        parts.push(...block.lines.map((l) => richInlineText(l)));
        break;
      case "callout":
        parts.push(richInlineText(block.title), ...block.lines.map((l) => richInlineText(l)));
        break;
      case "list":
        parts.push(...listText(block));
        break;
      case "flashcard":
        parts.push(`${richInlineText(block.front)} → ${richInlineText(block.back)}`);
        break;
      case "table":
        parts.push(...block.header.map((c) => richInlineText(c)));
        break;
      case "code":
      case "hr":
        break;
    }
    if (parts.join(" ").length > max * 2) break;
  }
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
