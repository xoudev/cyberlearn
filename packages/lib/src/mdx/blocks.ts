import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { attributeValue, type MdNode } from "./attributes.js";
import { protectPropIndentation } from "./indentation.js";
import { isLessonComponentName } from "./names.js";

/**
 * A lesson as a list of blocks, and back.
 *
 * The block editor shows a lesson as what it is made of: headings, stretches
 * of Markdown, and components with their props laid out as fields. It does
 * not keep a second representation of the lesson: the MDX is the lesson, and
 * this file cuts it into blocks and joins them again. Each block carries the
 * source it was cut from, so a block the author did not touch goes back as it
 * was, byte for byte; only a block edited in a form is written out anew, in
 * one canonical shape.
 *
 * The cut follows the syntax tree the MDX parser builds (the same parser the
 * page compiles with), never a regular expression: a `<Quiz` inside a fenced
 * code block is text, and the parser knows it. Attribute values are read off
 * the tree without running anything, as the quiz extractor reads them.
 *
 * On its own subpath (@cyberlearn/lib/mdx-blocks): it pulls in the MDX parser,
 * and the mobile app imports @cyberlearn/lib.
 */

export interface HeadingBlock {
  kind: "heading";
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  /** The heading's text as written, inline Markdown included. */
  text: string;
  source: string;
}

export interface TextBlock {
  kind: "text";
  /** Markdown: one or more paragraphs, lists, code fences, tables, quotes. */
  source: string;
}

export interface ComponentBlock {
  kind: "component";
  name: string;
  /** Whether the pipeline draws this name (LESSON_COMPONENT_NAMES). */
  known: boolean;
  /** The attributes as written; one whose braces compute a value is absent. */
  attrs: Record<string, unknown>;
  /** What sits between the tags, trimmed; null for a self-closing element. */
  inner: string | null;
  source: string;
}

export type LessonBlock = HeadingBlock | TextBlock | ComponentBlock;

export type ParsedBlocks = { ok: true; blocks: LessonBlock[] } | { ok: false; error: string };

interface Positioned extends MdNode {
  depth?: number;
  position?: { start: { offset?: number }; end: { offset?: number } };
}

const processor = createProcessor({ remarkPlugins: [remarkGfm] });

function offsets(node: Positioned): [number, number] | null {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? null : [start, end];
}

function attributesOf(node: MdNode): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const attribute of node.attributes ?? []) {
    const attr = attribute as { type?: string; name?: string };
    if (attr.type === "mdxJsxAttribute" && typeof attr.name === "string") {
      const value = attributeValue(attribute);
      if (value !== undefined) attrs[attr.name] = value;
    }
  }
  return attrs;
}

/** The source between the tags: from the first child's start to the last child's end. */
function innerOf(node: Positioned, mdx: string): string | null {
  const children = (node.children ?? []) as Positioned[];
  const first = children[0];
  const last = children[children.length - 1];
  if (!first || !last) return null;
  const from = offsets(first);
  const to = offsets(last);
  if (!from || !to) return null;
  return mdx.slice(from[0], to[1]).trim();
}

/** The components at the root of a tree, in order. */
function rootComponents(root: Positioned): Positioned[] {
  return ((root.children ?? []) as Positioned[]).filter(
    (child) => child.type === "mdxJsxFlowElement" && typeof child.name === "string",
  );
}

/**
 * Cuts `mdx` into blocks. Fails, with the parser's message, on MDX that does
 * not parse: the editor then stays on the code, where the error can be fixed.
 *
 * Parsed twice. The source as written gives every block its text and its
 * place. The attributes are read from the source with its prop indentation
 * protected (see protectPropIndentation): MDX strips the leading whitespace
 * of a multi-line prop, and a playground's code would come back to the form
 * with its indentation gone, as it reaches the page without that guard.
 */
