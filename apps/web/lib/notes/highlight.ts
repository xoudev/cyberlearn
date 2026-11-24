import { common, createLowlight } from "lowlight";

/**
 * Code colouring for the notes: the preview, the reader and the PDF draw a
 * fenced block's tokens with the same scopes, so a block reads the same on
 * screen and on paper. highlight.js's "common" grammars (bash, python, sql,
 * javascript, c…), through lowlight: it returns a tree of text, never HTML,
 * so nothing a note holds is ever parsed as markup.
 */

const lowlight = createLowlight(common);

/** The token families the notes colour; everything else is plain text. */
export type CodeScope =
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "title"
  | "builtin"
  | "type"
  | "attr"
  | "meta"
  | "variable"
  | "deletion"
  | "addition";

/** A run of code text, with its scope when it has one. */
export interface CodeToken {
  text: string;
  scope: CodeScope | null;
}

/** Aliases people write after ``` mapped to highlight.js names. */
const ALIASES: Record<string, string> = {
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  yml: "yaml",
  html: "xml",
  svg: "xml",
  md: "markdown",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  kt: "kotlin",
  golang: "go",
  text: "plaintext",
  txt: "plaintext",
};

/** The highlight.js name a block's language label stands for, or null. */
export function codeLanguage(label: string): string | null {
  const key = label.trim().toLowerCase();
  if (!key) return null;
  const name = ALIASES[key] ?? key;
  return lowlight.registered(name) ? name : null;
}

const SCOPES: Record<string, CodeScope> = {
  keyword: "keyword",
  "selector-tag": "keyword",
  doctag: "keyword",
  section: "title",
  name: "keyword",
  string: "string",
  regexp: "string",
  "template-tag": "string",
  "template-variable": "variable",
  char: "string",
  subst: "variable",
  comment: "comment",
  quote: "comment",
  number: "number",
  literal: "number",
  symbol: "number",
  bullet: "number",
  title: "title",
  "title.function": "title",
  "title.class": "type",
  function: "title",
  built_in: "builtin",
  "selector-id": "builtin",
  "selector-class": "builtin",
  type: "type",
  class: "type",
  attr: "attr",
  attribute: "attr",
  "selector-attr": "attr",
  property: "attr",
  params: "variable",
  variable: "variable",
  "variable.language": "keyword",
  meta: "meta",
  "meta keyword": "meta",
  "meta-keyword": "meta",
  tag: "meta",
  deletion: "deletion",
  addition: "addition",
};

function scopeOf(classNames: readonly string[]): CodeScope | null {
  for (const raw of classNames) {
    const name = raw.replace(/^hljs-/, "").replace(/_+$/, "");
    const scope = SCOPES[name] ?? SCOPES[name.split(".")[0] ?? ""];
    if (scope) return scope;
  }
  return null;
}

interface HastText {
  type: "text";
  value: string;
}
interface HastElement {
  type: "element";
  properties?: { className?: unknown };
  children: HastNode[];
}
type HastNode = HastText | HastElement | { type: string };

function classNamesOf(node: HastElement): string[] {
  const c = node.properties?.className;
  return Array.isArray(c) ? c.filter((x): x is string => typeof x === "string") : [];
}

function flatten(nodes: readonly HastNode[], inherited: CodeScope | null, out: CodeToken[]): void {
  for (const node of nodes) {
    if (node.type === "text") {
      out.push({ text: (node as HastText).value, scope: inherited });
    } else if (node.type === "element") {
      const el = node as HastElement; // checked by its type tag
      flatten(el.children, scopeOf(classNamesOf(el)) ?? inherited, out);
    }
  }
}

/** Longest block coloured: past it the block is drawn plain, which costs nothing. */
const MAX_HIGHLIGHT = 12_000;

/**
 * A block's code as lines of tokens. Unknown or missing language: one plain
 * token per line. Never throws: a grammar failing on odd input gives plain text.
 */
export function highlightLines(code: string, label: string): CodeToken[][] {
  const plain = (): CodeToken[][] => code.split("\n").map((line) => [{ text: line, scope: null }]);
  const language = codeLanguage(label);
  if (!language || language === "plaintext" || code.length > MAX_HIGHLIGHT) return plain();
  try {
    const tree = lowlight.highlight(language, code);
    const tokens: CodeToken[] = [];
    flatten(tree.children, null, tokens); // hast nodes, narrowed in flatten
    const lines: CodeToken[][] = [[]];
    for (const token of tokens) {
      const parts = token.text.split("\n");
      parts.forEach((part, i) => {
        if (i > 0) lines.push([]);
        if (part) lines[lines.length - 1]?.push({ text: part, scope: token.scope });
      });
    }
    return lines;
  } catch {
    return plain();
  }
}

/** Colours per scope, for the PDF (the screen takes its own from CSS). */
export const CODE_SCOPE_COLORS: Record<CodeScope, string> = {
  keyword: "#B4451A",
  string: "#2F7D4F",
  comment: "#8A867E",
  number: "#9A5B00",
  title: "#1F5FA8",
  builtin: "#7A3FA0",
  type: "#1F7A80",
  attr: "#9A5B00",
  meta: "#7A3FA0",
  variable: "#3C3A36",
  deletion: "#B3261E",
  addition: "#2F7D4F",
};
