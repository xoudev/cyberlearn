import React from "react";

/**
 * A tiny, dependency-free markdown renderer for user notes. Notes are plain
 * GFM-ish markdown (NOT MDX), so we cannot reuse the lesson MDX pipeline, which
 * would choke on bare `<` / `{` in free text. Output is built as React elements,
 * so all text is escaped by React (no dangerouslySetInnerHTML, no XSS). Styling
 * is applied by the caller via a `.note-md` wrapper.
 *
 * Supported: fenced code blocks, ATX headings, blockquotes, unordered and
 * ordered lists, horizontal rules, paragraphs (with soft line breaks) and the
 * inline set bold / italic / inline-code / links (http, https, mailto only).
 */

const SAFE_LINK = /^(https?:|mailto:)/i;

/** Parse inline markdown in `text` into React nodes. */
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = "";
  let i = 0;
  let k = 0;
  const flush = (): void => {
    if (buf) {
      out.push(buf);
      buf = "";
    }
  };
  const push = (node: React.ReactNode): void => {
    flush();
    out.push(<React.Fragment key={`${keyBase}-${String(k++)}`}>{node}</React.Fragment>);
  };

  while (i < text.length) {
    const rest = text.slice(i);

    // Inline code: literal, no nested parsing.
    if (rest.startsWith("`")) {
      const end = rest.indexOf("`", 1);
      if (end > 0) {
        push(<code>{rest.slice(1, end)}</code>);
        i += end + 1;
        continue;
      }
    }

    // Link: [text](url) with a safe scheme, else fall through to plain text.
    // Label/URL lengths are bounded so a long run of unmatched "[" cannot make
    // [^\]] backtrack to end-of-string at every position (O(n^2) on the input).
    if (rest.startsWith("[")) {
      const m = /^\[([^\]\n]{1,300})\]\(([^)\s]{1,2000})\)/.exec(rest);
      if (m && SAFE_LINK.test(m[2] ?? "")) {
        const label = m[1] ?? "";
        const href = m[2] ?? "";
        push(
          <a href={href} target="_blank" rel="noopener noreferrer">
            {renderInline(label, `${keyBase}-l${String(k)}`)}
          </a>,
        );
        i += m[0].length;
        continue;
      }
    }

    // Bold: ** or __ (checked before italic so the longer delimiter wins).
    const bold = /^(\*\*|__)([\s\S]+?)\1/.exec(rest);
    if (bold) {
      push(<strong>{renderInline(bold[2] ?? "", `${keyBase}-b${String(k)}`)}</strong>);
      i += bold[0].length;
      continue;
    }

    // Italic: single * or _.
    const italic = /^(\*|_)([\s\S]+?)\1/.exec(rest);
    if (italic) {
      push(<em>{renderInline(italic[2] ?? "", `${keyBase}-i${String(k)}`)}</em>);
      i += italic[0].length;
      continue;
    }

    buf += text[i] ?? "";
    i += 1;
  }
  flush();
  return out;
}

/** Join paragraph lines with soft <br /> breaks. */
function renderParagraph(lines: string[], key: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, idx) => {
    if (idx > 0) nodes.push(<br key={`${key}-br${String(idx)}`} />);
    nodes.push(
      <React.Fragment key={`${key}-t${String(idx)}`}>
        {renderInline(line, `${key}-t${String(idx)}`)}
      </React.Fragment>,
    );
  });
  return <p key={key}>{nodes}</p>;
}

const HR = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const isFence = (s: string): boolean => s.startsWith("```");
const QUOTE = /^>\s?(.*)$/;
const UL = /^\s*[-*+]\s+(.*)$/;
const OL = /^\s*\d+\.\s+(.*)$/;

/** Render note markdown into React nodes. */
export function renderNoteMarkdown(markdown: string): React.ReactNode {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const nextKey = (): string => `b${String(key++)}`;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Blank line: block separator.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Fenced code block.
    if (isFence(line)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !isFence(lines[i] ?? "")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1; // consume the closing fence
      const k = nextKey();
      blocks.push(
        <pre key={k}>
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // Horizontal rule.
    if (HR.test(line)) {
      blocks.push(<hr key={nextKey()} />);
      i += 1;
      continue;
    }

    // Heading.
    const heading = HEADING.exec(line);
    if (heading) {
      const level = (heading[1] ?? "#").length;
      const k = nextKey();
      const content = renderInline(heading[2] ?? "", k);
      const Tag = `h${String(level)}` as keyof React.JSX.IntrinsicElements;
      blocks.push(<Tag key={k}>{content}</Tag>);
      i += 1;
      continue;
    }

    // Blockquote (consecutive `>` lines).
    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i] ?? "")) {
        quoted.push(QUOTE.exec(lines[i] ?? "")?.[1] ?? "");
        i += 1;
      }
      const k = nextKey();
      blocks.push(<blockquote key={k}>{renderParagraph(quoted, `${k}-q`)}</blockquote>);
      continue;
    }

    // Unordered list.
    if (UL.test(line)) {
      const items: string[] = [];
      while (i < lines.length && UL.test(lines[i] ?? "")) {
        items.push(UL.exec(lines[i] ?? "")?.[1] ?? "");
        i += 1;
      }
      const k = nextKey();
      blocks.push(
        <ul key={k}>
          {items.map((it, idx) => (
            <li key={`${k}-${String(idx)}`}>{renderInline(it, `${k}-${String(idx)}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list.
    if (OL.test(line)) {
      const items: string[] = [];
      while (i < lines.length && OL.test(lines[i] ?? "")) {
        items.push(OL.exec(lines[i] ?? "")?.[1] ?? "");
        i += 1;
      }
      const k = nextKey();
      blocks.push(
        <ol key={k}>
          {items.map((it, idx) => (
            <li key={`${k}-${String(idx)}`}>{renderInline(it, `${k}-${String(idx)}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph: consecutive lines until a blank line or a block starter.
    const para: string[] = [];
    while (i < lines.length) {
      const l = lines[i] ?? "";
      if (
        l.trim() === "" ||
        isFence(l) ||
        HR.test(l) ||
        HEADING.test(l) ||
        QUOTE.test(l) ||
        UL.test(l) ||
        OL.test(l)
      ) {
        break;
      }
      para.push(l);
      i += 1;
    }
    blocks.push(renderParagraph(para, nextKey()));
  }

  return blocks;
}
