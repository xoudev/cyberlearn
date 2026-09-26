/**
 * The outline of a lesson for the dashboard's "reprendre" card: the titles of
 * its sections, taken from the lesson itself. The card used to show one fixed
 * SQL-injection snippet whatever the lesson, so a cryptography lesson was
 * previewed with somebody else's code.
 *
 * Section titles are the `## ` headings. A `#` line inside a fenced code block
 * is a shell or Python comment, not a heading, and is skipped.
 */
export function lessonOutline(mdx: string, max = 4): string[] {
  const titles: string[] = [];
  let fenced = false;
  for (const line of mdx.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    const title = heading?.[1]?.trim();
    if (title) titles.push(title);
    if (titles.length === max) break;
  }
  return titles;
}
