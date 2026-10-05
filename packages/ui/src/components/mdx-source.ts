/**
 * What the quick preview drops before it reads a draft.
 *
 * MDX lets a document begin with import declarations; a lesson never needs
 * them and the pipeline removes them, so the preview removes them too rather
 * than drawing a paragraph of JavaScript. Only a declaration counts: `import
 * x from "y"` or `import "y"` at the start of a line. A Python `import
 * hashlib` in a code block is a line of code and stays.
 *
 * Read character by character rather than with a pattern: the regular
 * expression that did this had nested repetitions (`\s+.*\s+from\s+`) and
 * could spend a long time on a long line of tabs, which an author can paste.
 */

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
