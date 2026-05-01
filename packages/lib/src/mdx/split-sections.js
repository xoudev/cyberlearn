"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitMdxSections = splitMdxSections;
/**
 * Splits MDX source into per-section strings, cutting at every h2 (`## `) heading.
 * Content before the first h2 is prepended to section 0.
 * Falls back to a single section when no h2 headings exist — admins just write normal Markdown.
 */
function splitMdxSections(mdx) {
  const chunks = mdx.split(/^(?=## )/m);
  const sections = [];
  let prefix = "";
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("## ")) {
      sections.push(prefix + chunk);
      prefix = "";
    } else {
      prefix += chunk;
    }
  }
  return sections.length === 0 ? [mdx] : sections;
}
//# sourceMappingURL=split-sections.js.map
