/** One section of a lesson, and where it starts in the lesson's MDX. */
export interface MdxSection {
  source: string;
  /** The 1-based line of the lesson on which the section's first character sits. */
  line: number;
}

/**
 * Splits MDX source into per-section strings, cutting at every h2 (`## `) heading.
 * Content before the first h2 is prepended to section 0.
 * Falls back to a single section when no h2 headings exist - admins just write normal Markdown.
 */
export function splitMdxSections(mdx: string): string[] {
  return splitMdxSectionsAt(mdx).map((section) => section.source);
}

/**
 * The same cut, with the line each section starts on: the check reads a lesson
 * section by section, and an error in the fourth one is reported at its line in
 * the whole lesson, which is where the author's editor is.
 *
 * Each section is a contiguous slice of the MDX: the chunks the split leaves
 * partition the text, and the only one ever dropped, a blank start, precedes
 * everything kept.
 */
export function splitMdxSectionsAt(mdx: string): MdxSection[] {
  const chunks = mdx.split(/^(?=## )/m);
  const sections: MdxSection[] = [];
  let prefix = "";
  let prefixLine = -1;
  // The line each chunk starts on, counted as the chunks go by: counting from
  // the top for every section made a long lesson quadratic to split.
  let line = 1;

  for (const chunk of chunks) {
    const start = line;
    line += newlinesIn(chunk);
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("## ")) {
      sections.push({ source: prefix + chunk, line: prefixLine === -1 ? start : prefixLine });
      prefix = "";
      prefixLine = -1;
    } else {
      if (prefixLine === -1) prefixLine = start;
      prefix += chunk;
    }
  }

  return sections.length === 0 ? [{ source: mdx, line: 1 }] : sections;
}

function newlinesIn(text: string): number {
  let count = 0;
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) count++;
  return count;
}
