/**
 * A note's markdown as a .md file other tools display, and back.
 *
 * The workspace writes a few things no other reader knows: [texte]{rouge}
 * (coloured text), [texte]{fond-vert} (a coloured highlight), ==surligné==,
 * and callouts keyed in French (> [!astuce] Titre). Exported as written, a
 * note showed them as raw syntax in GitHub, VS Code or any viewer. So the
 * export writes:
 * - coloured text and highlights as inline HTML, which CommonMark passes
 *   through and every common viewer draws: <span style="color: #…">,
 *   <mark style="background: #…">, <mark>;
 * - callouts as GitHub's alerts (> [!TIP]), which GitHub, VS Code and
 *   Obsidian draw, the title, or the French name when the alert's own differs,
 *   on the line under it in bold.
 *
 * Everything else is already common markdown, or reads as plain text where it
 * is not drawn: [[liens]] (Obsidian's own), flashcards (`question :: réponse`).
 * Code, fenced or inline, is left exactly as written.
 *
 * The import reverses the HTML forms, matched exactly with the palette's
 * colours (NOTE_INK_HEX, NOTE_HIGHLIGHT_HEX), so a library exported and
 * imported again keeps its colours. A callout comes back as the alert's kind,
 * which the workspace reads natively; its title stays the bold line under it.
 */

import {
  bracketSpan,
  CALLOUT_ALIASES,
  CALLOUT_HEAD,
  CALLOUT_LABELS,
  type CalloutKind,
  ESCAPABLE,
  FENCE,
  findCloser,
  NOTE_COLORS,
  NOTE_HIGHLIGHT_HEX,
  NOTE_INK_HEX,
  type NoteColor,
  parseColorArg,
  QUOTE,
  SAFE_LINK,
} from "./rich-markdown";

type GfmAlert = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

/** The GitHub alert closest to each callout, by meaning and by colour. */
const GFM_ALERT: Record<CalloutKind, GfmAlert> = {
  note: "NOTE",
  info: "NOTE",
  astuce: "TIP",
  attention: "WARNING",
  danger: "CAUTION",
  succes: "TIP",
  question: "IMPORTANT",
  exemple: "NOTE",
};

/** Callouts whose alert already says what they are: no name line is added. */
const ALERT_SAYS_IT: ReadonlySet<CalloutKind> = new Set(["note", "astuce", "attention", "danger"]);

function openMark(color: NoteColor, background: boolean): string {
  return background
    ? `<mark style="background: ${NOTE_HIGHLIGHT_HEX[color]}">`
    : `<span style="color: ${NOTE_INK_HEX[color]}">`;
}

/**
 * One line's inline markdown with the workspace's own marks as HTML. It walks
 * the line the way parseRichInline does, so a delimiter is converted only
 * where the workspace draws it, and inline code is copied untouched.
 */
export function portableInline(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i] ?? "";

    if (c === "\\" && i + 1 < text.length && ESCAPABLE.test(text[i + 1] ?? "")) {
      out += text.slice(i, i + 2);
      i += 2;
      continue;
    }

    if (c === "`") {
      const end = findCloser(text, "`", i + 1);
      if (end > i + 1) {
        out += text.slice(i, end + 1);
        i = end + 1;
        continue;
      }
    }

    if (c === "[" && text[i + 1] === "[") {
      const end = text.indexOf("]]", i + 2);
      if (end > i + 2 && end - i <= 200) {
        const inner = text.slice(i + 2, end);
        const bar = inner.indexOf("|");
        const target = (bar >= 0 ? inner.slice(0, bar) : inner).trim();
        if (!inner.includes("\n") && !inner.includes("[") && target) {
          out += text.slice(i, end + 2);
          i = end + 2;
          continue;
        }
      }
    }

    if (c === "[") {
      const span = bracketSpan(text, i);
      if (span?.close === "(" && SAFE_LINK.test(span.arg)) {
        out += `[${portableInline(span.label)}](${span.arg})`;
        i = span.next;
        continue;
      }
      if (span?.close === "{") {
        const color = parseColorArg(span.arg);
        if (color) {
          out += `${openMark(color.color, color.background)}${portableInline(span.label)}${color.background ? "</mark>" : "</span>"}`;
          i = span.next;
          continue;
        }
      }
    }

    // ==surligné==, ~~barré~~, **gras**, __gras__: the content is walked too.
    const pair = text.slice(i, i + 2);
    if (pair === "==" || pair === "~~" || pair === "**" || pair === "__") {
      const end = findCloser(text, pair, i + 2);
      if (end > i + 2) {
        const inner = portableInline(text.slice(i + 2, end));
        out += pair === "==" ? `<mark>${inner}</mark>` : `${pair}${inner}${pair}`;
        i = end + 2;
        continue;
      }
    }

    if (c === "*" || (c === "_" && !/\w/.test(text[i - 1] ?? ""))) {
      const end = findCloser(text, c, i + 1);
      if (end > i + 1 && !(c === "_" && /\w/.test(text[end + 1] ?? ""))) {
        out += `${c}${portableInline(text.slice(i + 1, end))}${c}`;
        i = end + 1;
        continue;
      }
    }

    out += c;
    i += 1;
  }
  return out;
}

