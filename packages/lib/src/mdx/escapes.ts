import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import {
  type EsNode,
  type MdNode,
  type MdxPlace,
  type PlacedProblem,
  startOfEsNode,
} from "./attributes.js";

/**
 * Backslashes JavaScript drops from a lesson's text.
 *
 * Between a component's braces, text is a JavaScript string, and there a
 * backslash starts an escape: `\n` is a line break, `\\` a backslash. `\W`
 * means nothing, so the backslash is dropped and the `W` kept. Quiz q-6 of
 * "Processus et programmes" offered "le vrai svchost.exe se trouve dans
 * C:\Windows\System32" that way, and the site, the app and the answer key all
 * read "C:WindowsSystem32": each followed the language, which had lost the
 * character before any of them saw it. A quoted attribute,
 * question="C:\Windows", has no escapes and keeps it.
 *
 * A backslash in a lesson is a Windows path, a regex, a sed or shell command:
 * the character itself. So the escapes a lesson means are kept - `\\`, the
 * string's own quote, `\n`, `\t`, `\r`, a character by its code (`\x20`,
 * `\u00e9`), `\${` in a template - and any other backslash is refused before
 * the lesson is saved: the unknown escapes, the ones that turn into an
 * invisible character (a regex's `\b` is a backspace), a quote that needed no
 * escape, a backslash at the end of a line, which takes the line break with it.
 *
 * Asked by checkLessonMdx, never by the page: a lesson saved before this
 * check keeps rendering, as it always did.
 */

const processor = createProcessor({ remarkPlugins: [remarkGfm] });

/** What follows the backslash of an escape kept in every string. */
const KEPT = new Set(["\\", "n", "t", "r", "x", "u"]);

/** How much of the text around a lost backslash the message quotes, each side. */
const CONTEXT = 30;

/** The first backslash a piece of MDX would lose, in French, or null. */
export function escapeProblem(mdx: string): string | null {
  return escapeProblems(mdx)[0]?.message ?? null;
}

/** The first backslash each string of a piece of MDX would lose, at its place. */
export function escapeProblems(mdx: string): PlacedProblem[] {
  let tree: MdNode;
  try {
    // An mdast Root: MdNode is the subset of it read here.
    tree = processor.parse(mdx);
  } catch {
    // Not parsing is checkLessonMdx's to report, with the section.
    return [];
  }
  const found: PlacedProblem[] = [];
  collectInNode(tree, mdx.split("\n"), found);
  return found;
}

function collectInNode(node: MdNode, lines: string[], found: PlacedProblem[]): void {
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    for (const attribute of node.attributes ?? []) {
      collectInAttribute(node.name ?? "", attribute, lines, found);
    }
  }
  for (const child of node.children ?? []) {
    // SAFETY: every child of an mdast node is an mdast node.
    collectInNode(child as MdNode, lines, found);
  }
}

function collectInAttribute(
  element: string,
  attribute: unknown,
  lines: string[],
  found: PlacedProblem[],
): void {
  // SAFETY: an mdxJsxAttribute has a string name and a value that is a string
  // (no escapes there), null, or an expression carrying its ESTree.
  const { type, name, value } = attribute as { type?: string; name?: string; value?: unknown };
  if (type !== "mdxJsxAttribute" || typeof value !== "object" || value === null) return;
  const program = (value as { data?: { estree?: EsNode } }).data?.estree;
  if (program === undefined) return;
  for (const lost of lostInTree(program, lines)) {
    found.push({
      ...lost,
      message: `<${element}>, attribut « ${String(name)} » : ${lost.message}`,
    });
  }
}

