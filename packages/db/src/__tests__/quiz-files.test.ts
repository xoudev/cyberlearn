import { describe, expect, it } from "vitest";
import { checkQuizFile, loadQuizFiles, type QuizFile } from "../catalogue/quiz-files";
import { quizChanges, quizMatches, type StoredQuiz } from "../catalogue/quiz-sync";

function question(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    question: "Que vaut 2 + 2 ?",
    options: [
      { id: "a", text: "3" },
      { id: "b", text: "4" },
    ],
    correctOptionId: "b",
    explanation: "Deux plus deux font quatre.",
    ...overrides,
  };
}

function file(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    passThreshold: 75,
    questionsToDraw: 1,
    questions: [question(), question({ question: "Que vaut 3 + 3 ?" })],
    ...overrides,
  };
}

describe("content/quizzes", () => {
  it("are all valid, as the repository holds them", () => {
    const { quizzes, errors } = loadQuizFiles();
    expect(errors).toEqual([]);
    expect(quizzes.length).toBeGreaterThan(0);
  });
});

describe("checkQuizFile", () => {
  it("accepts a well-formed exam", () => {
    const { errors, quiz } = checkQuizFile("reseaux", file());
    expect(errors).toEqual([]);
    expect(quiz?.questions).toHaveLength(2);
  });

  it("refuses to draw more questions than the pool holds", () => {
    const { errors } = checkQuizFile("reseaux", file({ questionsToDraw: 3 }));
    expect(errors.join("\n")).toContain("questionsToDraw (3)");
  });

  it("refuses an answer that names no option", () => {
    const { errors } = checkQuizFile(
      "reseaux",
      file({ questions: [question({ correctOptionId: "z" })] }),
    );
    expect(errors.join("\n")).toContain("correctOptionId");
  });

  it("refuses the same question twice in a pool", () => {
    const { errors } = checkQuizFile("reseaux", file({ questions: [question(), question()] }));
    expect(errors.join("\n")).toContain("en double");
  });

  it("refuses the em-dash", () => {
    const { errors } = checkQuizFile(
      "reseaux",
      file({
        questions: [question({ explanation: `Deux ${String.fromCodePoint(0x2014)} quatre.` })],
      }),
    );
    expect(errors.join("\n")).toContain("tiret cadratin");
  });
});

describe("quizMatches", () => {
  const checked = checkQuizFile("reseaux", file()).quiz;
  if (!checked) throw new Error("the fixture no longer passes its check");
  const quiz: QuizFile = checked;
  const stored = (): StoredQuiz => ({
    passThreshold: 75,
    questionsToDraw: 1,
    isActive: true,
    questions: quiz.questions.map((q) => ({
      question: q.question,
      options: q.options.map((o) => ({ ...o })),
      correctOptionId: q.correctOptionId,
      explanation: q.explanation ?? null,
      isActive: true,
    })),
  });

  it("sees a quiz already written", () => {
    expect(quizMatches(stored(), quiz)).toBe(true);
  });

  it("sees a changed threshold", () => {
    expect(quizMatches({ ...stored(), passThreshold: 70 }, quiz)).toBe(false);
  });

  it("sees a changed option text", () => {
    const s = stored();
    const first = s.questions[0];
    if (!first) throw new Error("no question");
    first.options = [
      { id: "a", text: "5" },
      { id: "b", text: "4" },
    ];
    expect(quizMatches(s, quiz)).toBe(false);
  });

  it("sees a pool that grew", () => {
    const s = stored();
    expect(quizMatches({ ...s, questions: s.questions.slice(0, 1) }, quiz)).toBe(false);
  });

  it("ignores the questions a sync retired", () => {
    const s = stored();
    s.questions.push({
      question: "Une ancienne question",
      options: [{ id: "a", text: "x" }],
      correctOptionId: "a",
      explanation: null,
      isActive: false,
    });
    expect(quizMatches(s, quiz)).toBe(true);
  });

  it("sees a quiz switched off in the console", () => {
    expect(quizMatches({ ...stored(), isActive: false }, quiz)).toBe(false);
  });
});

describe("quizChanges", () => {
  const checked = checkQuizFile("reseaux", file()).quiz;
  if (!checked) throw new Error("the fixture no longer passes its check");
  const quiz: QuizFile = checked;
  const stored = (): StoredQuiz => ({
    passThreshold: 75,
    questionsToDraw: 1,
    isActive: true,
    questions: quiz.questions.map((q) => ({
      question: q.question,
      options: q.options.map((o) => ({ ...o })),
      correctOptionId: q.correctOptionId,
      explanation: q.explanation ?? null,
      isActive: true,
    })),
  });

  it("finds nothing to say where quizMatches holds, retired questions included", () => {
    const s = stored();
    s.questions.push({
      question: "Une ancienne question",
      options: [{ id: "a", text: "x" }],
      correctOptionId: "a",
      explanation: null,
      isActive: false,
    });
    expect(quizMatches(s, quiz)).toBe(true);
    expect(quizChanges(s, quiz)).toEqual([]);
  });

  it("says what the settings become, and that a switched-off exam comes back", () => {
    expect(quizChanges({ ...stored(), passThreshold: 70, isActive: false }, quiz)).toEqual([
      { kind: "changed", label: "Examen", before: "désactivé", after: "actif" },
      { kind: "changed", label: "Seuil", before: "70 %", after: "75 %" },
    ]);
  });

  it("names a new question, a rewritten one, and one the sync switches off", () => {
    const s = stored();
    const [first, second] = s.questions;
    if (!first || !second) throw new Error("no question");
    first.correctOptionId = "a";
    second.question = "Une question que le fichier n'a plus";
    expect(quizChanges(s, quiz)).toEqual([
      { kind: "modified", label: "Question 1", value: "Que vaut 2 + 2 ? (bonne réponse)" },
      { kind: "added", label: "Question 2", value: "Que vaut 3 + 3 ?" },
      {
        kind: "removed",
        label: "Question désactivée",
        value: "Une question que le fichier n'a plus",
      },
    ]);
  });

  it("sees the same pool in another order, which quizMatches refuses too", () => {
    const s = stored();
    s.questions.reverse();
    expect(quizMatches(s, quiz)).toBe(false);
    expect(quizChanges(s, quiz)).toEqual([
      { kind: "modified", label: "Ordre", value: "Les questions changent d'ordre." },
    ]);
  });
});
