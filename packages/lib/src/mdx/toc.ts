export interface TocEntry {
  level: 1 | 2 | 3;
  text: string;
  id: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (é → e, à → a)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extracts h1/h2/h3 headings from raw MDX/Markdown source.
 * Used to render a table of contents in the lesson sidebar.
 * Simple regex approach — suitable for author-controlled lesson content.
 */
export function extractToc(mdx: string): TocEntry[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
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
