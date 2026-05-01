/**
 * Splits MDX source into per-section strings, cutting at every h2 (`## `) heading.
 * Content before the first h2 is prepended to section 0.
 * Falls back to a single section when no h2 headings exist — admins just write normal Markdown.
 */
export declare function splitMdxSections(mdx: string): string[];
//# sourceMappingURL=split-sections.d.ts.map
