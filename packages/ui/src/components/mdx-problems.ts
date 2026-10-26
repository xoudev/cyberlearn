/**
 * The problems the site finds in a draft, as the editor marks them.
 *
 * Each comes from the check the save runs (@cyberlearn/lib/mdx-check and
 * mdx-authoring), with its line and column in the lesson, both from 1, which
 * is how Monaco numbers them too. Kept apart from the panel, which pulls in
 * Monaco and next/dynamic, so that this can be tested on its own.
 */

/** A problem in the draft, where the editor shows it. */
export interface MdxProblem {
  line: number;
  column: number;
  message: string;
}

/** Monaco's IMarkerData, without the severity, which comes from Monaco itself. */
export interface ProblemMarker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
}

/** The owner of the markers the check sets, so that setting them again replaces only those. */
export const LESSON_CHECK_OWNER = "lesson-check";

/**
 * A marker for each problem, on the text as it is now.
 *
 * A problem was found in the text sent to the site, and the author may have
 * typed since: a line past the end goes to the last, a column past the end of
 * its line to that end. Each marker underlines the run of characters its
 * problem starts on (a word, a tag, `True`), at least one.
 */
export function problemMarkers(
  problems: readonly MdxProblem[],
  lineCount: number,
  lineContent: (line: number) => string,
): ProblemMarker[] {
  if (lineCount < 1) return [];
  return problems.map((problem) => {
    const line = Math.min(Math.max(1, Math.trunc(problem.line)), lineCount);
    const text = lineContent(line);
    const start = Math.min(Math.max(1, Math.trunc(problem.column)), text.length + 1);
    let end = start;
    while (end <= text.length && !/\s/.test(text.charAt(end - 1))) end++;
    return {
      startLineNumber: line,
      startColumn: start,
      endLineNumber: line,
      endColumn: Math.max(end, start + 1),
      message: problem.message,
    };
  });
}

/** The problems in the order of the lesson, for the list above the editor. */
export function inLessonOrder(problems: readonly MdxProblem[]): MdxProblem[] {
  return [...problems].sort((a, b) => a.line - b.line || a.column - b.column);
}
