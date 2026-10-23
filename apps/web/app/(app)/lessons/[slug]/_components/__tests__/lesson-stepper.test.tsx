// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test/match-media";

/**
 * The lesson, one section at a time, moved through from its toolbar.
 *
 * Changing section starts the reader at the top of the new one. They ask for
 * it from wherever they are in the previous one, usually its end: before, the
 * page kept its scroll position, so the next section opened wherever the
 * previous one had ended, halfway down or past its end.
 */

/** The address's query as Next's useSearchParams reads it. */
const nav = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock("../../_actions/track-progress", () => ({ completeLesson: vi.fn() }));
vi.mock("@/app/(app)/notes/_actions/note-actions", () => ({ saveNoteAction: vi.fn() }));
vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ open: true, setOpen: vi.fn() }),
}));

const { LessonStepper } = await import("../lesson-stepper");
const { SectionPane } = await import("../section-pane");
const { useLessonCompletion } = await import("../lesson-completion-context");

const SECTIONS = [
  { text: "Première", id: "premiere" },
  { text: "Deuxième", id: "deuxieme" },
  { text: "Troisième", id: "troisieme" },
];

/** An exercise the section waits for, done when its button is pressed. */
function Exercise(): React.ReactElement {
  const completion = useLessonCompletion();
  React.useEffect(() => {
    completion?.register("exercise");
    return () => {
      completion?.unregister("exercise");
    };
  }, [completion]);
  return (
    <button
      type="button"
      onClick={() => {
        completion?.markDone("exercise");
      }}
    >
      Réussir
    </button>
  );
}

function Lesson({
  isCompleted = false,
  reviewing = false,
  withExercise = false,
  initialStep = 0,
}: {
  isCompleted?: boolean;
  reviewing?: boolean;
  withExercise?: boolean;
  initialStep?: number;
}): React.ReactElement {
  return (
    <LessonStepper
      lessonId="lesson"
      lessonTitle="Leçon"
      xpReward={50}
      isCompleted={isCompleted}
      reviewing={reviewing}
      sections={SECTIONS}
      initialStep={initialStep}
      note={{ content: "", wordCount: 0 }}
      planExtra={<p>Écrit par Ada</p>}
    >
      {SECTIONS.map((s, i) => (
        <SectionPane key={s.id} index={i}>
          <p>{s.text} section</p>
          <p id={`quiz-${s.id}`}>Question de la section</p>
          {withExercise && i === 0 && <Exercise />}
        </SectionPane>
      ))}
    </LessonStepper>
  );
}

const scrollIntoView = vi.fn();
let reducedMotion = false;

beforeEach(() => {
  scrollIntoView.mockClear();
  reducedMotion = false;
  nav.search = "";
  window.history.replaceState(null, "", "/lessons/lecon");
  // jsdom implements neither.
  Element.prototype.scrollIntoView = scrollIntoView;
  stubMatchMedia((query) => query.includes("reduce") && reducedMotion);
});

afterEach(() => {
  cleanup();
});

function article(): HTMLElement {
  return screen.getByRole("article");
}

function next(): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>("button", { name: "Section suivante" });
}

