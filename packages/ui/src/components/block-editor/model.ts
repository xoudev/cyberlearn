import {
  componentSource,
  headingSource,
  parseLessonBlocks,
  serializeLessonBlocks,
  type ComponentBlock,
  type HeadingBlock,
  type LessonBlock,
  type TextBlock,
} from "@cyberlearn/lib/mdx-blocks";
import { lessonComponent } from "@cyberlearn/lib/mdx-components";
import {
  componentForm,
  INNER,
  uniqueId,
  validateComponent,
  type ComponentForm,
  type FormErrors,
} from "@cyberlearn/lib/mdx-forms";

/**
 * What the block editor does to a list of blocks, with no React in it.
 *
 * Every operation returns a new list; the component holds the list in state
 * and writes the MDX out of it after each change (mdxOf). A block the author
 * does not touch keeps the source it was cut from; a block edited in a form
 * is written anew from its fields (updateComponent), in the order the form
 * lays them out, so the MDX reads as the guide writes it.
 */

export interface EditorBlock {
  /** Stable across edits, for React and for focus: not the block's position. */
  key: string;
  block: LessonBlock;
}

let counter = 0;
export function nextKey(): string {
  counter += 1;
  return `b${String(counter)}`;
}

export function toEditorBlocks(blocks: readonly LessonBlock[]): EditorBlock[] {
  return blocks.map((block) => ({ key: nextKey(), block }));
}

export function mdxOf(list: readonly EditorBlock[]): string {
  return serializeLessonBlocks(list.map((item) => item.block));
}

/** The blocks of `mdx`, or null when it does not parse (the editor then stays on the code). */
export function blocksOf(mdx: string): EditorBlock[] | null {
  const parsed = parseLessonBlocks(mdx);
  return parsed.ok ? toEditorBlocks(parsed.blocks) : null;
}

// ── The list ───────────────────────────────────────────────────────────────────

export function insertAt(
  list: readonly EditorBlock[],
  index: number,
  blocks: readonly LessonBlock[],
): EditorBlock[] {
  const at = Math.min(Math.max(index, 0), list.length);
  return [...list.slice(0, at), ...toEditorBlocks(blocks), ...list.slice(at)];
}

export function removeAt(list: readonly EditorBlock[], index: number): EditorBlock[] {
  return list.filter((_, i) => i !== index);
}

/** Moves the block at `from` by `by` places (-1 up, +1 down); a move off either end is no move. */
export function moveBy(list: readonly EditorBlock[], from: number, by: number): EditorBlock[] {
  const to = from + by;
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item) next.splice(to, 0, item);
  return next;
}

export function replaceAt(
  list: readonly EditorBlock[],
  index: number,
  block: LessonBlock,
): EditorBlock[] {
  return list.map((item, i) => (i === index ? { key: item.key, block } : item));
}

// ── One block ──────────────────────────────────────────────────────────────────

export function updateHeading(
  block: HeadingBlock,
  patch: Partial<Pick<HeadingBlock, "depth" | "text">>,
): HeadingBlock {
  const depth = patch.depth ?? block.depth;
  const text = patch.text ?? block.text;
  return { kind: "heading", depth, text, source: headingSource(depth, text) };
}

export function updateText(block: TextBlock, source: string): TextBlock {
  return { kind: "text", source };
}

/** The attributes in the form's order, then whatever the form does not know, as written. */
function orderedAttrs(
  form: ComponentForm | undefined,
  attrs: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  if (!form) return { ...attrs };
  const ordered: Record<string, unknown> = {};
  for (const field of form.fields) {
    if (field.key === INNER) continue;
    if (field.key in attrs) ordered[field.key] = attrs[field.key];
    if (field.kind === "choices" && field.correctKey in attrs) {
      ordered[field.correctKey] = attrs[field.correctKey];
    }
  }
  for (const [key, value] of Object.entries(attrs)) {
    if (!(key in ordered)) ordered[key] = value;
  }
  return ordered;
}

