import { RangeSet, type Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { NOTE_COLORS } from "@cyberlearn/lib/notes/rich-markdown";

/**
 * The workspace's own markdown colouring for CodeMirror. lang-markdown would
 * bring the HTML, CSS and JS grammars along and would not know the notes'
 * additions; this knows exactly the syntax rich-markdown parses, and paints
 * `[texte]{rouge}` in red as it is typed. Line by line, regex only, over the
 * visible ranges: a fenced block's state is the one thing read from above.
 */

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const HEADING = /^(#{1,6})\s/;
const QUOTE = /^ {0,3}>/;
const CALLOUT = /^ {0,3}>\s?\[![a-zA-Zéè]{1,20}\]/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(\[[ xX]\]\s+)?/;
const HR = /^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/;
const CARD = /\s::\s/;
const COLOR_SET: ReadonlySet<string> = new Set(NOTE_COLORS);

const line = (cls: string): Decoration => Decoration.line({ class: cls });
const mark = (cls: string): Decoration => Decoration.mark({ class: cls });

const PUNCT = mark("cm-md-punct");
const CODE = mark("cm-md-code");
const STRONG = mark("cm-md-strong");
const EM = mark("cm-md-em");
const STRIKE = mark("cm-md-strike");
const HIGHLIGHT = mark("cm-md-bg cm-md-bg--jaune");
const LINK = mark("cm-md-link");
const URL = mark("cm-md-url");
const WIKI = mark("cm-md-wiki");
const LIST_MARK = mark("cm-md-list");
const TASK_OPEN = mark("cm-md-task");
const TASK_DONE = mark("cm-md-task cm-md-task--done");
const CARD_SEP = mark("cm-md-cardsep");
const CALLOUT_MARK = mark("cm-md-callout");

/** Inline marks of one line of text starting at `from`. */
function inlineMarks(text: string, from: number, out: Range<Decoration>[]): void {
  const add = (deco: Decoration, a: number, b: number): void => {
    if (b > a) out.push(deco.range(from + a, from + b));
  };
  const taken: [number, number][] = [];
  const free = (a: number, b: number): boolean => taken.every(([x, y]) => b <= x || a >= y);

  // Inline code first: nothing inside it is markup.
  for (const m of text.matchAll(/`[^`\n]{1,1000}`/g)) {
    const a = m.index;
    const b = a + m[0].length;
    add(CODE, a, b);
    taken.push([a, b]);
  }
  for (const m of text.matchAll(/\[\[[^[\]\n]{1,200}\]\]/g)) {
    const a = m.index;
    const b = a + m[0].length;
    if (!free(a, b)) continue;
    add(PUNCT, a, a + 2);
    add(WIKI, a + 2, b - 2);
    add(PUNCT, b - 2, b);
    taken.push([a, b]);
  }
  for (const m of text.matchAll(/\[([^[\]\n]{1,300})\]\{([a-z-]{3,15})\}/g)) {
    const a = m.index;
    const b = a + m[0].length;
    const arg = m[2] ?? "";
    const background = arg.startsWith("fond-");
    const name = background ? arg.slice(5) : arg;
    if (!free(a, b) || !COLOR_SET.has(name)) continue;
    const labelEnd = a + 1 + (m[1] ?? "").length;
    add(PUNCT, a, a + 1);
    add(
      mark(background ? `cm-md-bg cm-md-bg--${name}` : `cm-md-fg cm-md-fg--${name}`),
      a + 1,
      labelEnd,
    );
    add(PUNCT, labelEnd, b);
  }
  for (const m of text.matchAll(/\[([^[\]\n]{1,300})\]\(([^)\s]{1,2000})\)/g)) {
    const a = m.index;
    const b = a + m[0].length;
    if (!free(a, b)) continue;
    const labelEnd = a + 1 + (m[1] ?? "").length;
    add(PUNCT, a, a + 1);
    add(LINK, a + 1, labelEnd);
    add(PUNCT, labelEnd, labelEnd + 2);
    add(URL, labelEnd + 2, b - 1);
    add(PUNCT, b - 1, b);
  }
  const pairs: [RegExp, Decoration, number][] = [
    [/\*\*[^*\n]{1,1000}\*\*|__[^_\n]{1,1000}__/g, STRONG, 2],
    [/~~[^~\n]{1,1000}~~/g, STRIKE, 2],
    [/==[^=\n]{1,1000}==/g, HIGHLIGHT, 2],
    [/(?<![*\w])\*[^*\n]{1,1000}\*(?!\*)|(?<![_\w])_[^_\n]{1,1000}_(?![_\w])/g, EM, 1],
  ];
  for (const [re, deco, width] of pairs) {
    for (const m of text.matchAll(re)) {
      const a = m.index;
      const b = a + m[0].length;
      if (!free(a, b)) continue;
      add(PUNCT, a, a + width);
      add(deco, a + width, b - width);
      add(PUNCT, b - width, b);
    }
  }
}

function build(view: EditorView): DecorationSet {
  const doc = view.state.doc;
  const out: Range<Decoration>[] = [];
  const last = view.visibleRanges[view.visibleRanges.length - 1];
  const first = view.visibleRanges[0];
  if (!first || !last) return Decoration.none;
  const startLine = doc.lineAt(first.from).number;
  const endLine = doc.lineAt(last.to).number;

  // Whether the first visible line sits inside a fenced block: read from the top.
  let fence: string | null = null;
  for (let n = 1; n < startLine; n += 1) {
    const m = FENCE.exec(doc.line(n).text);
    if (m)
      fence =
        fence === null
          ? (m[1] ?? "```")
          : doc.line(n).text.trimStart().startsWith(fence)
            ? null
            : fence;
  }

  for (let n = startLine; n <= endLine; n += 1) {
    const ln = doc.line(n);
    const text = ln.text;
    const fenceMatch = FENCE.exec(text);
    if (fence !== null) {
      out.push(line("cm-md-codeline").range(ln.from));
      if (text.trimStart().startsWith(fence)) {
        out.push(line("cm-md-fence").range(ln.from));
        fence = null;
      }
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1] ?? "```";
      out.push(line("cm-md-codeline cm-md-fence").range(ln.from));
      continue;
    }
    if (HR.test(text)) {
      out.push(line("cm-md-hr").range(ln.from));
      continue;
    }
    const heading = HEADING.exec(text);
    if (heading) {
      out.push(line(`cm-md-h cm-md-h${String((heading[1] ?? "#").length)}`).range(ln.from));
      out.push(PUNCT.range(ln.from, ln.from + (heading[1] ?? "").length));
      inlineMarks(text.slice(heading[0].length), ln.from + heading[0].length, out);
      continue;
    }
    if (QUOTE.test(text)) {
      out.push(line("cm-md-quote").range(ln.from));
      const callout = CALLOUT.exec(text);
      if (callout) out.push(CALLOUT_MARK.range(ln.from, ln.from + callout[0].length));
    }
    const list = LIST.exec(text);
    if (list) {
      const markerStart = (list[1] ?? "").length;
      const markerEnd = markerStart + (list[2] ?? "").length;
      out.push(LIST_MARK.range(ln.from + markerStart, ln.from + markerEnd));
      if (list[3]) {
        const boxStart = list[0].length - list[3].length;
        const done = /\[[xX]\]/.test(list[3]);
        out.push((done ? TASK_DONE : TASK_OPEN).range(ln.from + boxStart, ln.from + boxStart + 3));
        if (done) out.push(line("cm-md-taskline--done").range(ln.from));
      }
    }
    if (text.trimStart().startsWith("|")) {
      out.push(line("cm-md-table").range(ln.from));
      for (const m of text.matchAll(/\|/g))
        out.push(PUNCT.range(ln.from + m.index, ln.from + m.index + 1));
    }
    const card = CARD.exec(text);
    if (card && !list && !QUOTE.test(text)) {
      out.push(line("cm-md-cardline").range(ln.from));
      out.push(CARD_SEP.range(ln.from + card.index, ln.from + card.index + card[0].length));
    }
    inlineMarks(text, ln.from, out);
  }
  return RangeSet.of(out, true);
}

/** The plugin: rebuilt on edits and scrolls, over what is on screen. */
export const markdownDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) this.decorations = build(update.view);
    }
  },
  { decorations: (v) => v.decorations },
);
