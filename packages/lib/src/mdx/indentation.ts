/**
 * Keeps the indentation of code written in a component's props.
 *
 * A playground's code is usually a template literal that spans lines:
 *
 *   <CodePlayground language="python" starterCode={`if ok:
 *       print("oui")`} />
 *
 * MDX parses a component that starts a line as a block, and strips the
 * whitespace at the start of each of its lines - the element's own indent,
 * plus up to two spaces - before the expression in its braces is ever read.
 * The string above reaches the component as `if ok:\n  print("oui")`: two
 * spaces instead of four, in every one of the 246 multi-line playgrounds of
 * content/ at the time of writing. No remark plugin can put them back, since
 * the expression is parsed after they are gone.
 *
 * A quoted attribute that spans lines (`starterCode="def f():` ...) loses its
 * leading whitespace the same way, all of it.
 *
 * So the source is fixed up before it is compiled: inside a component's tag,
 * the leading whitespace of each continuation line of a template literal is
 * written as escapes (\x20, \t), and that of a quoted attribute as character
 * references (&#32;, &#9;), since a JSX attribute string has no escapes. MDX
 * does not see whitespace there and keeps it; the escapes are read back as the
 * spaces the author typed. The element's own indent stays as it is, since it
 * belongs to the markdown around it (a list item, say), not to the code.
 *
 * Everything else is left byte for byte: text, children, fenced code blocks,
 * the first line of every string, and templates that hold a `${}` (refused
 * anyway by remarkLiteralValuesOnly, so not worth the risk of rewriting).
 */
export function protectPropIndentation(mdx: string): string {
  const out: string[] = [];
  let fence: string | null = null;
  let i = 0;

  while (i < mdx.length) {
    const newline = mdx.indexOf("\n", i);
    const lineEnd = newline === -1 ? mdx.length : newline + 1;
    const line = mdx.slice(i, lineEnd);
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    const marker = /^(`{3,}|~{3,})/.exec(trimmed)?.[1];
    if (fence !== null) {
      if (
        marker !== undefined &&
        marker.startsWith(fence.charAt(0)) &&
        marker.length >= fence.length
      ) {
        fence = null;
      }
      out.push(line);
      i = lineEnd;
      continue;
    }
    if (marker !== undefined) {
      fence = marker;
      out.push(line);
      i = lineEnd;
      continue;
    }

    if (/^<[A-Z]/.test(trimmed)) {
      const start = i + indent;
      const end = endOfTag(mdx, start);
      out.push(mdx.slice(i, start), protectTag(mdx.slice(start, end), indent));
      i = end;
      continue;
    }

    out.push(line);
    i = lineEnd;
  }
  return out.join("");
}

/** The index just past the `>` closing the tag that opens at `start`. */
function endOfTag(s: string, start: number): number {
  let depth = 0;
  let i = start + 1;
  while (i < s.length) {
    const c = s[i];
    if (depth === 0) {
      if (c === ">") return i + 1;
      if (c === '"' || c === "'") {
        i = endOfQuoted(s, i, false);
        continue;
      }
      if (c === "{") depth++;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      i = endOfQuoted(s, i, true);
      continue;
    }
    if (c === "`") {
      i = endOfTemplate(s, i);
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    i++;
  }
  return s.length;
}

/**
 * The index just past a quoted string. A JSX attribute string has no escapes;
 * a string inside braces is JavaScript, where a backslash escapes.
 */
function endOfQuoted(s: string, open: number, escapes: boolean): number {
  const quote = s[open];
  let i = open + 1;
  while (i < s.length) {
    if (escapes && s[i] === "\\") {
      i += 2;
      continue;
    }
    if (s[i] === quote) return i + 1;
    i++;
  }
  return s.length;
}

/** The index just past a template literal, backslash escapes included. */
function endOfTemplate(s: string, open: number): number {
  let i = open + 1;
  while (i < s.length) {
    if (s[i] === "\\") {
      i += 2;
      continue;
    }
    if (s[i] === "`") return i + 1;
    i++;
  }
  return s.length;
}

/** The tag, with the templates inside its braces protected. */
function protectTag(tag: string, keep: number): string {
  let out = "";
  let depth = 0;
  let i = 0;
  while (i < tag.length) {
    const c = tag.charAt(i);
    if (depth === 0 && (c === '"' || c === "'")) {
      const end = endOfQuoted(tag, i, false);
      out += protectLines(tag.slice(i, end), keep, QUOTED);
      i = end;
      continue;
    }
    if (depth > 0 && (c === '"' || c === "'")) {
      const end = endOfQuoted(tag, i, true);
      out += tag.slice(i, end);
      i = end;
      continue;
    }
    if (depth > 0 && c === "`") {
      const end = endOfTemplate(tag, i);
      const template = tag.slice(i, end);
      out += template.includes("${") ? template : protectLines(template, keep, TEMPLATE);
      i = end;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    out += c;
    i++;
  }
  return out;
}

/** How a space and a tab are written so that MDX leaves them be. */
interface Escapes {
  space: string;
  tab: string;
}

/** In a template literal: JavaScript escapes. */
const TEMPLATE: Escapes = { space: "\\x20", tab: "\\t" };

/** In a quoted attribute, which has no escapes: character references. */
const QUOTED: Escapes = { space: "&#32;", tab: "&#9;" };

/** A string whose continuation lines keep their leading whitespace. */
function protectLines(value: string, keep: number, escapes: Escapes): string {
  return value
    .split("\n")
    .map((line, k) => {
      if (k === 0) return line;
      const lead = /^[ \t]*/.exec(line)?.[0] ?? "";
      const kept = lead.slice(0, Math.min(keep, lead.length));
      const escaped = lead
        .slice(kept.length)
        .replace(/ /g, escapes.space)
        .replace(/\t/g, escapes.tab);
      return kept + escaped + line.slice(lead.length);
    })
    .join("\n");
}