/** The block with these fields, its source written anew. An empty optional string is left out. */
export function updateComponent(
  block: ComponentBlock,
  attrs: Readonly<Record<string, unknown>>,
  inner: string | null,
): ComponentBlock {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === "") continue;
    cleaned[key] = value;
  }
  const ordered = orderedAttrs(componentForm(block.name), cleaned);
  const trimmedInner = inner === null || inner.trim() === "" ? null : inner;
  return {
    ...block,
    attrs: ordered,
    inner: trimmedInner,
    source: componentSource(block.name, ordered, trimmedInner),
  };
}

/** A component edited as text: its source is what the author typed, until the next parse. */
export function updateComponentSource(block: ComponentBlock, source: string): ComponentBlock {
  const parsed = parseLessonBlocks(source);
  const [first] = parsed.ok ? parsed.blocks : [];
  if (parsed.ok && parsed.blocks.length === 1 && first?.kind === "component") return first;
  return { ...block, source };
}

/** The blocks between a component's tags, for the forms that edit them as blocks. */
export function innerBlocks(block: ComponentBlock): EditorBlock[] {
  if (block.inner === null) return [];
  return blocksOf(block.inner) ?? [];
}

/** The errors of a component block, or null for a component without a form. */
export function componentErrors(block: ComponentBlock): FormErrors | null {
  const form = componentForm(block.name);
  if (!form) return null;
  const nested = innerBlocks(block).flatMap((item) =>
    item.block.kind === "component" ? [item.block.name] : [],
  );
  return validateComponent(form, block.attrs, block.inner, nested);
}

// ── New blocks ─────────────────────────────────────────────────────────────────

export function newHeading(depth: HeadingBlock["depth"], text: string): HeadingBlock {
  return { kind: "heading", depth, text, source: headingSource(depth, text) };
}

export function newText(source: string): TextBlock {
  return { kind: "text", source };
}

/** Every `id` the list's components carry, nested ones included. */
export function takenIds(list: readonly EditorBlock[]): Set<string> {
  const ids = new Set<string>();
  const visit = (blocks: readonly EditorBlock[]): void => {
    for (const { block } of blocks) {
      if (block.kind !== "component") continue;
      if (typeof block.attrs.id === "string") ids.add(block.attrs.id);
      visit(innerBlocks(block));
    }
  };
  visit(list);
  return ids;
}

/** The block with its ids, nested ones included, made unique against `taken`. */
function withFreshIds(block: ComponentBlock, taken: Set<string>): ComponentBlock {
  let next = block;
  if (typeof next.attrs.id === "string") {
    const id = uniqueId(next.attrs.id, taken);
    taken.add(id);
    if (id !== next.attrs.id) next = updateComponent(next, { ...next.attrs, id }, next.inner);
  }
  const nested = innerBlocks(next);
  if (nested.some((item) => item.block.kind === "component")) {
    const renamed = nested.map((item) =>
      item.block.kind === "component" ? withFreshIds(item.block, taken) : item.block,
    );
    const inner = serializeLessonBlocks(renamed).trimEnd();
    if (inner !== next.inner) next = updateComponent(next, next.attrs, inner);
  }
  return next;
}

/**
 * The blocks a guide snippet inserts: cut like a lesson, ids renamed past
 * the ones `taken`. A snippet that does not parse becomes a text block, so
 * nothing the author asked for is dropped.
 */
export function blocksFromSnippet(snippet: string, taken: ReadonlySet<string>): LessonBlock[] {
  const parsed = parseLessonBlocks(snippet);
  if (!parsed.ok) return [newText(snippet.trim())];
  const used = new Set(taken);
  return parsed.blocks.map((block) =>
    block.kind === "component" ? withFreshIds(block, used) : block,
  );
}

/** A fresh component, from the guide's first example of it; null for a name the guide lacks. */
export function newComponent(name: string, taken: ReadonlySet<string>): LessonBlock[] | null {
  const spec = lessonComponent(name);
  const example = spec?.examples[0];
  if (!example) return null;
  return blocksFromSnippet(example.snippet, taken);
}
