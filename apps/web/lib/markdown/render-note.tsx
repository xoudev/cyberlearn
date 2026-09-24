import React from "react";
import {
  parseNoteMarkdown,
  type NoteInline,
  type NoteLines,
} from "@cyberlearn/lib/markdown/note-markdown";

/**
 * Renders user notes and forum posts. The parsing is shared with the app
 * (@cyberlearn/lib/markdown/note-markdown), so a post reads the same on both;
 * this only turns the tree into React elements. All text goes through React,
 * which escapes it (no dangerouslySetInnerHTML, no XSS). Styling is applied by
 * the caller via a `.note-md` wrapper.
 */

function renderInline(nodes: readonly NoteInline[], keyBase: string): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyBase}-${String(i)}`;
    switch (node.kind) {
      case "text":
        return <React.Fragment key={key}>{node.text}</React.Fragment>;
      case "code":
        return <code key={key}>{node.text}</code>;
      case "strong":
        return <strong key={key}>{renderInline(node.children, key)}</strong>;
      case "em":
        return <em key={key}>{renderInline(node.children, key)}</em>;
      case "link":
        return (
          <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">
            {renderInline(node.children, key)}
          </a>
        );
    }
  });
}

/** Join paragraph lines with soft <br /> breaks. */
function renderLines(lines: NoteLines, key: string): React.ReactNode {
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

const HEADING_TAG = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

/** Render note markdown into React nodes. */
export function renderNoteMarkdown(markdown: string): React.ReactNode {
  return parseNoteMarkdown(markdown).map((block, i) => {
    const key = `b${String(i)}`;
    switch (block.kind) {
      case "code":
        return (
          <pre key={key}>
            <code>{block.text}</code>
          </pre>
        );
      case "hr":
        return <hr key={key} />;
      case "heading": {
        const Tag = HEADING_TAG[block.level];
        return <Tag key={key}>{renderInline(block.children, key)}</Tag>;
      }
      case "quote":
        return <blockquote key={key}>{renderLines(block.lines, `${key}-q`)}</blockquote>;
      case "list": {
        const items = block.items.map((item, idx) => (
          <li key={`${key}-${String(idx)}`}>{renderInline(item, `${key}-${String(idx)}`)}</li>
        ));
        return block.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
      }
      case "paragraph":
        return renderLines(block.lines, key);
    }
  });
}
