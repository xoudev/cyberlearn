// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * One question, one answer, and the reason when it is wrong.
 *
 * What a tester reported: a wrong answer could be retried until it was right,
 * so a lesson ended the same whatever one knew; and a quiz folded away after
 * its answer in some places and not in others.
 */

const answerQuiz = vi.fn();
vi.mock("../../_actions/answer-quiz", () => ({
  answerQuiz: (...args: unknown[]) => answerQuiz(...args) as unknown,
}));

const { Quiz } = await import("../quiz");
const { QuizGroup } = await import("../quiz-group");
const { LessonQuizProvider } = await import("../lesson-quiz-context");
const { LessonCompletionContext } = await import("../lesson-completion-context");

const LESSON = "11111111-1111-4111-8111-111111111111";
const OPTIONS = ["12", "15", "8"];

const completion = {
  register: vi.fn(),
  unregister: vi.fn(),
  markDone: vi.fn(),
  isAllComplete: false,
  pendingCount: 1,
};

function Page({
  children,
  initialAnswers = {},
}: {
  children: React.ReactNode;
  initialAnswers?: Record<string, { selected: number; correct: boolean }>;
}): React.ReactElement {
  return (
    <LessonCompletionContext.Provider value={completion}>
      <LessonQuizProvider lessonId={LESSON} initialAnswers={initialAnswers}>
        {children}
      </LessonQuizProvider>
    </LessonCompletionContext.Provider>
  );
}

async function answer(optionText: string, scope: HTMLElement = document.body): Promise<void> {
  fireEvent.click(within(scope).getByText(optionText));
  await act(async () => {
    fireEvent.click(within(scope).getByRole("button", { name: "Valider la réponse" }));
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  answerQuiz.mockImplementation((_l: string, _q: string, selected: number) =>
    Promise.resolve({ ok: true, selected, correct: selected === 1 }),
  );
});
afterEach(() => {
  cleanup();
});

describe("a wrong answer", () => {
  it("is final: no retry, the options lock", async () => {
    render(
      <Page>
        <Quiz id="q-1" question="Que renvoie notes[1] ?" options={OPTIONS} correct={1} />
      </Page>,
    );
    await answer("8");
    expect(screen.getByText("✗ Mauvaise réponse")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Réessayer/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Valider la réponse" })).toBeNull();
    for (const radio of screen.getAllByRole("radio")) {
      expect((radio as HTMLInputElement).disabled).toBe(true);
    }
  });

  it("shows the right option and the author's explanation", async () => {
    render(
      <Page>
        <Quiz
          id="q-1"
          question="Que renvoie notes[1] ?"
          options={OPTIONS}
          correct={1}
          explanation="L'indexation commence à 0 : notes[1] est le deuxième élément."
        />
      </Page>,
    );
    await answer("8");
    expect(screen.getByText("Bonne réponse")).toBeTruthy();
    expect(screen.getByText("Ton choix")).toBeTruthy();
    expect(screen.getByText("Pourquoi")).toBeTruthy();
    expect(
      screen.getByText("L'indexation commence à 0 : notes[1] est le deuxième élément."),
    ).toBeTruthy();
  });

  it("names the right answer when the author wrote no explanation", async () => {
    render(
      <Page>
        <Quiz id="q-1" question="Que renvoie notes[1] ?" options={OPTIONS} correct={1} />
      </Page>,
    );
    await answer("12");
    expect(screen.getByText("La bonne réponse était B : 15.")).toBeTruthy();
  });

  it("still lets the section go on", async () => {
    render(
      <Page>
        <Quiz id="q-1" question="?" options={OPTIONS} correct={1} />
      </Page>,
    );
    await answer("8");
    expect(completion.markDone).toHaveBeenCalledWith("q-1");
  });
});

describe("the record", () => {
  it("is what the server says, not what was clicked", async () => {
    // A second tab answered first: the server hands back that answer.
    answerQuiz.mockResolvedValue({ ok: true, selected: 2, correct: false });
    render(
      <Page>
        <Quiz id="q-1" question="?" options={OPTIONS} correct={1} />
      </Page>,
    );
    await answer("15");
    expect(answerQuiz).toHaveBeenCalledWith(LESSON, "q-1", 1);
    expect(screen.getByText("✗ Mauvaise réponse")).toBeTruthy();
  });

  it("shows a question already answered as answered, after a reload", () => {
    render(
      <Page initialAnswers={{ "q-1": { selected: 1, correct: true } }}>
        <Quiz id="q-1" question="?" options={OPTIONS} correct={1} />
      </Page>,
    );
    expect(screen.getByText("✓ Bonne réponse")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Valider la réponse" })).toBeNull();
    expect(completion.markDone).toHaveBeenCalledWith("q-1");
  });

  it("says so when the answer could not be saved, and lets it be sent again", async () => {
    answerQuiz.mockResolvedValueOnce({ ok: false, error: "Leçon introuvable." });
    render(
      <Page>
        <Quiz id="q-1" question="?" options={OPTIONS} correct={1} />
      </Page>,
    );
    await answer("15");
    expect(screen.getByRole("alert").textContent).toBe("Leçon introuvable.");
    await answer("15");
    expect(screen.getByText("✓ Bonne réponse")).toBeTruthy();
  });
});

describe("in a group", () => {
  function Group(): React.ReactElement {
    return (
      <Page>
        <QuizGroup>
          <Quiz id="g-1" question="Première ?" options={OPTIONS} correct={1} />
          <Quiz id="g-2" question="Deuxième ?" options={OPTIONS} correct={1} />
        </QuizGroup>
      </Page>
    );
  }

  it("moves to the next question after a wrong answer too", async () => {
    render(<Group />);
    expect(screen.queryByText("Deuxième ?")).toBeNull();
    await answer("8", screen.getByRole("region", { name: "Question 1" }));
    expect(screen.getByText("Deuxième ?")).toBeTruthy();
  });

  it("keeps an answered question open, as a quiz on its own does", async () => {
    render(<Group />);
    await answer("8", screen.getByRole("region", { name: "Question 1" }));
    const first = screen.getByRole("region", { name: "Question 1" });
    expect(within(first).getByText("Première ?")).toBeTruthy();
    expect(within(first).getAllByRole("radio")).toHaveLength(3);
    expect(within(first).getByText("✗ Mauvaise réponse")).toBeTruthy();
  });

  it("resumes at the first unanswered question after a reload", () => {
    render(
      <Page initialAnswers={{ "g-1": { selected: 1, correct: true } }}>
        <QuizGroup>
          <Quiz id="g-1" question="Première ?" options={OPTIONS} correct={1} />
          <Quiz id="g-2" question="Deuxième ?" options={OPTIONS} correct={1} />
          <Quiz id="g-3" question="Troisième ?" options={OPTIONS} correct={1} />
        </QuizGroup>
      </Page>,
    );
    expect(screen.getByText("Deuxième ?")).toBeTruthy();
    expect(screen.queryByText("Troisième ?")).toBeNull();
  });
});

describe("outside a lesson page", () => {
  it("scores locally, for an editor preview", () => {
    render(<Quiz id="q-1" question="?" options={OPTIONS} correct={1} />);
    fireEvent.click(screen.getByText("15"));
    fireEvent.click(screen.getByRole("button", { name: "Valider la réponse" }));
    expect(screen.getByText("✓ Bonne réponse")).toBeTruthy();
    expect(answerQuiz).not.toHaveBeenCalled();
  });
});
