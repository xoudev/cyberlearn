// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { quizOptionOrder, quizOrderSeed } from "@cyberlearn/lib/quiz/option-order";
import { stubMatchMedia } from "@/test/match-media";

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

const reportQuizAction = vi.fn();
vi.mock("../../_actions/report-quiz", () => ({
  reportQuizAction: (...args: unknown[]) => reportQuizAction(...args) as unknown,
}));

const { Quiz } = await import("../quiz");
const { QuizGroup } = await import("../quiz-group");
const { LessonQuizProvider } = await import("../lesson-quiz-context");
const { LessonCompletionContext } = await import("../lesson-completion-context");

const LESSON = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const OPTIONS = ["12", "15", "8"];
/** The order this learner sees q-1's options in. */
const ORDER = quizOptionOrder(OPTIONS, quizOrderSeed(USER, LESSON, "q-1"));
const LETTERS = ["A", "B", "C"];

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
  initialReported = [],
}: {
  children: React.ReactNode;
  initialAnswers?: Record<string, { selected: number; correct: boolean }>;
  initialReported?: string[];
}): React.ReactElement {
  return (
    <LessonCompletionContext.Provider value={completion}>
      <LessonQuizProvider
        lessonId={LESSON}
        userId={USER}
        initialAnswers={initialAnswers}
        initialReported={initialReported}
      >
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
    const letter = LETTERS[ORDER.indexOf(1)] ?? "";
    expect(screen.getByText(`La bonne réponse était ${letter} : 15.`)).toBeTruthy();
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

describe("the verdict, before the server's", () => {
  /** A server answer the test hands back when it chooses. */
  function deferAnswer(): {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  } {
    let resolve: (value: unknown) => void = () => undefined;
    let reject: (error: Error) => void = () => undefined;
    answerQuiz.mockImplementationOnce(
      () =>
        new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        }),
    );
    return {
      resolve: (value) => {
        resolve(value);
      },
      reject: (error) => {
        reject(error);
      },
    };
  }

  /** Sends an answer and leaves the server's reply pending. */
  function send(optionText: string): void {
    fireEvent.click(screen.getByText(optionText));
    fireEvent.click(screen.getByRole("button", { name: "Valider la réponse" }));
  }

  it("shows at once, without waiting for the round trip", () => {
    deferAnswer();
    render(
      <Page>
        <Quiz id="q-1" question="?" options={OPTIONS} correct={1} explanation="Parce que." />
      </Page>,
    );
    send("15");
    expect(screen.getByText("✓ Bonne réponse")).toBeTruthy();
    expect(screen.getByText("Parce que.")).toBeTruthy();
    for (const radio of screen.getAllByRole("radio")) {
      expect((radio as HTMLInputElement).disabled).toBe(true);
    }
    // Nothing that counts moves on a verdict the server has not confirmed.
    expect(completion.markDone).not.toHaveBeenCalled();
  });

  it("lets the section go on once the server confirms it", async () => {
    const reply = deferAnswer();
    render(
      <Page>
        <Quiz id="q-1" question="?" options={OPTIONS} correct={1} />
      </Page>,
    );
    send("15");
    await act(async () => {
      reply.resolve({ ok: true, selected: 1, correct: true });
      await Promise.resolve();
    });
    expect(completion.markDone).toHaveBeenCalledWith("q-1");
  });

  it("gives way to the server's record when it differs", async () => {
    const reply = deferAnswer();
    render(
      <Page>
        <Quiz id="q-1" question="?" options={OPTIONS} correct={1} />
      </Page>,
    );
    send("15");
    expect(screen.getByText("✓ Bonne réponse")).toBeTruthy();
    // A second tab answered first, and wrong.
    await act(async () => {
      reply.resolve({ ok: true, selected: 2, correct: false });
      await Promise.resolve();
    });
    expect(screen.getByText("✗ Mauvaise réponse")).toBeTruthy();
  });

  it("is taken back, with the reason, when the server refuses the answer", async () => {
    const reply = deferAnswer();
    render(
      <Page>
        <Quiz id="q-1" question="?" options={OPTIONS} correct={1} />
      </Page>,
    );
    send("8");
    expect(screen.getByText("✗ Mauvaise réponse")).toBeTruthy();
    await act(async () => {
      reply.resolve({ ok: false, error: "Leçon introuvable." });
      await Promise.resolve();
    });
    expect(screen.queryByText("✗ Mauvaise réponse")).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe("Leçon introuvable.");
    for (const radio of screen.getAllByRole("radio")) {
      expect((radio as HTMLInputElement).disabled).toBe(false);
    }
    expect(completion.markDone).not.toHaveBeenCalled();
  });

  it("is taken back when the request fails", async () => {
    const reply = deferAnswer();
    render(
      <Page>
        <Quiz id="q-1" question="?" options={OPTIONS} correct={1} />
      </Page>,
    );
    send("15");
    await act(async () => {
      reply.reject(new Error("network"));
      await Promise.resolve();
    });
    expect(screen.queryByText("✓ Bonne réponse")).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe(
      "Ta réponse n'a pas pu être enregistrée. Réessaie.",
    );
  });
});

