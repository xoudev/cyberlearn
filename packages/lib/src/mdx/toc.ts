import { trimHyphens } from "../slug.js";

export interface TocEntry {
  level: 1 | 2 | 3;
  text: string;
  id: string;
}

function slugify(text: string): string {
  const collapsed = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (é → e, à → a)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return trimHyphens(collapsed);
}

/**
 * Extracts h1/h2/h3 headings from raw MDX/Markdown source.
 * Used to render a table of contents in the lesson sidebar.
 * Simple regex approach - suitable for author-controlled lesson content.
 *
 * A heading is one line: the gap after the hashes is spaces or tabs, and the
 * text stops at the line's end. With `\s+` the gap could run over line
 * breaks, which made a heading out of "#" and the paragraph under it, and let
 * a long run of blank lines be scanned again from each of them.
 */
export function extractToc(mdx: string): TocEntry[] {
  const headingRegex = /^(#{1,3})[ \t]+([^\n]+)$/gm;
  const entries: TocEntry[] = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(mdx)) !== null) {
    const rawLevel = match[1]?.length ?? 2;
    const text = (match[2] ?? "").trim();
    const level = (rawLevel > 3 ? 3 : rawLevel < 1 ? 1 : rawLevel) as 1 | 2 | 3;
    entries.push({ level, text, id: slugify(text) });
  }

  return entries;
}
