/**
 * The offset of a line and column in a text, both 1-based, for putting a
 * textarea's cursor where an error of the import says the problem is. A line
 * past the end lands at the end; a column past the line, at its end.
 */
export function offsetOfLine(text: string, line: number, column = 1): number {
  let offset = 0;
  for (let l = 1; l < line; l++) {
    const next = text.indexOf("\n", offset);
    if (next === -1) return text.length;
    offset = next + 1;
  }
  const end = text.indexOf("\n", offset);
  const lineEnd = end === -1 ? text.length : end;
  return Math.min(offset + Math.max(0, column - 1), lineEnd);
}
