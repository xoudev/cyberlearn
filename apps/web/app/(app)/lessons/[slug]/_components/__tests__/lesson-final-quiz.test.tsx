// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test/match-media";

/**
 * The final quiz's last answer finishes the lesson.
 *
 * What a learner reported: once the quiz at the end of a lesson was done, they
 * still had to press "Suivante" to a last section with nothing to do in it,
 * then "Terminer", before the lesson counted.
 */

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  useSearchParams: () => new URLSearchParams(),
}));
const completeLesson = vi.fn();
vi.mock("../../_actions/track-progress", () => ({
  completeLesson: (...args: unknown[]) => completeLesson(...args) as unknown,
}));
const answerQuiz = vi.fn();
vi.mock("../../_actions/answer-quiz", () => ({
  answerQuiz: (...args: unknown[]) => answerQuiz(...args) as unknown,
}));
vi.mock("../../_actions/report-quiz", () => ({ reportQuizAction: vi.fn() }));
vi.mock("@/app/(app)/notes/_actions/note-actions", () => ({ saveNoteAction: vi.fn() }));
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ open: true, setOpen: vi.fn() }),
}));
// The completion window is drawn elsewhere: here, only that it opens, and with what.
vi.mock("../lesson-complete-modal", () => ({
  LessonCompleteModal: ({ result }: { result: { xpGained: number } }) => (
    <div role="dialog" aria-label="Leçon terminée">
      {`+${String(result.xpGained)} XP`}
    </div>
  ),
}));

const { LessonStepper } = await import("../lesson-stepper");
const { SectionPane } = await import("../section-pane");
const { LessonQuizProvider } = await import("../lesson-quiz-context");
const { QuizGroup } = await import("../quiz-group");
const { Quiz } = await import("../quiz");
const { useLessonCompletion } = await import("../lesson-completion-context");

const LESSON = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const OPTIONS = ["12", "15", "8"];
const SECTIONS = [
  { text: "Le cours", id: "cours" },
  { text: "Quiz", id: "quiz" },
  { text: "À retenir", id: "a-retenir" },
];
const COMPLETED = {
  alreadyCompleted: false,
  xpGained: 80,
  leveledUp: false,
  newLevel: 2,
  newBadges: [],
  quizScore: { correct: 2, total: 2 },
  refusal: null,
};

/** An exercise its section waits for, done when its button is pressed. */
function Exercise(): React.ReactElement {
  const completion = useLessonCompletion();
  React.useEffect(() => {
    completion?.register("exercise");
    return () => {
      completion?.unregister("exercise");
    };
  }, [completion]);
  return (
    <button type="button" onClick={() => completion?.markDone("exercise")}>
      Réussir
    </button>
  );
}

function Lesson({
  isCompleted = false,
  reviewing = false,
  finalQuizStep = 1,
  withExercise = false,
  initialAnswers = {},
}: {
  isCompleted?: boolean;
  reviewing?: boolean;
  finalQuizStep?: number | null;
  withExercise?: boolean;
  initialAnswers?: Record<string, { selected: number; correct: boolean }>;
}): React.ReactElement {
  const stepper = (
    <LessonStepper
      lessonId={LESSON}
      lessonTitle="Leçon"
      xpReward={80}
      isCompleted={isCompleted}
      reviewing={reviewing}
      sections={SECTIONS}
      initialStep={1}
      initialDoneSteps={[0]}
      finalQuizStep={finalQuizStep}
      note={{ content: "", wordCount: 0 }}
    >
      <SectionPane index={0}>
        <p>Le cours</p>
      </SectionPane>
      <SectionPane index={1}>
        <QuizGroup>
          <Quiz id="f-1" question="Première ?" options={OPTIONS} correct={1} />
          <Quiz id="f-2" question="Deuxième ?" options={OPTIONS} correct={1} />
        </QuizGroup>
        {withExercise && <Exercise />}
      </SectionPane>
      <SectionPane index={2}>
        <p>À retenir</p>
      </SectionPane>
    </LessonStepper>
  );
  if (reviewing) return stepper;
  return (
    <LessonQuizProvider lessonId={LESSON} userId={USER} initialAnswers={initialAnswers}>
      {stepper}
    </LessonQuizProvider>
  );
}

async function answer(optionText: string): Promise<void> {
  fireEvent.click(screen.getByText(optionText));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Valider la réponse" }));
    await Promise.resolve();
  });
  // The section counts the answer on the render after it; the lesson
  // finishes on the one after that.
  await act(async () => {
    await Promise.resolve();
  });
}

async function answerBoth(): Promise<void> {
  await answer("8");
  fireEvent.click(screen.getByRole("button", { name: "Question suivante" }));
  await answer("15");
}

beforeEach(() => {
  vi.clearAllMocks();
  stubMatchMedia();
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState(null, "", "/lessons/lecon");
  answerQuiz.mockImplementation((_l: string, _q: string, selected: number) =>
    Promise.resolve({ ok: true, selected, correct: selected === 1 }),
  );
  completeLesson.mockResolvedValue(COMPLETED);
});

afterEach(() => {
  cleanup();
});

describe("the final quiz's last answer", () => {
  it("completes the lesson, through the same action as Terminer, and opens the completion", async () => {
    render(<Lesson />);
    await answer("8");
    // One question still to answer: nothing yet.
    expect(completeLesson).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Question suivante" }));
    await answer("15");
    expect(completeLesson).toHaveBeenCalledTimes(1);
    expect(completeLesson).toHaveBeenCalledWith(LESSON);
    expect((await screen.findByRole("dialog", { name: "Leçon terminée" })).textContent).toBe(
      "+80 XP",
    );
  });

  it("finishes it once, however often the page renders again", async () => {
    const { rerender } = render(<Lesson />);
    await answerBoth();
    rerender(<Lesson />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(completeLesson).toHaveBeenCalledTimes(1);
  });

  it("waits for what else the section holds", async () => {
    render(<Lesson withExercise />);
    await answerBoth();
    expect(completeLesson).not.toHaveBeenCalled();
    // Done afterwards, the exercise finishes nothing: the learner goes on.
    fireEvent.click(screen.getByRole("button", { name: "Réussir" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(completeLesson).not.toHaveBeenCalled();
  });

  it("finishes nothing for answers already on record when the page opens", async () => {
    render(
      <Lesson
        initialAnswers={{
          "f-1": { selected: 0, correct: false },
          "f-2": { selected: 1, correct: true },
        }}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(completeLesson).not.toHaveBeenCalled();
  });

  it("finishes nothing for a lesson already finished", async () => {
    render(<Lesson isCompleted />);
    await answerBoth();
    expect(completeLesson).not.toHaveBeenCalled();
  });

  it("finishes nothing in an administrator's preview", async () => {
    render(<Lesson reviewing />);
    await answerBoth();
    expect(completeLesson).not.toHaveBeenCalled();
  });

  it("finishes nothing where the quiz is not the lesson's final one", async () => {
    render(<Lesson finalQuizStep={null} />);
    await answerBoth();
    expect(completeLesson).not.toHaveBeenCalled();
  });

  it("says why when the server recorded nothing, where the learner is", async () => {
    completeLesson.mockResolvedValueOnce({
      ...COMPLETED,
      xpGained: 0,
      quizScore: null,
      refusal: "Termine d'abord la leçon précédente du parcours.",
    });
    render(<Lesson />);
    await answerBoth();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Termine d'abord la leçon précédente du parcours.",
    );
    expect(screen.queryByRole("dialog", { name: "Leçon terminée" })).toBeNull();
  });
});
