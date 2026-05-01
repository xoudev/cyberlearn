export interface TocEntry {
  level: 1 | 2 | 3;
  text: string;
  id: string;
}
/**
 * Extracts h1/h2/h3 headings from raw MDX/Markdown source.
 * Used to render a table of contents in the lesson sidebar.
 * Simple regex approach — suitable for author-controlled lesson content.
 */
export declare function extractToc(mdx: string): TocEntry[];
//# sourceMappingURL=toc.d.ts.map
