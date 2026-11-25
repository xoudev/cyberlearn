import React from "react";
import Link from "next/link";
import {
  CALLOUT_LABELS,
  parseRichMarkdown,
  type RichBlock,
  type RichInline,
  type RichList,
  type RichLines,
} from "@cyberlearn/lib/notes/rich-markdown";
import { RichCodeBlock } from "@/components/notes/rich-code-block";

/**
 * Draws the notes workspace's markdown (@cyberlearn/lib/notes/rich-markdown)
 * as React elements. All text goes through React, which escapes it: no
 * dangerouslySetInnerHTML, so a note cannot inject markup. Styling comes from
 * the `.rnote` wrapper the caller puts around it (notes/rich-note.css).
 */

export interface RichRenderOptions {
  /**
   * Where a [[link]] goes: a note's address, or null when no note has that
   * title (drawn as a dangling link the reader can create).
   */
  resolveLink?: ((target: string) => string | null) | undefined;
  /**
   * Opens a [[link]] whose note exists, in place (the workspace selects it
   * without leaving the page). Without it, the link is an ordinary one.
   */
  onOpenLink?: ((target: string) => void) | undefined;
  /** Called with a dangling [[link]]'s title, to create that note. */
  onCreateLink?: ((target: string) => void) | undefined;
  /** Called with a task item's source line when its box is ticked. */
  onToggleTask?: ((line: number) => void) | undefined;
}

