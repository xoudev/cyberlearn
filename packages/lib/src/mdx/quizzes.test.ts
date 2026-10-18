import { describe, expect, it } from "vitest";
import { checkLessonMdx, describeLessonMdxProblem } from "./check.js";
import { extractLessonQuizzes, quizProblem, quizProblems, quizSections } from "./quizzes.js";

/**
 * The answer key, read from the lesson on the server.
 *
 * A quiz answer is scored where the learner cannot touch it, so the key comes
 * from the lesson's MDX, parsed and never run.
 */

describe("extractLessonQuizzes", () => {
  it("reads a quiz as the lessons write it", () => {
    const mdx =
      '## S\n\n<Quiz id="q-1" question="Que renvoie notes[1] ?" options={["12", "15", `8`]} correct={1} explanation="On compte à partir de 0." />';
    expect(extractLessonQuizzes(mdx)).toEqual([
      {
        id: "q-1",
        question: "Que renvoie notes[1] ?",
        options: ["12", "15", "8"],
        correct: 1,
        explanation: "On compte à partir de 0.",
      },
    ]);
  });

  it("reads the multi-line form, the legacy `choices`, and quizzes nested in other components", () => {
    const mdx = [
      "---",
      "title: Une leçon",
      "---",
      "## S",
      "",
      '<Quiz id="a"',
      '  question="Q1"',
      '  choices={["x", "y"]}',
      "  correct={0}",
      "/>",
      "",
      "<QuizGroup>",
      '<Quiz id="b" question="Q2" options={["x", "y"]} correct={1} />',
      "</QuizGroup>",
      "",
      "<Callout>",
      "",
      '<Quiz id="c" question="Q3" options={["x", "y"]} correct={0} />',
      "",
      "</Callout>",
    ].join("\n");
    expect(
      extractLessonQuizzes(mdx).map((q) => [q.id, q.options, q.correct, q.explanation]),
    ).toEqual([
      ["a", ["x", "y"], 0, null],
      ["b", ["x", "y"], 1, null],
      ["c", ["x", "y"], 0, null],
    ]);
  });

  it("never runs what an author wrote", () => {
    const mdx =
      '## S\n\n<Quiz id="q" question={(() => { globalThis.__quizRan = true; return "?" })()} options={["a", "b"]} correct={0} />';
    const [quiz] = extractLessonQuizzes(mdx);
    expect((globalThis as { __quizRan?: boolean }).__quizRan).toBeUndefined();
    // The question is not a value, so it is not read; the key still is.
    expect(quiz).toMatchObject({ id: "q", question: "", correct: 0 });
  });

  it("leaves out what cannot be scored", () => {
    const mdx = [
      '<Quiz question="sans id" options={["a", "b"]} correct={0} />',
      '<Quiz id="hors" question="?" options={["a", "b"]} correct={2} />',
      '<Quiz id="calcul" question="?" options={["a", "b"].reverse()} correct={0} />',
      '<Quiz id="ok" question="?" options={["a", "b"]} correct={-0} />',
    ].join("\n\n");
    expect(extractLessonQuizzes(mdx).map((q) => q.id)).toEqual(["ok"]);
  });

  it("returns nothing, rather than throwing, for MDX that does not parse", () => {
    expect(extractLessonQuizzes("<Quiz options={[ />")).toEqual([]);
  });
});

describe("quizProblem, asked before a lesson is saved", () => {
  it("accepts well-formed quizzes", () => {
    expect(
      quizProblem('<Quiz id="q-1" question="?" options={["a", "b"]} correct={1} />'),
    ).toBeNull();
  });

  it.each([
    ['<Quiz question="Q" options={["a", "b"]} correct={0} />', "identifiant"],
    ['<Quiz id="q" question="Q" options={["a"]} correct={0} />', "deux options"],
    ['<Quiz id="q" question="Q" options={["a", "b"]} correct={2} />', "de 0 à 1"],
    ['<Quiz id="q" question="Q" options={["a", "b"]} correct={"1"} />', "de 0 à 1"],
  ])("refuses %s", (mdx, says) => {
    expect(quizProblem(mdx)).toContain(says);
  });

  it("refuses two quizzes with one id, even in different sections", async () => {
    const r = await checkLessonMdx(
      '## Un\n\n<Quiz id="q-1" question="A" options={["a", "b"]} correct={0} />\n\n## Deux\n\n<Quiz id="q-1" question="B" options={["a", "b"]} correct={1} />',
    );
    if (r.ok) throw new Error("accepted a duplicate id");
    expect(r.section).toBe("Deux");
    expect(r.kind).toBe("quiz");
    expect(describeLessonMdxProblem(r)).toBe(
      "La section « Deux », ligne 7, colonne 1 : Deux quiz portent l'identifiant « q-1 ». La réponse d'un élève est enregistrée sous cet identifiant : chaque quiz d'une leçon a le sien. Rien n'a été enregistré.",
    );
  });

  it("marks every unscorable quiz at its tag", () => {
    const mdx =
      'Intro.\n\n- <Quiz question="A" options={["a", "b"]} correct={0} />\n\n<Quiz id="q" question="B" options={["a"]} correct={0} />';
    expect(quizProblems(mdx).map(({ line, column }) => ({ line, column }))).toEqual([
      { line: 3, column: 3 },
      { line: 5, column: 1 },
    ]);
  });

  it("counts a quiz's line in the file, frontmatter included", () => {
    const mdx = '---\ntitle: x\n---\n\n<Quiz question="A" options={["a", "b"]} correct={0} />';
    expect(quizProblems(mdx)[0]?.line).toBe(5);
  });
});

describe("quizSections", () => {
  const mdx = [
    "---",
    "title: Une leçon",
    "---",
    "",
    "Une introduction avant la première section.",
    "",
    "## Un",
    "",
    '<Quiz id="q-1" question="A" options={["a", "b"]} correct={0} />',
    "",
    "## Deux",
    "",
    "Du texte.",
    "",
    "## Trois",
    "",
    '<Quiz id="q-3" question="C" options={["a", "b"]} correct={1} />',
  ].join("\n");

  it("finds the section each quiz is in, as the lesson page cuts them", () => {
    expect(quizSections(mdx)).toEqual(
      new Map([
        ["q-1", 0],
        ["q-3", 2],
      ]),
    );
  });

  it("lists nothing from a section that does not parse, and keeps the others", () => {
    const broken = `${mdx}\n\n## Quatre\n\n<Quiz id="q-4" question={`;
    expect(quizSections(broken).get("q-3")).toBe(2);
    expect(quizSections(broken).has("q-4")).toBe(false);
  });
});