export function parseLessonBlocks(mdx: string): ParsedBlocks {
  let root: Positioned;
  let protectedRoot: Positioned;
  try {
    root = processor.parse(mdx) as unknown as Positioned;
    protectedRoot = processor.parse(protectPropIndentation(mdx)) as unknown as Positioned;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  // Protection changes nothing but characters inside tags, so the two trees
  // hold the same components in the same order.
  const protectedComponents = rootComponents(protectedRoot);
  const sameShape = protectedComponents.length === rootComponents(root).length;
  let componentIndex = 0;

  const blocks: LessonBlock[] = [];
  let text: [number, number] | null = null;
  const flushText = (): void => {
    if (text === null) return;
    const source = mdx.slice(text[0], text[1]).trim();
    if (source !== "") blocks.push({ kind: "text", source });
    text = null;
  };

  for (const child of (root.children ?? []) as Positioned[]) {
    const span = offsets(child);
    if (!span) continue;
    const source = mdx.slice(span[0], span[1]).trim();

    if (child.type === "heading" && /^#{1,6}\s/.test(source)) {
      flushText();
      const depth = Math.min(Math.max(child.depth ?? 2, 1), 6) as HeadingBlock["depth"];
      blocks.push({
        kind: "heading",
        depth,
        text: source.replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, ""),
        source,
      });
      continue;
    }

    if (child.type === "mdxJsxFlowElement" && typeof child.name === "string") {
      flushText();
      const withIndentation = sameShape ? protectedComponents[componentIndex] : undefined;
      componentIndex += 1;
      blocks.push({
        kind: "component",
        name: child.name,
        known: isLessonComponentName(child.name),
        attrs: attributesOf(withIndentation ?? child),
        inner: innerOf(child, mdx),
        source,
      });
      continue;
    }

    // Markdown of any kind, imports and exports included (the pipeline drops
    // those, but they are the author's text until then): grouped with its
    // neighbours into one stretch.
    text = text === null ? span : [text[0], span[1]];
  }
  flushText();

  return { ok: true, blocks };
}

/** The blocks joined again: one blank line between them, a newline at the end. */
export function serializeLessonBlocks(blocks: readonly LessonBlock[]): string {
  const sources = blocks.map((block) => block.source.trim()).filter((source) => source !== "");
  return sources.length === 0 ? "" : `${sources.join("\n\n")}\n`;
}

// ── Writing a block out ───────────────────────────────────────────────────────

export function headingSource(depth: HeadingBlock["depth"], text: string): string {
  return `${"#".repeat(depth)} ${text.trim()}`;
}

/** Turns `\\`, backticks and `${` into what a template literal reads back as them. */
function templateLiteral(value: string): string {
  return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\``;
}

/**
 * One attribute as the lesson writes it, or null for a value left out
 * (undefined, null, an empty optional string). A one-line string goes between
 * quotes; one with a newline or a quote goes between backticks, where the
 * page reads it back whole; everything else is a JavaScript literal.
 */
export function attributeSource(name: string, value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    if (!value.includes('"') && !value.includes("\n")) return `${name}="${value}"`;
    return `${name}={${templateLiteral(value)}}`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `${name}={${String(value)}}`;
  }
  return `${name}={${JSON.stringify(value)}}`;
}

/**
 * A component as the lesson writes it: one attribute per line when there is
 * more than one, the children (`inner`) between the tags, a self-closing tag
 * without them. Attributes come out in the order of `attrs`, so a form lays
 * them out as the guide does.
 */
export function componentSource(
  name: string,
  attrs: Readonly<Record<string, unknown>>,
  inner: string | null,
): string {
  const parts = Object.entries(attrs)
    .map(([key, value]) => attributeSource(key, value))
    .filter((part): part is string => part !== null);
  const opening =
    parts.length <= 1
      ? `<${name}${parts.length === 1 ? ` ${parts[0] ?? ""}` : ""}`
      : `<${name}\n${parts.map((part) => `  ${part}`).join("\n")}\n`;
  const trimmedInner = inner?.trim() ?? "";
  if (trimmedInner === "") return `${opening}${parts.length <= 1 ? " " : ""}/>`;
  return `${opening}>\n${trimmedInner}\n</${name}>`;
}
