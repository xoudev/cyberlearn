import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import type { EsNode, MdNode } from "./attributes.js";

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
  let tree: MdNode;
  try {
    // An mdast Root: MdNode is the subset of it read here.
    tree = processor.parse(mdx);
  } catch {
    // Not parsing is checkLessonMdx's to report, with the section.
    return null;
  }
  return problemInNode(tree);
}

function problemInNode(node: MdNode): string | null {
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    for (const attribute of node.attributes ?? []) {
      const problem = problemInAttribute(node.name ?? "", attribute);
      if (problem !== null) return problem;
    }
  }
  for (const child of node.children ?? []) {
    // SAFETY: every child of an mdast node is an mdast node.
    const problem = problemInNode(child as MdNode);
    if (problem !== null) return problem;
  }
  return null;
}

function problemInAttribute(element: string, attribute: unknown): string | null {
  // SAFETY: an mdxJsxAttribute has a string name and a value that is a string
  // (no escapes there), null, or an expression carrying its ESTree.
  const { type, name, value } = attribute as { type?: string; name?: string; value?: unknown };
  if (type !== "mdxJsxAttribute" || typeof value !== "object" || value === null) return null;
  const program = (value as { data?: { estree?: EsNode } }).data?.estree;
  const lost = program === undefined ? null : lostInTree(program);
  return lost === null ? null : `<${element}>, attribut « ${String(name)} » : ${lost}`;
}

/** The first lost backslash in the strings of an expression, described, or null. */
function lostInTree(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const lost = lostInTree(item);
      if (lost !== null) return lost;
    }
    return null;
  }
  if (typeof node !== "object" || node === null) return null;
  // SAFETY: an ESTree node; type, raw and value are read and checked below.
  const n = node as EsNode;
  if (n.type === "Literal" && typeof n.value === "string" && typeof n.raw === "string") {
    // The raw text keeps its quotes: the first character says which one it is.
    return lostIn(n.raw.slice(1, -1), n.raw.charAt(0));
  }
  if (n.type === "TemplateElement") {
    // SAFETY: a TemplateElement's value holds the text as written in `raw`.
    return lostIn((n.value as { raw: string }).raw, "`");
  }
  for (const [key, child] of Object.entries(n)) {
    if (key === "loc" || key === "range") continue;
    const lost = lostInTree(child);
    if (lost !== null) return lost;
  }
  return null;
}

/** The first backslash a string as written would lose, described, or null. */
function lostIn(text: string, quote: string): string | null {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\\") continue;
    const next = text.charAt(i + 1);
    const kept =
      KEPT.has(next) ||
      next === quote ||
      // `\${` is how a template shows `${` rather than reading a placeholder.
      (quote === "`" && next === "$" && text.charAt(i + 2) === "{");
    if (!kept) return describe(text, i);
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
