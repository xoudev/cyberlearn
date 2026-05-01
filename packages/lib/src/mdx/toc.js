"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractToc = extractToc;
function slugify(text) {
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
function extractToc(mdx) {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const entries = [];
  let match;
  while ((match = headingRegex.exec(mdx)) !== null) {
    const rawLevel = match[1]?.length ?? 2;
    const text = (match[2] ?? "").trim();
    const level = rawLevel > 3 ? 3 : rawLevel < 1 ? 1 : rawLevel;
    entries.push({ level, text, id: slugify(text) });
  }
  return entries;
}
//# sourceMappingURL=toc.js.map
