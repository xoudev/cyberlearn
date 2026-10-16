// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test/match-media";
import { LESSON_TOOLBAR_HEIGHT, NAVBAR_HEIGHT } from "@/lib/chrome";

/**
 * The lesson's toolbar: where the reader is, the steps either side, the plan,
 * the notes and the focus mode. It replaced four counts of the same progress
 * (the briefing card, the timeline, the rail's outline, the bar under the
 * article) with one.
 */

vi.mock("@/app/(app)/notes/_actions/note-actions", () => ({ saveNoteAction: vi.fn() }));
const sidebar = vi.hoisted(() => ({ open: true, setOpen: vi.fn() }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => sidebar }));

const { LessonToolbar, canOpenSection } = await import("../lesson-toolbar");

const SECTIONS = [
  { text: "Introduction", id: "introduction" },
  { text: "Les ports", id: "les-ports" },
  { text: "Les pare-feu", id: "les-pare-feu" },
  { text: "Bilan", id: "bilan" },
];

type Props = React.ComponentProps<typeof LessonToolbar>;

const onPrev = vi.fn();
const onNext = vi.fn();
const onJump = vi.fn();

function toolbar(overrides: Partial<Props> = {}): void {
  render(
    <LessonToolbar
      sections={SECTIONS}
      currentStep={1}
      totalSteps={SECTIONS.length}
      doneSteps={new Set([0])}
      isCompleted={false}
      canAdvance
      pendingCount={0}
      isPending={false}
      xpReward={40}
      onPrev={onPrev}
      onNext={onNext}
      onJump={onJump}
      planExtra={<p>Glossaire de la leçon</p>}
      lessonId="lesson"
      lessonTitle="Les ports"
      note={{ content: "Ma note", wordCount: 2 }}
      {...overrides}
    />,
  );
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole<HTMLButtonElement>("button", { name });
}

function openPlan(): HTMLElement {
  fireEvent.click(button("Plan de la leçon"));
  return screen.getByRole("dialog", { name: "Plan de la leçon" });
}

beforeEach(() => {
  vi.clearAllMocks();
  sidebar.open = true;
  stubMatchMedia(() => false);
});

afterEach(cleanup);

describe("where the reader is", () => {
  it("counts the section on screen out of all of them", () => {
    toolbar({ currentStep: 2 });
    expect(document.querySelector(".lesson-toolbar__count")?.textContent).toBe("Section 03/04");
  });

  it("fills its bar as far as the section on screen", () => {
    toolbar({ currentStep: 1 });
    const fill = document.querySelector<HTMLElement>(".lesson-toolbar__bar > span");
    expect(fill?.style.width).toBe("50%");
  });

  it("names the section on screen", () => {
    toolbar({ currentStep: 2 });
    expect(document.querySelector(".lesson-toolbar__name")?.textContent).toBe("Les pare-feu");
  });

  it("rests flush under the navbar, at the height the page's scroll padding counts", () => {
    toolbar();
    const bar = document.querySelector<HTMLElement>(".lesson-toolbar");
    expect(bar?.style.top).toBe(`${String(NAVBAR_HEIGHT)}px`);
    expect(bar?.style.height).toBe(`${String(LESSON_TOOLBAR_HEIGHT)}px`);
  });
});