function renderInline(
  nodes: readonly RichInline[],
  keyBase: string,
  opts: RichRenderOptions,
): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyBase}-${String(i)}`;
    switch (node.kind) {
      case "text":
        return <React.Fragment key={key}>{node.text}</React.Fragment>;
      case "code":
        return <code key={key}>{node.text}</code>;
      case "strong":
        return <strong key={key}>{renderInline(node.children, key, opts)}</strong>;
      case "em":
        return <em key={key}>{renderInline(node.children, key, opts)}</em>;
      case "strike":
        return <s key={key}>{renderInline(node.children, key, opts)}</s>;
      case "mark":
        return node.background ? (
          <mark key={key} className={`rnote-bg rnote-bg--${node.color}`}>
            {renderInline(node.children, key, opts)}
          </mark>
        ) : (
          <span key={key} className={`rnote-fg rnote-fg--${node.color}`}>
            {renderInline(node.children, key, opts)}
          </span>
        );
      case "link":
        return (
          <a key={key} href={node.href} target="_blank" rel="noopener noreferrer">
            {renderInline(node.children, key, opts)}
          </a>
        );
      case "wikilink": {
        const href = opts.resolveLink?.(node.target) ?? null;
        const open = opts.onOpenLink;
        if (href && open) {
          return (
            <a
              key={key}
              href={href}
              className="rnote-wikilink"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                open(node.target);
              }}
            >
              {node.label}
            </a>
          );
        }
        if (href) {
          return (
            <Link key={key} href={href} className="rnote-wikilink" scroll={false}>
              {node.label}
            </Link>
          );
        }
        const create = opts.onCreateLink;
        return create ? (
          <button
            key={key}
            type="button"
            className="rnote-wikilink rnote-wikilink--missing"
            title={`Créer la note « ${node.target} »`}
            onClick={() => {
              create(node.target);
            }}
          >
            {node.label}
          </button>
        ) : (
          <span key={key} className="rnote-wikilink rnote-wikilink--missing">
            {node.label}
          </span>
        );
      }
    }
  });
}

function renderLines(lines: RichLines, key: string, opts: RichRenderOptions): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, idx) => {
    if (idx > 0) nodes.push(<br key={`${key}-br${String(idx)}`} />);
    nodes.push(
      <React.Fragment key={`${key}-t${String(idx)}`}>
        {renderInline(line, `${key}-t${String(idx)}`, opts)}
      </React.Fragment>,
    );
  });
  return nodes;
}

function renderList(list: RichList, key: string, opts: RichRenderOptions): React.ReactNode {
  const items = list.items.map((item, i) => {
    const itemKey = `${key}-i${String(i)}`;
    const body = renderInline(item.children, itemKey, opts);
    const sub = item.sublist ? renderList(item.sublist, `${itemKey}-s`, opts) : null;
    if (item.checked === null) {
      return (
        <li key={itemKey}>
          {body}
          {sub}
        </li>
      );
    }
    const toggle = opts.onToggleTask;
    return (
      <li key={itemKey} className={`rnote-task${item.checked ? " is-done" : ""}`}>
        <CheckBox
          checked={item.checked}
          disabled={!toggle}
          label={item.checked ? "Marquer comme à faire" : "Marquer comme fait"}
          onChange={() => {
            toggle?.(item.line);
          }}
        />
        <span>{body}</span>
        {sub}
      </li>
    );
  });
  const hasTasks = list.items.some((item) => item.checked !== null);
  const className = hasTasks ? "rnote-tasks" : undefined;
  return list.ordered ? (
    <ol key={key} start={list.start === 1 ? undefined : list.start} className={className}>
      {items}
    </ol>
  ) : (
    <ul key={key} className={className}>
      {items}
    </ul>
  );
}

/**
 * A task's box. The input is the control (focus, keyboard, screen readers)
 * but invisible; the square beside it is what is drawn, the same size and
 * place ticked or not, so ticking changes a colour and nothing moves.
 */
export function CheckBox({
  checked,
  disabled = false,
  label,
  onChange,
  className = "rnote-check",
}: {
  checked: boolean;
  disabled?: boolean | undefined;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string | undefined;
}): React.JSX.Element {
  return (
    <span className={className}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={onChange}
      />
      <span className="rnote-check__box" aria-hidden="true">
        <svg viewBox="0 0 12 12" focusable="false">
          <path d="M2.2 6.4 4.9 9 9.8 3.2" />
        </svg>
      </span>
    </span>
  );
}

const HEADING_TAG = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

function renderBlock(block: RichBlock, key: string, opts: RichRenderOptions): React.ReactNode {
  switch (block.kind) {
    case "code":
      return <RichCodeBlock key={key} lang={block.lang} code={block.text} />;
    case "hr":
      return <hr key={key} />;
    case "heading": {
      const Tag = HEADING_TAG[block.level];
      return (
        <Tag key={key} id={block.slug ? `n-${block.slug}` : undefined}>
          {renderInline(block.children, key, opts)}
        </Tag>
      );
    }
    case "quote":
      return <blockquote key={key}>{renderLines(block.lines, key, opts)}</blockquote>;
    case "callout":
      return (
        <aside
          key={key}
          className={`rnote-callout rnote-callout--${block.variant}`}
          aria-label={CALLOUT_LABELS[block.variant]}
        >
          <p className="rnote-callout__title">{renderInline(block.title, `${key}-t`, opts)}</p>
          {block.lines.length > 0 ? <p>{renderLines(block.lines, key, opts)}</p> : null}
        </aside>
      );
    case "list":
      return renderList(block, key, opts);
    case "table":
      return (
        <div key={key} className="rnote-table">
          <table>
            <thead>
              <tr>
                {block.header.map((cell, c) => (
                  <th
                    key={`${key}-h${String(c)}`}
                    style={{ textAlign: block.align[c] ?? undefined }}
                  >
                    {renderInline(cell, `${key}-h${String(c)}`, opts)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={`${key}-r${String(r)}`}>
                  {row.map((cell, c) => (
                    <td
                      key={`${key}-r${String(r)}c${String(c)}`}
                      style={{ textAlign: block.align[c] ?? undefined }}
                    >
                      {renderInline(cell, `${key}-r${String(r)}c${String(c)}`, opts)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "flashcard":
      return (
        <div key={key} className="rnote-card">
          <span className="rnote-card__label">Carte</span>
          <p className="rnote-card__front">{renderInline(block.front, `${key}-f`, opts)}</p>
          <p className="rnote-card__back">{renderInline(block.back, `${key}-b`, opts)}</p>
        </div>
      );
    case "paragraph":
      return <p key={key}>{renderLines(block.lines, key, opts)}</p>;
  }
}

/** Render workspace markdown into React nodes. */
export function renderRichNote(markdown: string, opts: RichRenderOptions = {}): React.ReactNode {
  return parseRichMarkdown(markdown).map((block, i) => renderBlock(block, `b${String(i)}`, opts));
}

/** The rendered note in its styled wrapper. */
export function RichNote({
  markdown,
  className,
  ...opts
}: RichRenderOptions & { markdown: string; className?: string | undefined }): React.JSX.Element {
  return (
    <div className={className ? `rnote ${className}` : "rnote"}>
      {renderRichNote(markdown, opts)}
    </div>
  );
}