describe("changing section", () => {
  it("does not move the page when the lesson opens", () => {
    render(<Lesson />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("brings the top of the next section into view", () => {
    render(<Lesson />);
    fireEvent.click(next());
    expect(screen.getByText("Deuxième section")).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(article());
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("does the same going back", () => {
    render(<Lesson />);
    fireEvent.click(next());
    fireEvent.click(screen.getByRole("button", { name: "Section précédente" }));
    expect(screen.getByText("Première section")).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("jumps instead of gliding when the reader asked for less motion", () => {
    reducedMotion = true;
    render(<Lesson />);
    fireEvent.click(next());
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("moves keyboard focus to the new section, named after its heading", () => {
    render(<Lesson />);
    fireEvent.click(next());
    expect(document.activeElement).toBe(article());
    expect(article().getAttribute("aria-label")).toBe("Deuxième");
  });

  it("goes back to a section read before from the plan, and closes it", () => {
    render(<Lesson />);
    fireEvent.click(next());
    fireEvent.click(screen.getByRole("button", { name: "Plan de la leçon" }));
    const plan = screen.getByRole("dialog", { name: "Plan de la leçon" });
    fireEvent.click(within(plan).getByRole("button", { name: /Première/ }));
    expect(screen.getByText("Première section")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Plan de la leçon" })).toBeNull();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("shows the plan with the author and the glossary note beneath the sections", () => {
    render(<Lesson />);
    fireEvent.click(screen.getByRole("button", { name: "Plan de la leçon" }));
    const plan = screen.getByRole("dialog", { name: "Plan de la leçon" });
    expect(within(plan).getByText("Écrit par Ada")).toBeTruthy();
  });
});

describe("what keeps the reader in a section", () => {
  it("holds the next section until the section's exercise is done, and says why", () => {
    render(<Lesson withExercise />);
    expect(next().disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain(
      "1 exercice à compléter avant de continuer",
    );
    fireEvent.click(screen.getByRole("button", { name: "Réussir" }));
    expect(next().disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps an exercise done when the reader comes back to its section", () => {
    // The section is unmounted off screen, and a Python challenge comes back
    // without its result: "Précédente" used to hold the section again.
    render(<Lesson withExercise />);
    fireEvent.click(screen.getByRole("button", { name: "Réussir" }));
    fireEvent.click(next());
    fireEvent.click(screen.getByRole("button", { name: "Section précédente" }));
    expect(screen.getByText("Première section")).toBeTruthy();
    expect(next().disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("leaves the section the reader went back from open in the plan", () => {
    render(<Lesson />);
    fireEvent.click(next());
    fireEvent.click(screen.getByRole("button", { name: "Section précédente" }));
    fireEvent.click(screen.getByRole("button", { name: "Plan de la leçon" }));
    const plan = screen.getByRole("dialog", { name: "Plan de la leçon" });
    const second = within(plan).getByRole<HTMLButtonElement>("button", { name: /Deuxième/ });
    expect(second.disabled).toBe(false);
    // Not one never reached.
    expect(
      within(plan).getByRole<HTMLButtonElement>("button", { name: /Troisième/ }).disabled,
    ).toBe(true);
    fireEvent.click(second);
    expect(screen.getByText("Deuxième section")).toBeTruthy();
  });

  it("lets a finished lesson be read in any order", () => {
    render(<Lesson isCompleted withExercise />);
    expect(next().disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Plan de la leçon" }));
    const plan = screen.getByRole("dialog", { name: "Plan de la leçon" });
    fireEvent.click(within(plan).getByRole("button", { name: /Troisième/ }));
    expect(screen.getByText("Troisième section")).toBeTruthy();
  });

  it("says a finished lesson is done at the end of its last section", () => {
    render(<Lesson isCompleted />);
    expect(screen.queryByText("Leçon complétée")).toBeNull();
    fireEvent.click(next());
    fireEvent.click(next());
    expect(screen.getByText("Leçon complétée")).toBeTruthy();
    // Nothing after the last section of a lesson already done.
    expect(next().disabled).toBe(true);
  });
});

describe("an administrator's preview", () => {
  it("holds no section for its exercises, and opens any from the plan", () => {
    render(<Lesson reviewing withExercise />);
    expect(next().disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Plan de la leçon" }));
    const plan = screen.getByRole("dialog", { name: "Plan de la leçon" });
    fireEvent.click(within(plan).getByRole("button", { name: /Troisième/ }));
    expect(screen.getByText("Troisième section")).toBeTruthy();
  });

  it("records nothing: no completion at the end of the last section", async () => {
    const { completeLesson } = await import("../../_actions/track-progress");
    render(<Lesson reviewing />);
    fireEvent.click(next());
    fireEvent.click(next());
    expect(screen.getByText("Troisième section")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Terminer la leçon" })).toBeNull();
    expect(next().disabled).toBe(true);
    fireEvent.click(next());
    expect(completeLesson).not.toHaveBeenCalled();
  });
});

describe("finishing the lesson", () => {
  it("says why the server recorded nothing, instead of a lesson validated for 0 XP", async () => {
    const { completeLesson } = await import("../../_actions/track-progress");
    vi.mocked(completeLesson).mockResolvedValueOnce({
      alreadyCompleted: false,
      xpGained: 0,
      leveledUp: false,
      newLevel: 1,
      newBadges: [],
      quizScore: null,
      refusal: "Termine d'abord la leçon précédente du parcours.",
    });
    render(<Lesson />);
    fireEvent.click(next());
    fireEvent.click(next());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Terminer la leçon" }));
      await Promise.resolve();
    });
    expect(completeLesson).toHaveBeenCalledWith("lesson");
    expect(screen.getByRole("alert").textContent).toContain(
      "Termine d'abord la leçon précédente du parcours.",
    );
    expect(screen.queryByText("// leçon validée")).toBeNull();
  });

  it("says the lesson could not be validated, instead of failing the page, when the call fails", async () => {
    const { completeLesson } = await import("../../_actions/track-progress");
    vi.mocked(completeLesson).mockRejectedValueOnce(new Error("network"));
    render(<Lesson />);
    fireEvent.click(next());
    fireEvent.click(next());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Terminer la leçon" }));
      await Promise.resolve();
    });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "La leçon n'a pas pu être validée, réessaie.",
    );
    // Still on the last section, with the button to try again.
    expect(screen.getByRole("button", { name: "Terminer la leçon" })).toBeTruthy();
    expect(screen.queryByText("// leçon validée")).toBeNull();
  });
});

describe("a passage asked for (?section=, from a review question)", () => {
  /** Follows a link to this address: the browser's address and what Next reads of it. */
  function follow(href: string): void {
    window.history.replaceState(null, "", href);
    nav.search = window.location.search;
  }

  it("opens on its section, and takes the request off the address", () => {
    follow("/lessons/lecon?section=2#quiz-deuxieme");
    render(<Lesson isCompleted initialStep={1} />);
    expect(screen.getByText("Deuxième section")).toBeTruthy();
    // Opening the lesson does not move the page: the browser lands on the question.
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#quiz-deuxieme");
  });

  it("opens it again, at the question, when the same link is followed after moving on", () => {
    follow("/lessons/lecon?section=2#quiz-deuxieme");
    const { rerender } = render(<Lesson isCompleted initialStep={1} />);
    // The address once the request is taken off, as Next reads it.
    nav.search = window.location.search;
    rerender(<Lesson isCompleted initialStep={1} />);
    fireEvent.click(next());
    expect(screen.getByText("Troisième section")).toBeTruthy();
    scrollIntoView.mockClear();

    // The same "Revoir ce passage", from the review window over the lesson.
    follow("/lessons/lecon?section=2#quiz-deuxieme");
    rerender(<Lesson isCompleted initialStep={1} />);

    expect(screen.getByText("Deuxième section")).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("quiz-deuxieme"));
    expect(window.location.search).toBe("");
  });

  it("opens another section of the lesson on screen", () => {
    const { rerender } = render(<Lesson isCompleted />);
    fireEvent.click(next());
    fireEvent.click(next());
    expect(screen.getByText("Troisième section")).toBeTruthy();

    follow("/lessons/lecon?section=1#quiz-premiere");
    rerender(<Lesson isCompleted />);
    expect(screen.getByText("Première section")).toBeTruthy();
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById("quiz-premiere"));
  });

  it("is not met on a lesson the reader has not finished", () => {
    follow("/lessons/lecon?section=3");
    render(<Lesson />);
    expect(screen.getByText("Première section")).toBeTruthy();
  });
});
