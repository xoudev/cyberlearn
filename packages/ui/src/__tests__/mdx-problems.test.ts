import { describe, expect, it } from "vitest";
import { inLessonOrder, problemMarkers } from "../components/mdx-problems";

/**
 * A problem the site found becomes a marker under the text it points at, on
 * the text as it is now: the author may have typed since it was found.
 */

const TEXT = ["## Une section", "", '<Quiz correct={True} options={["a", "b"]} />'];
const lineOf = (line: number): string => TEXT[line - 1] ?? "";

describe("problemMarkers", () => {
  it("underlines the run of characters the problem starts on", () => {
    expect(problemMarkers([{ line: 3, column: 16, message: "True" }], TEXT.length, lineOf)).toEqual(
      [{ startLineNumber: 3, startColumn: 16, endLineNumber: 3, endColumn: 21, message: "True" }],
    );
  });

  it("keeps one character for a problem on a space or past the end of its line", () => {
    const [onSpace, pastEnd] = problemMarkers(
      [
        { line: 3, column: 6, message: "espace" },
        { line: 1, column: 99, message: "fin" },
      ],
      TEXT.length,
      lineOf,
    );
    expect(onSpace).toMatchObject({ startColumn: 6, endColumn: 7 });
    expect(pastEnd).toMatchObject({ startLineNumber: 1, startColumn: 15, endColumn: 16 });
  });

  it("moves a problem past the last line, found before lines were removed, to the last", () => {
    const [marker] = problemMarkers([{ line: 40, column: 1, message: "x" }], TEXT.length, lineOf);
    expect(marker).toMatchObject({ startLineNumber: 3, startColumn: 1 });
  });

  it("has nothing to mark in an empty model", () => {
    expect(problemMarkers([{ line: 1, column: 1, message: "x" }], 0, lineOf)).toEqual([]);
  });
});

describe("inLessonOrder", () => {
  it("lists the problems from the top of the lesson down", () => {
    const listed = inLessonOrder([
      { line: 9, column: 1, message: "c" },
      { line: 2, column: 8, message: "b" },
      { line: 2, column: 3, message: "a" },
    ]);
    expect(listed.map((p) => p.message)).toEqual(["a", "b", "c"]);
  });
});
