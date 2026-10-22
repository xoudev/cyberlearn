import { describe, expect, it } from "vitest";
import { NO_RESUME, lessonResume, resumeLesson, sectionGates, type SectionGates } from "../resume";

/**
 * Where a lesson not finished opens again. It used to open on its first
 * section whatever the reader had done, with every section ahead shut in the
 * plan, and a Python challenge passed held its section shut once more.
 */

const gate = (quizIds: string[] = [], pythonIds: string[] = []): SectionGates => ({
  quizIds,
  pythonIds,
});
const set = (...ids: string[]): ReadonlySet<string> => new Set(ids);

describe("resumeLesson", () => {
  // Six sections, a quiz at the end of each but the third, which is text.
  const SIX: SectionGates[] = [
    gate(["q1"]),
    gate(["q2"]),
    gate(),
    gate(["q4"]),
    gate(["q5"]),
    gate(["q6"]),
  ];

  it("opens on the first section when nothing was done", () => {
    expect(resumeLesson(SIX, set(), set())).toEqual({
      step: 0,
      doneSteps: [],
      exercisesDone: [],
    });
  });

  it("lands on the section after the last quiz answered", () => {
    // q1 answered only: the reader went on to section 2, whose quiz is open.
    const resume = resumeLesson(SIX, set("q1"), set());
    expect(resume.step).toBe(1);
    expect(resume.doneSteps).toEqual([0]);
  });

  it("does not skip a text section that follows the last quiz answered", () => {
    // q1 and q2 answered: section 3 (text) comes next, then section 4, whose
    // quiz is open. Landing on 4 would skip text the reader may not have read.
    const resume = resumeLesson(SIX, set("q1", "q2"), set());
    expect(resume.step).toBe(2);
    expect(resume.doneSteps).toEqual([0, 1]);
  });

  it("goes on to the section of the next quiz once the quiz before it is answered", () => {
    const resume = resumeLesson(SIX, set("q1", "q2", "q4"), set());
    expect(resume.step).toBe(4);
    expect(resume.doneSteps).toEqual([0, 1, 2, 3]);
  });

  it("opens on the last section when every gate is open", () => {
    const resume = resumeLesson(SIX, set("q1", "q2", "q4", "q5", "q6"), set());
    expect(resume.step).toBe(5);
    expect(resume.doneSteps).toEqual([0, 1, 2, 3, 4]);
  });

  it("never goes past the first section still held shut", () => {
    // q1 and q5 answered: q2 is still open to answer, so the reader is at 2 at most.
    expect(resumeLesson(SIX, set("q1", "q5"), set()).step).toBe(1);
  });

  it("goes to the trailing text sections after the last gate, one section at a time", () => {
    const gates = [gate(["q1"]), gate(), gate()];
    expect(resumeLesson(gates, set("q1"), set()).step).toBe(1);
  });

  it("does not count an answer to a quiz the lesson no longer has", () => {
    expect(resumeLesson([gate(), gate()], set("gone"), set()).step).toBe(0);
  });

  it("holds a Python challenge passed as done, so its section is not held shut again", () => {
    const gates = [gate(["q1"]), gate(["q2"], ["py-1"]), gate(["q3"])];
    const resume = resumeLesson(gates, set("q1", "q2"), set("py-1"));
    expect(resume.step).toBe(2);
    expect(resume.exercisesDone).toEqual([{ step: 1, id: "py-1" }]);
  });

  it("holds a section shut while its Python challenge is not passed", () => {
    const gates = [gate(["q1"]), gate(["q2"], ["py-1"]), gate(["q3"])];
    // Both quizzes answered, the challenge not: the reader is on section 2.
    const resume = resumeLesson(gates, set("q1", "q2"), set());
    expect(resume.step).toBe(1);
    expect(resume.exercisesDone).toEqual([]);
  });

  it("seeds a challenge passed in a later section too, wherever the reader lands", () => {
    const gates = [gate(["q1"]), gate(["q2"]), gate([], ["py-3"])];
    const resume = resumeLesson(gates, set("q1"), set("py-3"));
    expect(resume.step).toBe(1);
    expect(resume.exercisesDone).toEqual([{ step: 2, id: "py-3" }]);
  });

  it("is the first section for a lesson with no section at all", () => {
    expect(resumeLesson([], set("q1"), set())).toEqual(NO_RESUME);
  });

  it("is the first section for a lesson with no gate at all", () => {
    expect(resumeLesson([gate(), gate()], set(), set())).toEqual({
      step: 0,
      doneSteps: [],
      exercisesDone: [],
    });
  });
});

const QUIZ = (id: string): string =>
  `<Quiz id="${id}" question="Une question ?" options={["Oui", "Non"]} correct={0} />`;
const PYTHON = (id: string): string =>
  `<PythonChallenge id="${id}" title="Un défi" description="Fais-le." starterCode="x = 1" tests={[{ input: "x", expected: "1" }]} />`;

describe("sectionGates", () => {
  it("reads the quizzes and the Python challenges of each section, nothing else", () => {
    const gates = sectionGates([
      `## Un\n\nDu texte.\n\n${QUIZ("q1")}`,
      `## Deux\n\n${PYTHON("py-1")}\n\n${QUIZ("q2")}`,
      `## Trois\n\n<LinuxTerminal id="term-1" title="Un terminal" />`,
      "## Quatre\n\nSeulement du texte.",
    ]);
    expect(gates).toEqual([
      { quizIds: ["q1"], pythonIds: [] },
      { quizIds: ["q2"], pythonIds: ["py-1"] },
      { quizIds: [], pythonIds: [] },
      { quizIds: [], pythonIds: [] },
    ]);
  });

  it("finds a quiz inside a group", () => {
    const [gates] = sectionGates([
      `## Un\n\n<QuizGroup>\n${QUIZ("q1")}\n${QUIZ("q2")}\n</QuizGroup>`,
    ]);
    expect(gates?.quizIds).toEqual(["q1", "q2"]);
  });

  it("reads a section that does not parse as one without gates", () => {
    expect(sectionGates(["## Cassé\n\n<Quiz id="])).toEqual([{ quizIds: [], pythonIds: [] }]);
  });
});

describe("lessonResume", () => {
  const SECTIONS = [
    `## Un\n\n${QUIZ("q1")}`,
    `## Deux\n\n${QUIZ("q2")}`,
    `## Trois\n\n${PYTHON("py-1")}`,
    `## Quatre\n\n${QUIZ("q4")}`,
  ];

  it("opens on the first section for a reader who did nothing, without reading the sections", () => {
    // Sections that would throw if parsed as gates are never looked at.
    expect(lessonResume(SECTIONS, set(), set())).toBe(NO_RESUME);
  });

  it("opens where a reader stopped, from the quizzes they answered", () => {
    expect(lessonResume(SECTIONS, set("q1", "q2"), set()).step).toBe(2);
  });

  it("opens after a Python challenge passed, and holds it done", () => {
    const resume = lessonResume(SECTIONS, set("q1", "q2"), set("py-1"));
    expect(resume.step).toBe(3);
    expect(resume.exercisesDone).toEqual([{ step: 2, id: "py-1" }]);
  });
});
