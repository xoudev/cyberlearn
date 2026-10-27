import { describe, expect, it } from "vitest";
import { findFinalQuizStep } from "../final-quiz";

/**
 * Which section's quiz finishes a lesson. Most lessons put their quiz before
 * a last "À retenir" section with nothing to do: answering it is the end.
 */

const quiz = (id: string): string =>
  `<QuizGroup>\n<Quiz id="${id}" question="?" options={["a", "b"]} correct={0} />\n</QuizGroup>`;

describe("findFinalQuizStep", () => {
  it("is the section of the last quiz, with only reading after it", () => {
    expect(
      findFinalQuizStep([
        "## Le cours\n\nDu texte.",
        `## Quiz\n\n${quiz("q-1")}`,
        "## À retenir\n\n- Une chose.\n- Une autre.",
      ]),
    ).toBe(1);
  });

  it("is the last section when the quiz is in it", () => {
    expect(findFinalQuizStep(["## Le cours\n\nDu texte.", `## Quiz\n\n${quiz("q-1")}`])).toBe(1);
  });

  it("takes the last of several quizzes", () => {
    expect(
      findFinalQuizStep([`## Un\n\n${quiz("q-1")}`, `## Deux\n\n${quiz("q-2")}`, "## Fin"]),
    ).toBe(1);
  });

  it("is none when an exercise comes after the quiz", () => {
    expect(
      findFinalQuizStep([
        `## Quiz\n\n${quiz("q-1")}`,
        '## Pratique\n\n<PythonChallenge id="p-1" title="Défi" />',
      ]),
    ).toBeNull();
    expect(
      findFinalQuizStep([
        `## Quiz\n\n${quiz("q-1")}`,
        '## Pratique\n\n<CodePlayground language="python" validate expectedOutput="1" />',
      ]),
    ).toBeNull();
  });

  it("is none for a lesson without a quiz", () => {
    expect(findFinalQuizStep(["## Un\n\nDu texte.", "## Deux\n\nEncore."])).toBeNull();
  });

  it("does not count a quiz shown in a code block", () => {
    expect(
      findFinalQuizStep([
        `## Quiz\n\n${quiz("q-1")}`,
        '## Écrire un quiz\n\n```mdx\n<Quiz id="exemple" question="?" options={["a", "b"]} correct={0} />\n```',
      ]),
    ).toBe(0);
  });
});
