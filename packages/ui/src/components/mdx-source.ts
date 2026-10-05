/**
 * How the quick preview reads a draft: a few scanners, each linear in the
 * length of what it reads.
 *
 * They replace regular expressions that had nested or overlapping
 * repetitions (`\s+.*\s+from\s+`, `\[[^\]]+\]\([^)]+\)`), which could
 * spend a long time on a long line of one repeated character, which an
 * author can paste. The preview runs on every keystroke; nothing in it may
 * take more than a glance.
 */

// ── Import declarations ───────────────────────────────────────────────────────
// MDX lets a document begin with import declarations; a lesson never needs
// them and the pipeline removes them, so the preview removes them too rather
// than drawing a paragraph of JavaScript. Only a declaration counts: `import
// x from "y"` or `import "y"` at the start of a line. A Python `import
// hashlib` in a code block is a line of code and stays.

/** Whether `line` is an MDX import declaration. */
export function isImportDeclaration(line: string): boolean {
  if (!line.startsWith("import") || !isSpace(line.charAt(6))) return false;
  const rest = line.slice(7).trimStart();
  if (startsWithQuoted(rest)) return true;
  const from = rest.indexOf(" from ");
  if (from === -1) return false;
  return startsWithQuoted(rest.slice(from + 6).trimStart());
}

/** The MDX without its import declarations, line for line otherwise. */
export function stripImportDeclarations(mdx: string): string {
  return mdx
    .split("\n")
    .filter((line) => !isImportDeclaration(line))
    .join("\n");
}

function isSpace(char: string): boolean {
  return char === " " || char === "\t";
}

/** A quoted module name: an opening quote, something, the same quote again. */
function startsWithQuoted(text: string): boolean {
  const quote = text.charAt(0);
  if (quote !== '"' && quote !== "'") return false;
  const closing = text.indexOf(quote, 1);
  return closing > 1;
}

// ── Inline Markdown ───────────────────────────────────────────────────────────

export type InlineToken =
  | { kind: "text" | "strong" | "em" | "code"; text: string }
  | { kind: "link"; text: string; href: string };

/**
 * Where a closing marker next appears, remembered between calls: a hundred
 * `[` in a row ask the same question a hundred times, and the first answer
 * holds as long as the search starts before it.
 */
class Closers {
  private readonly found = new Map<string, number>();
  constructor(private readonly text: string) {}

  /** The index of `needle` at or after `from`, or -1. */
  after(needle: string, from: number): number {
    const known = this.found.get(needle);
    if (known !== undefined && (known === -1 || known >= from)) return known;
    const at = this.text.indexOf(needle, from);
    this.found.set(needle, at);
    return at;
  }
}

/** `**strong**`, `*em*`, `` `code` `` and `[text](href)` in a line of prose, the rest as text. */
export function inlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const closers = new Closers(text);
  let plain = "";
  let i = 0;
  const flush = (): void => {
    if (plain !== "") tokens.push({ kind: "text", text: plain });
    plain = "";
  };

  while (i < text.length) {
    const char = text.charAt(i);
    if (char === "*" && text.charAt(i + 1) === "*") {
      const close = closers.after("**", i + 2);
      if (close > i + 2) {
        flush();
        tokens.push({ kind: "strong", text: text.slice(i + 2, close) });
        i = close + 2;
        continue;
      }
    } else if (char === "*" || char === "`") {
      const close = closers.after(char, i + 1);
      if (close > i + 1) {
        flush();
        tokens.push({ kind: char === "*" ? "em" : "code", text: text.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    } else if (char === "[") {
      const bracket = closers.after("]", i + 1);
      if (bracket > i + 1 && text.charAt(bracket + 1) === "(") {
        const paren = closers.after(")", bracket + 2);
        if (paren > bracket + 2) {
          flush();
          tokens.push({
            kind: "link",
            text: text.slice(i + 1, bracket),
            href: text.slice(bracket + 2, paren),
          });
          i = paren + 1;
          continue;
        }
      }
    }
    plain += char;
    i += 1;
  }
  flush();
  return tokens;
}

// ── A component's tag ─────────────────────────────────────────────────────────

/** The index just past the `>` that closes the opening tag at the start of `source`, or its length. */
export function endOfOpeningTag(source: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < source.length; i += 1) {
    const char = source.charAt(i);
    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth += 1;
    else if (char === "}") depth = Math.max(0, depth - 1);
    else if (char === ">" && depth === 0) return i + 1;
  }
  return source.length;
}

function isWordChar(char: string): boolean {
  return /^[A-Za-z0-9_]$/.test(char);
}

/**
 * The string props of the opening tag: `name="value"` or `name='value'`,
 * on the tag's line or one per line below it. Expression props (`{...}`)
 * are left out; the preview does not read them.
 */
export function parseStringProps(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  const end = endOfOpeningTag(source);
  let i = 0;
  while (i < end) {
    const equals = source.indexOf("=", i);
    if (equals === -1 || equals >= end) break;
    let start = equals;
    while (start > 0 && isWordChar(source.charAt(start - 1))) start -= 1;
    const name = source.slice(start, equals);
    const quote = source.charAt(equals + 1);
    if (name !== "" && (quote === '"' || quote === "'")) {
      const close = source.indexOf(quote, equals + 2);
      if (close !== -1 && close < end) {
        out[name] = source.slice(equals + 2, close);
        i = close + 1;
        continue;
      }
    }
    i = equals + 1;
  }
  return out;
}

/** The text between the tags, up to the first tag inside; "" when self-closing. */
export function innerText(source: string): string {
  const open = endOfOpeningTag(source);
  if (open >= source.length || source.slice(open - 2, open) === "/>") return "";
  const next = source.indexOf("<", open);
  return (next === -1 ? source.slice(open) : source.slice(open, next)).trim();
}
