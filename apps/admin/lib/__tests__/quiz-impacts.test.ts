import { describe, expect, it } from "vitest";
import { describeQuizImpacts, quizImpactsMessage } from "../quiz-impact-text";
import { changedQuizzes, quizImpactsOf } from "../quiz-impacts";

/**
 * What a new text of a lesson does to the quizzes learners already answered:
 * the one rule behind the import's, the sync's and the studio's warning.
 */

const quiz = (id: string, options: string[], correct: number): string =>
  `<Quiz id="${id}" question="Que vaut ${id} ?" options={${JSON.stringify(options)}} correct={${String(correct)}} />`;

const BEFORE = [
  "## Ports",
  quiz("q1", ["22", "80", "443"], 1),
  "Un texte.",
  quiz("q2", ["tcp", "udp"], 0),
].join("\n\n");

describe("changedQuizzes", () => {
  it("names the quiz whose answer key moved, and the one taken out", () => {
    const after = ["## Ports", quiz("q1", ["22", "80", "443"], 2), "Un texte."].join("\n\n");
    expect([...changedQuizzes(BEFORE, after)]).toEqual([
      ["q1", "modified"],
      ["q2", "removed"],
    ]);
  });

  it("names the quiz whose options changed", () => {
    const after = BEFORE.replace('["tcp","udp"]', '["tcp","udp","sctp"]');
    expect([...changedQuizzes(BEFORE, after)]).toEqual([["q2", "modified"]]);
  });

  it("leaves a quiz whose question or explanation alone is reworded", () => {
    expect(changedQuizzes(BEFORE, BEFORE.replace("Que vaut q1 ?", "Quel port ?")).size).toBe(0);
  });

  it("ignores a quiz added, which nobody answered", () => {
    const after = `${BEFORE}\n\n${quiz("q3", ["a", "b"], 0)}`;
    expect(changedQuizzes(BEFORE, after).size).toBe(0);
  });
});

describe("quizImpactsOf", () => {
  const AFTER = ["## Ports", quiz("q1", ["22", "80", "443"], 2), "Un texte."].join("\n\n");

  it("keeps the changed quizzes that have answers, with how many", () => {
    expect(quizImpactsOf(BEFORE, AFTER, new Map([["q1", 240]]))).toEqual([
      { quizId: "q1", answers: 240, change: "modified" },
    ]);
  });

  it("counts a quiz taken out as much as one changed", () => {
    expect(
      quizImpactsOf(
        BEFORE,
        AFTER,
        new Map([
          ["q1", 1],
          ["q2", 7],
        ]),
      ),
    ).toEqual([
      { quizId: "q1", answers: 1, change: "modified" },
      { quizId: "q2", answers: 7, change: "removed" },
    ]);
  });

  it("is empty where nobody answered, without reading the text", () => {
    // A text that does not parse would otherwise be read for nothing.
    expect(quizImpactsOf(BEFORE, AFTER, new Map())).toEqual([]);
  });

  it("is empty when the changed quiz has no answer of its own", () => {
    expect(quizImpactsOf(BEFORE, AFTER, new Map([["q2", 5]]))).toEqual([
      { quizId: "q2", answers: 5, change: "removed" },
    ]);
    expect(quizImpactsOf(BEFORE, BEFORE, new Map([["q1", 5]]))).toEqual([]);
  });
});

describe("what is said", () => {
  it("lists each quiz with what changes and how many answers it has", () => {
    expect(
      describeQuizImpacts([
        { quizId: "q1", answers: 1, change: "modified" },
        { quizId: "q2", answers: 3, change: "removed" },
      ]),
    ).toBe("« q1 » (options ou réponse changées, 1 réponse), « q2 » (retiré, 3 réponses)");
  });

  it("tells the author what the answers keep", () => {
    expect(quizImpactsMessage([{ quizId: "q1", answers: 2, change: "modified" }])).toBe(
      "Quiz modifiés qui ont déjà des réponses : « q1 » (options ou réponse changées, 2 réponses). Ces réponses et leur note restent celles de l'ancienne version.",
    );
  });
});
