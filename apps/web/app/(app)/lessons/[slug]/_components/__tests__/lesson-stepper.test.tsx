// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
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
  withExercise = false,
}: {
  isCompleted?: boolean;
  withExercise?: boolean;
}): React.ReactElement {
  return (
    <LessonStepper
      lessonId="lesson"
      lessonTitle="Leçon"
      xpReward={50}
      isCompleted={isCompleted}
      sections={SECTIONS}
      note={{ content: "", wordCount: 0 }}
      planExtra={<p>Écrit par Ada</p>}
    >
      {SECTIONS.map((s, i) => (
        <SectionPane key={s.id} index={i}>
          <p>{s.text} section</p>
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
