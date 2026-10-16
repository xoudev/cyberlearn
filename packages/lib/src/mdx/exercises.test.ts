import { describe, expect, it } from "vitest";
import { LINUX_TERMINAL_DEFAULT_TITLE, terminalExerciseKey } from "../exercises/keys.js";
import { extractLessonExercises, lessonHasExercise } from "./exercises.js";

/**
 * The exercises a lesson pays for, read from its MDX on the server: the page
 * says an exercise is done, the lesson says which exercises there are.
 */

const LESSON = [
  "---",
  "title: Une leçon",
  "---",
  "## Le terminal",
  "",
  '<LinuxTerminal id="ranger" title="Ranger un dossier" expectedCommands={["mkdir docs"]} />',
  "",
  '<LinuxTerminal title="Trier les logs" expectedCommands={["sort app.log"]} />',
  "",
  '<LinuxTerminal expectedCommands={["ls"]} />',
  "",
  "## Python",
  "",
  "<LabStack>",
  '  <PythonChallenge id="py-1" title="Somme" tests={[{ input: "solution(1)", expected: "1" }]} />',
  "</LabStack>",
  "",
  '<Quiz id="q-1" question="?" options={["a", "b"]} correct={0} />',
].join("\n");

describe("extractLessonExercises", () => {
  it("lists each exercise under the key the page records it with, nested ones too", () => {
    expect(extractLessonExercises(LESSON)).toEqual([
      { kind: "TERMINAL", key: "ranger" },
      { kind: "TERMINAL", key: "Trier les logs" },
      { kind: "TERMINAL", key: LINUX_TERMINAL_DEFAULT_TITLE },
      { kind: "PYTHON", key: "py-1" },
    ]);
  });

  it("skips a challenge without an id: nothing could record it", () => {
    expect(extractLessonExercises('<PythonChallenge title="Sans id" tests={[]} />')).toEqual([]);
  });

  it("finds nothing in a lesson that does not parse", () => {
    expect(extractLessonExercises("<LinuxTerminal id=")).toEqual([]);
  });

  it("agrees with the page on a terminal's key", () => {
    expect(terminalExerciseKey("ranger", "Ranger un dossier")).toBe("ranger");
    expect(terminalExerciseKey(undefined, "Trier les logs")).toBe("Trier les logs");
    expect(terminalExerciseKey(undefined, undefined)).toBe(LINUX_TERMINAL_DEFAULT_TITLE);
  });
});

describe("lessonHasExercise", () => {
  it("knows the lesson's exercises, by kind", () => {
    expect(lessonHasExercise(LESSON, "PYTHON", "py-1")).toBe(true);
    expect(lessonHasExercise(LESSON, "TERMINAL", "Trier les logs")).toBe(true);
    // The same key under the other kind is not that exercise.
    expect(lessonHasExercise(LESSON, "TERMINAL", "py-1")).toBe(false);
  });

  it("refuses a made-up identifier, and a quiz's", () => {
    expect(lessonHasExercise(LESSON, "PYTHON", "a1")).toBe(false);
    expect(lessonHasExercise(LESSON, "PYTHON", "q-1")).toBe(false);
  });
});