describe("the steps either side", () => {
  it("has no previous section on the first one", () => {
    toolbar({ currentStep: 0, doneSteps: new Set() });
    expect(button("Section précédente").disabled).toBe(true);
    expect(button("Section suivante").disabled).toBe(false);
  });

  it("goes back and forth", () => {
    toolbar();
    fireEvent.click(button("Section précédente"));
    fireEvent.click(button("Section suivante"));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("waits for the section's exercises, and says how many are left", () => {
    toolbar({ canAdvance: false, pendingCount: 2 });
    const next = button("Section suivante");
    expect(next.disabled).toBe(true);
    expect(next.title).toBe("2 exercices à compléter avant de continuer");
  });

  it("finishes the lesson from its last section, with the XP it gives", () => {
    toolbar({ currentStep: 3, doneSteps: new Set([0, 1, 2]) });
    const finish = button("Terminer la leçon");
    expect(finish.disabled).toBe(false);
    expect(finish.textContent).toContain("+40 XP");
    fireEvent.click(finish);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("has nothing after the last section of a finished lesson", () => {
    toolbar({ currentStep: 3, isCompleted: true });
    expect(screen.queryByRole("button", { name: "Terminer la leçon" })).toBeNull();
    expect(button("Section suivante").disabled).toBe(true);
  });

  it("does not finish twice while the lesson is being saved", () => {
    toolbar({ currentStep: 3, isPending: true });
    expect(button("Terminer la leçon").disabled).toBe(true);
  });

  it("has nothing to finish in an administrator's preview", () => {
    // The page says nothing is recorded there: a "Terminer" recorded a completion.
    toolbar({ currentStep: 3, reviewing: true });
    expect(screen.queryByRole("button", { name: "Terminer la leçon" })).toBeNull();
    expect(button("Section suivante").disabled).toBe(true);
  });
});

describe("the plan", () => {
  it("is closed until asked for", () => {
    toolbar();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button("Plan de la leçon").getAttribute("aria-expanded")).toBe("false");
  });

  it("lists every section, the ones ahead shut until the ones before are read", () => {
    toolbar({ currentStep: 1, doneSteps: new Set([0]) });
    const plan = openPlan();
    const items = within(plan).getAllByRole<HTMLButtonElement>("button", { name: /^\d\d/ });
    expect(items.map((item) => item.textContent)).toEqual([
      "01Introduction✓",
      "02Les ports~",
      "03Les pare-feu-",
      "04Bilan-",
    ]);
    expect(items.map((item) => item.disabled)).toEqual([false, false, true, true]);
    expect(items[1]?.getAttribute("aria-current")).toBe("step");
    expect(within(plan).getByText("Glossaire de la leçon")).toBeTruthy();
  });

  it("opens every section of a finished lesson", () => {
    toolbar({ currentStep: 0, doneSteps: new Set(), isCompleted: true });
    const plan = openPlan();
    const items = within(plan).getAllByRole<HTMLButtonElement>("button", { name: /^\d\d/ });
    expect(items.every((item) => !item.disabled)).toBe(true);
  });

  it("opens a section read before, and closes", () => {
    toolbar({ currentStep: 2, doneSteps: new Set([0, 1]) });
    fireEvent.click(within(openPlan()).getByRole("button", { name: /Introduction/ }));
    expect(onJump).toHaveBeenCalledWith(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on the section on screen without moving", () => {
    toolbar({ currentStep: 1 });
    fireEvent.click(within(openPlan()).getByRole("button", { name: /Les ports/ }));
    expect(onJump).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the notes", () => {
  it("open in a drawer with the reader's note, and close from the same button", () => {
    toolbar();
    expect(screen.queryByRole("dialog", { name: "Mes notes" })).toBeNull();
    fireEvent.click(button("Notes"));
    const notes = screen.getByRole("dialog", { name: "Mes notes" });
    expect(within(notes).getByLabelText<HTMLTextAreaElement>("Note de la leçon").value).toBe(
      "Ma note",
    );
    expect(button("Notes").getAttribute("aria-expanded")).toBe("true");
  });
});

describe("the focus mode", () => {
  it("folds the app sidebar", () => {
    toolbar();
    const focus = button("Mode focus");
    expect(focus.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(focus);
    expect(sidebar.setOpen).toHaveBeenCalledWith(false);
  });

  it("is on while the sidebar is folded, and unfolds it", () => {
    sidebar.open = false;
    toolbar();
    const focus = button("Mode focus");
    expect(focus.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(focus);
    expect(sidebar.setOpen).toHaveBeenCalledWith(true);
  });
});

describe("canOpenSection", () => {
  const at = { currentStep: 2, doneSteps: new Set([0, 3]), isCompleted: false };

  it("opens a section passed or finished, not one ahead", () => {
    expect(canOpenSection(0, at)).toBe(true);
    expect(canOpenSection(1, at)).toBe(true);
    expect(canOpenSection(3, at)).toBe(true);
    expect(canOpenSection(4, at)).toBe(false);
  });

  it("opens anything once the lesson is done", () => {
    expect(canOpenSection(4, { ...at, isCompleted: true })).toBe(true);
  });

  it("opens anything in an administrator's preview", () => {
    expect(canOpenSection(4, { ...at, reviewing: true })).toBe(true);
  });
});