describe("in a group", () => {
  function Group({
    initialAnswers = {},
  }: {
    initialAnswers?: Record<string, { selected: number; correct: boolean }>;
  }): React.ReactElement {
    return (
      <Page initialAnswers={initialAnswers}>
        <QuizGroup>
          <Quiz id="g-1" question="Première ?" options={OPTIONS} correct={1} />
          <Quiz id="g-2" question="Deuxième ?" options={OPTIONS} correct={1} />
          <Quiz id="g-3" question="Troisième ?" options={OPTIONS} correct={1} />
        </QuizGroup>
      </Page>
    );
  }

  function goOn(name = "Question suivante"): void {
    fireEvent.click(screen.getByRole("button", { name }));
  }

  /** The progress segments, as they are announced. */
  function steps(): string[] {
    return within(screen.getByRole("group", { name: "Progression du quiz" }))
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);
  }

  const scrollIntoView = vi.fn();

  beforeEach(() => {
    stubMatchMedia();
    scrollIntoView.mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.history.replaceState(null, "", "/lessons/lecon");
  });

  it("asks one question at a time", () => {
    render(<Group />);
    expect(screen.getAllByRole("region")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Question 1" }).textContent).toContain(
      "Question 1 sur 3",
    );
    expect(screen.queryByText("Deuxième ?")).toBeNull();
  });

  it("keeps the verdict on screen until the learner goes on, after a wrong answer too", async () => {
    render(<Group />);
    await answer("8");
    const first = screen.getByRole("region", { name: "Question 1" });
    expect(within(first).getByText("✗ Mauvaise réponse")).toBeTruthy();
    expect(screen.queryByText("Deuxième ?")).toBeNull();
    goOn();
    // The next question takes its place: one question, the new one.
    expect(screen.getAllByRole("region")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Question 2" }).textContent).toContain("Deuxième ?");
    expect(screen.queryByText("Première ?")).toBeNull();
  });

  it("puts the focus on the new question", async () => {
    render(<Group />);
    await answer("15");
    goOn();
    expect(document.activeElement?.textContent).toBe("Deuxième ?");
    expect(document.activeElement?.tagName).toBe("H3");
  });

  it("tells each question's state in its progress, and how many are answered", async () => {
    render(<Group />);
    expect(steps()).toEqual([
      "Question 1 : à répondre",
      "Question 2 : pas encore ouverte",
      "Question 3 : pas encore ouverte",
    ]);
    await answer("8");
    goOn();
    await answer("15");
    expect(steps()).toEqual([
      "Question 1 : mauvaise réponse",
      "Question 2 : bonne réponse",
      "Question 3 : à répondre",
    ]);
    expect(screen.getByText("2 questions répondues sur 3")).toBeTruthy();
  });

  it("opens an answered question again from its progress, and not one ahead", async () => {
    render(<Group />);
    await answer("8");
    goOn();
    const progress = screen.getByRole("group", { name: "Progression du quiz" });
    expect(
      within(progress).getByRole<HTMLButtonElement>("button", {
        name: "Question 3 : pas encore ouverte",
      }).disabled,
    ).toBe(true);
    fireEvent.click(
      within(progress).getByRole("button", { name: "Question 1 : mauvaise réponse" }),
    );
    const first = screen.getByRole("region", { name: "Question 1" });
    expect(within(first).getByText("✗ Mauvaise réponse")).toBeTruthy();
    expect(within(first).getAllByRole("radio")).toHaveLength(3);
  });

  it("resumes at the first unanswered question after a reload", () => {
    render(<Group initialAnswers={{ "g-1": { selected: 1, correct: true } }} />);
    expect(screen.getByText("Deuxième ?")).toBeTruthy();
    expect(screen.queryByText("Première ?")).toBeNull();
    expect(screen.queryByText("Troisième ?")).toBeNull();
  });

  it("ends on the result: the score, and the questions missed to read again", async () => {
    render(
      <Group
        initialAnswers={{
          "g-1": { selected: 1, correct: true },
          "g-2": { selected: 0, correct: false },
        }}
      />,
    );
    await answer("15");
    goOn("Voir mon résultat");
    const result = screen.getByRole("region", { name: "Résultat du quiz" });
    expect(within(result).getByRole("heading", { name: "Quiz terminé" })).toBeTruthy();
    expect(result.textContent).toContain("2 / 3 bonnes réponses");
    expect(document.activeElement?.textContent).toBe("Quiz terminé");
    fireEvent.click(within(result).getByRole("button", { name: /Question 2/ }));
    expect(screen.getByRole("region", { name: "Question 2" }).textContent).toContain("Deuxième ?");
  });

  it("opens on the result when every question was answered before", () => {
    render(
      <Group
        initialAnswers={{
          "g-1": { selected: 1, correct: true },
          "g-2": { selected: 1, correct: true },
          "g-3": { selected: 1, correct: true },
        }}
      />,
    );
    expect(screen.getByText("Aucune erreur : chaque question est juste.")).toBeTruthy();
  });

  it("opens the question a passage names, to land on it", async () => {
    window.history.replaceState(null, "", "/lessons/lecon#quiz-g-2");
    await act(async () => {
      render(
        <Group
          initialAnswers={{
            "g-1": { selected: 1, correct: true },
            "g-2": { selected: 0, correct: false },
            "g-3": { selected: 1, correct: true },
          }}
        />,
      );
      await Promise.resolve();
    });
    expect(screen.getByRole("region", { name: "Question 2" }).id).toBe("quiz-g-2");
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById("quiz-g-2"));
  });

  it("holds the section for every question, not only the one on screen", async () => {
    render(<Group />);
    expect(completion.register.mock.calls.map(([id]) => id as string)).toEqual([
      "g-1",
      "g-2",
      "g-3",
    ]);
    await answer("15");
    expect(completion.markDone).toHaveBeenCalledWith("g-1");
    expect(completion.markDone).not.toHaveBeenCalledWith("g-2");
  });

  it("goes on once the server confirms an answer the learner went on from", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    answerQuiz.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolve = res;
        }),
    );
    render(<Group />);
    fireEvent.click(screen.getByText("15"));
    fireEvent.click(screen.getByRole("button", { name: "Valider la réponse" }));
    goOn();
    // Pressed before the record: the question stays until it is confirmed,
    // and the button says the press was heard.
    expect(screen.getByRole("region", { name: "Question 1" })).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Enregistrement de ta réponse…" })
        .getAttribute("aria-busy"),
    ).toBe("true");
    await act(async () => {
      resolve({ ok: true, selected: 1, correct: true });
      await Promise.resolve();
    });
    expect(screen.getByRole("region", { name: "Question 2" })).toBeTruthy();
  });

  it("asks one at a time in an editor preview too, scoring locally", () => {
    render(
      <QuizGroup>
        <Quiz id="g-1" question="Première ?" options={OPTIONS} correct={1} />
        <Quiz id="g-2" question="Deuxième ?" options={OPTIONS} correct={1} />
      </QuizGroup>,
    );
    fireEvent.click(screen.getByText("8"));
    fireEvent.click(screen.getByRole("button", { name: "Valider la réponse" }));
    expect(screen.getByText("✗ Mauvaise réponse")).toBeTruthy();
    goOn();
    fireEvent.click(screen.getByText("15"));
    fireEvent.click(screen.getByRole("button", { name: "Valider la réponse" }));
    goOn("Voir mon résultat");
    expect(screen.getByRole("region", { name: "Résultat du quiz" }).textContent).toContain(
      "1 / 2 bonne réponse",
    );
    // The first question, read again, kept its answer.
    fireEvent.click(screen.getByRole("button", { name: "Question 1 : mauvaise réponse" }));
    expect(screen.getByText("✗ Mauvaise réponse")).toBeTruthy();
    expect(answerQuiz).not.toHaveBeenCalled();
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

describe("the order of the options", () => {
  /** The option texts as displayed, top to bottom. */
  function shown(): string[] {
    return screen.getAllByRole("radio").map((r) => r.closest("label")?.textContent ?? "");
  }

  it("is this learner's own, not the written one", () => {
    // The fixture is only meaningful if this learner's order differs.
    expect(ORDER).not.toEqual([0, 1, 2]);
    render(
      <Page>
        <Quiz id="q-1" question="Que renvoie notes[1] ?" options={OPTIONS} correct={1} />
      </Page>,
    );
    expect(shown()).toEqual(ORDER.map((i, pos) => `${LETTERS[pos] ?? ""}${OPTIONS[i] ?? ""}`));
  });

  it("sends the option's written index, wherever it is shown", async () => {
    render(
      <Page>
        <Quiz id="q-1" question="Que renvoie notes[1] ?" options={OPTIONS} correct={1} />
      </Page>,
    );
    await answer("15");
    expect(answerQuiz).toHaveBeenCalledWith(LESSON, "q-1", 1);
    expect(screen.getByText("✓ Bonne réponse")).toBeTruthy();
  });

  it("shows an answer on record against the right option after a reload", () => {
    render(
      <Page initialAnswers={{ "q-1": { selected: 2, correct: false } }}>
        <Quiz id="q-1" question="Que renvoie notes[1] ?" options={OPTIONS} correct={1} />
      </Page>,
    );
    const chosen = screen.getAllByRole("radio").find((r) => (r as HTMLInputElement).checked);
    expect(chosen?.closest("label")?.textContent).toContain("8");
  });

  it("stays the written one in an editor preview", () => {
    render(<Quiz id="q-1" question="?" options={OPTIONS} correct={1} />);
    expect(shown()).toEqual(["A12", "B15", "C8"]);
  });
});

describe("reporting a question", () => {
  function quiz(initialReported: string[] = []): void {
    render(
      <Page initialReported={initialReported}>
        <Quiz id="q-1" question="Que renvoie notes[1] ?" options={OPTIONS} correct={1} />
      </Page>,
    );
  }

  it("asks why before anything can be sent", () => {
    quiz();
    fireEvent.click(screen.getByRole("button", { name: "Signaler cette question" }));
    expect(screen.getByText("Qu'est-ce qui ne va pas ?")).toBeTruthy();
    const send = screen.getByRole("button", { name: "Envoyer" });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("La question ou les réponses sont ambiguës"));
    expect((send as HTMLButtonElement).disabled).toBe(false);
  });

  it("sends the question, the reason and the comment, then thanks", async () => {
    reportQuizAction.mockResolvedValue({ ok: true });
    quiz();
    fireEvent.click(screen.getByRole("button", { name: "Signaler cette question" }));
    fireEvent.click(screen.getByLabelText("La bonne réponse me semble fausse"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: " notes[1] vaut 15 " } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
      await Promise.resolve();
    });
    expect(reportQuizAction).toHaveBeenCalledWith({
      lessonId: LESSON,
      quizId: "q-1",
      reason: "WRONG_ANSWER",
      comment: "notes[1] vaut 15",
    });
    expect(
      screen.getByText("Merci, c'est signalé. L'équipe va relire cette question."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Modifier le signalement" })).toBeTruthy();
  });

  it("keeps the form open and says why when it could not be sent", async () => {
    reportQuizAction.mockResolvedValue({ ok: false, error: "Leçon introuvable." });
    quiz();
    fireEvent.click(screen.getByRole("button", { name: "Signaler cette question" }));
    fireEvent.click(screen.getByLabelText("Faute ou erreur dans le texte"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("alert").textContent).toBe("Leçon introuvable.");
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeTruthy();
  });

  it("shows a question already reported as such, after a reload", () => {
    quiz(["q-1"]);
    expect(screen.getByText("Tu as signalé cette question. L'équipe va la relire.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Signaler cette question" })).toBeNull();
  });

  it("is not offered in an editor preview", () => {
    render(<Quiz id="q-1" question="?" options={OPTIONS} correct={1} />);
    expect(screen.queryByRole("button", { name: "Signaler cette question" })).toBeNull();
  });
});
