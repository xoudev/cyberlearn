/**
 * The inline Markdown of a lesson's text, cut into the pieces the reader
 * draws: **bold**, `code`, *italic*, and [a link](https://…).
 *
 * Pure, so the cutting is tested without a phone; components/lesson-render.tsx
 * draws the pieces. A link is only ever http(s): anything else written in
 * link syntax is left as the text it is (a `sdb1[1](F)` in a RAID listing is
 * not a link), and opening one is the reader's choice, in the browser.
 */

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "code"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "link"; text: string; href: string };

// A link's address may hold one level of parentheses (Wikipedia's
// `Mot_(sens)`), but no space and no unbalanced parenthesis.
const LINK = String.raw`\[[^\]\n]+\]\(https?:\/\/[^\s()]+(?:\([^\s()]*\)[^\s()]*)*\)`;

// Longest markers first: ** before *.
const INLINE_RE = new RegExp(String.raw`(\*\*[^*]+\*\*|\x60[^\x60]+\x60|${LINK}|\*[^*]+\*)`, "g");

const LINK_PARTS_RE = /^\[([^\]\n]+)\]\((.+)\)$/;

export function inlineTokens(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    const token = m[0];
    if (token.startsWith("**")) {
      out.push({ kind: "bold", text: token.slice(2, -2) });
    } else if (token.startsWith("`")) {
      out.push({ kind: "code", text: token.slice(1, -1) });
    } else if (token.startsWith("[")) {
      const parts = LINK_PARTS_RE.exec(token);
      out.push(
        parts?.[1] !== undefined && parts[2] !== undefined
          ? { kind: "link", text: parts[1], href: parts[2] }
          : { kind: "text", text: token },
      );
    } else {
      out.push({ kind: "italic", text: token.slice(1, -1) });
    }
    last = at + token.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/**
 * An address the reader may open from a lesson: http(s) only, as the site's
 * ExternalLink accepts, and nothing a Markdown link could not hold.
 */
export function isLessonLinkHref(href: string): boolean {
  return /^https?:\/\/[^\s"<>]+$/i.test(href);
}

/**
 * The same link written as Markdown, for the reader to draw like any other:
 * its parentheses escaped, so an address that holds one cannot end the link
 * early, and the brackets taken out of its text.
 */
export function markdownLink(text: string, href: string): string {
  const label = text.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
  const safeHref = href.replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `[${label === "" ? href : label}](${safeHref})`;
}