/**
 * Walks the lines outside fenced code, handing each to `line` with whether it
 * opens a blockquote (the line before it is not one).
 */
function mapProseLines(
  markdown: string,
  line: (text: string, opensQuote: boolean) => string,
): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let fence: string | null = null;
  let previousQuoted = false;
  for (const text of lines) {
    if (fence !== null) {
      out.push(text);
      if (text.trimStart().startsWith(fence)) fence = null;
      previousQuoted = false;
      continue;
    }
    const opening = FENCE.exec(text);
    if (opening) {
      fence = opening[1] ?? "```";
      out.push(text);
      previousQuoted = false;
      continue;
    }
    const quoted = QUOTE.test(text);
    out.push(line(text, quoted && !previousQuoted));
    previousQuoted = quoted;
  }
  return out.join("\n");
}

/** A note's markdown, written the way other markdown readers draw it. */
export function toPortableMarkdown(markdown: string): string {
  return mapProseLines(markdown, (text, opensQuote) => {
    if (opensQuote) {
      const content = QUOTE.exec(text)?.[1] ?? "";
      const head = CALLOUT_HEAD.exec(content);
      const kind = head ? CALLOUT_ALIASES[(head[1] ?? "").toLowerCase()] : undefined;
      if (head && kind) {
        const prefix = text.slice(0, text.indexOf(">") + 1);
        const title = (head[2] ?? "").trim();
        const name = title
          ? portableInline(title)
          : ALERT_SAYS_IT.has(kind)
            ? ""
            : CALLOUT_LABELS[kind];
        const alert = `${prefix} [!${GFM_ALERT[kind]}]`;
        return name ? `${alert}\n${prefix} **${name}**` : alert;
      }
    }
    return portableInline(text);
  });
}

const INK_BY_HEX = new Map(NOTE_COLORS.map((c) => [NOTE_INK_HEX[c].toLowerCase(), c]));
const HIGHLIGHT_BY_HEX = new Map(NOTE_COLORS.map((c) => [NOTE_HIGHLIGHT_HEX[c].toLowerCase(), c]));

/** Innermost first: the content holds no tag, so nested marks unwind one level per pass. */
const SPAN_COLOR = /<span style="color: ?(#[0-9a-f]{6});?">([^<>\n]{0,1000})<\/span>/gi;
const MARK_BACKGROUND =
  /<mark style="background(?:-color)?: ?(#[0-9a-f]{6});?">([^<>\n]{0,1000})<\/mark>/gi;
const MARK_PLAIN = /<mark>([^<>\n]{0,1000})<\/mark>/gi;

/** One stretch of prose (no inline code) with the export's HTML marks read back. */
function unwindMarks(text: string): string {
  let current = text;
  for (let pass = 0; pass < 8; pass += 1) {
    const next = current
      .replace(SPAN_COLOR, (all, hex: string, label: string) => {
        const color = INK_BY_HEX.get(hex.toLowerCase());
        return color ? `[${label}]{${color}}` : all;
      })
      .replace(MARK_BACKGROUND, (all, hex: string, label: string) => {
        const color = HIGHLIGHT_BY_HEX.get(hex.toLowerCase());
        return color ? `[${label}]{fond-${color}}` : all;
      })
      .replace(MARK_PLAIN, "==$1==");
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * An imported .md back in the workspace's own markdown: the HTML marks the
 * export writes become colours and highlights again, and GitHub's CAUTION
 * alert, red like the workspace's danger, becomes one. Code is untouched.
 */
export function fromPortableMarkdown(markdown: string): string {
  return mapProseLines(markdown, (text, opensQuote) => {
    let line = text;
    if (opensQuote) line = line.replace(/^( {0,3}>\s?)\[!caution\]/i, "$1[!danger]");
    // Odd pieces are inline code spans: left as they are.
    return line
      .split(/(`[^`\n]+`)/)
      .map((piece, k) => (k % 2 === 1 ? piece : unwindMarks(piece)))
      .join("");
  });
}