/** The lost backslash of each string of an expression, described and placed. */
function lostInTree(node: unknown, lines: string[]): PlacedProblem[] {
  if (Array.isArray(node)) return node.flatMap((item) => lostInTree(item, lines));
  if (typeof node !== "object" || node === null) return [];
  // SAFETY: an ESTree node; type, raw and value are read and checked below.
  const n = node as EsNode;
  if (n.type === "Literal" && typeof n.value === "string" && typeof n.raw === "string") {
    // The raw text keeps its quotes: the first character says which one it is.
    const raw = n.raw;
    const at = lostIn(raw.slice(1, -1), raw.charAt(0));
    if (at === null) return [];
    // +1: the index is in the text between the quotes.
    return [placed(describe(raw.slice(1, -1), at), startOfEsNode(n), raw, at + 1, lines)];
  }
  if (n.type === "TemplateElement") {
    // SAFETY: a TemplateElement's value holds the text as written in `raw`,
    // which starts where the node does, just past the backtick.
    const raw = (n.value as { raw: string }).raw;
    const at = lostIn(raw, "`");
    return at === null ? [] : [placed(describe(raw, at), startOfEsNode(n), raw, at, lines)];
  }
  const found: PlacedProblem[] = [];
  for (const [key, child] of Object.entries(n)) {
    if (key === "loc" || key === "range") continue;
    found.push(...lostInTree(child, lines));
  }
  return found;
}

/**
 * Where `text[index]` is in the MDX, `text` being written from `start` on.
 *
 * On the string's first line, that is a count of characters. On a later line,
 * MDX has already taken some of the line's indentation when the string reaches
 * the tree (see indentation.ts), so the column is found again from the line as
 * written: its own indentation, then what follows the string's on that line.
 */
function placed(
  message: string,
  start: MdxPlace | null,
  text: string,
  index: number,
  lines: string[],
): PlacedProblem {
  if (start === null) return { message, line: 1, column: 1 };
  const before = text.slice(0, index);
  const lastBreak = before.lastIndexOf("\n");
  if (lastBreak === -1) return { message, line: start.line, column: start.column + index };
  const line = start.line + before.split("\n").length - 1;
  const inString = before.slice(lastBreak + 1);
  const stringIndent = inString.length - inString.trimStart().length;
  const written = lines[line - 1] ?? "";
  const writtenIndent = written.length - written.trimStart().length;
  return { message, line, column: writtenIndent + inString.length - stringIndent + 1 };
}

/** Where the first backslash a string as written would lose is, or null. */
function lostIn(text: string, quote: string): number | null {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\\") continue;
    const next = text.charAt(i + 1);
    const kept =
      KEPT.has(next) ||
      next === quote ||
      // `\${` is how a template shows `${` rather than reading a placeholder.
      (quote === "`" && next === "$" && text.charAt(i + 2) === "{");
    if (!kept) return i;
    i++;
  }
  return null;
}

function describe(text: string, at: number): string {
  const next = text.charAt(at + 1);
  const lineEnd = next === "\n" || next === "\r" || next === "\u2028" || next === "\u2029";
  const rule = "car entre accolades le texte suit les règles de JavaScript";
  if (lineEnd) {
    return `dans « ${lineUpTo(text, at)} », la barre oblique inverse en fin de ligne disparaîtrait avec le retour à la ligne, ${rule}. Écris \\\\ pour la garder, ou retire-la.`;
  }
  const escape = `\\${next}`;
  return `dans « ${around(text, at, at + 2)} », la barre oblique inverse de ${escape} disparaîtrait, ${rule}. Écris \\${escape} pour la garder, ou retire-la.`;
}

/** The word holding text[from, to), as the author wrote it, so it can be found. */
function around(text: string, from: number, to: number): string {
  let start = from;
  while (start > 0 && from - start < CONTEXT && !/\s/.test(text.charAt(start - 1))) start--;
  let end = to;
  while (end < text.length && end - to < CONTEXT && !/\s/.test(text.charAt(end))) end++;
  const before = start > 0 && !/\s/.test(text.charAt(start - 1)) ? "…" : "";
  const after = end < text.length && !/\s/.test(text.charAt(end)) ? "…" : "";
  return `${before}${text.slice(start, end)}${after}`;
}

/** The end of the line a backslash closes, itself included: `docker run \`. */
function lineUpTo(text: string, at: number): string {
  const start = Math.max(text.lastIndexOf("\n", at - 1) + 1, at - CONTEXT);
  const line = text.slice(start, at + 1).trimStart();
  return start > 0 && text.charAt(start - 1) !== "\n" ? `…${line}` : line;
}
