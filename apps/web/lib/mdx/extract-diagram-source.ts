import React from "react";

/**
 * Block-level tags that stood on their own line in the MDX source. Anything
 * else (em, strong, a, code, span…) was inline, so its text belongs on the
 * line it was found in.
 */
const BLOCK_TAGS = new Set([
  "p",
  "div",
  "pre",
  "blockquote",
  "li",
  "ul",
  "ol",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "tr",
]);

/**
 * Rebuilds the diagram source from the React tree MDX produces for the children
 * of `<Diagram>`.
 *
 * MDX parses those children as markdown, so the source never arrives as one
 * clean string. `A[Doc](ref)` becomes a link element, `*mot*` becomes an `em`,
 * `<br/>` becomes a real `br` node, and each paragraph is its own `p`.
 *
 * The previous implementation joined every array of children with "\n", which
 * inserted line breaks in the middle of a line as soon as markdown produced any
 * inline element: `A[Doc](ref) --> B` came out as three lines, and a label
 * written `A[Ligne 1<br/>Ligne 2]` lost its break entirely. Mermaid is lenient
 * enough not to always throw, so the result was a silently mangled diagram.
 *
 * Inline children are therefore concatenated, a newline is emitted only when a
 * block element ends, and `br` is restored to the literal `<br/>` mermaid
 * expects inside a label.
 */
export function extractDiagramSource(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(extractDiagramSource).join("");
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.type === "br") return "<br/>";
    const inner = extractDiagramSource(element.props.children);
    return typeof element.type === "string" && BLOCK_TAGS.has(element.type) ? `${inner}\n` : inner;
  }
  return "";
}
