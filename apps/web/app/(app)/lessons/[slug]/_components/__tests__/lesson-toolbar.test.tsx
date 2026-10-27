// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
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

  it("draws a segment per section: read, on screen, still to read", () => {
    toolbar({ currentStep: 1, doneSteps: new Set([0]) });
    const segments = Array.from(
      document.querySelectorAll<HTMLElement>(".lesson-toolbar__segments > *"),
    );
    expect(segments.map((segment) => segment.dataset.state)).toEqual([
      "done",
      "current",
      "ahead",
      "ahead",
    ]);
  });

  it("opens a section read before from its segment, and no section still shut", () => {
    toolbar({ currentStep: 1, doneSteps: new Set([0]) });
    const segments = Array.from(
      document.querySelectorAll<HTMLElement>(".lesson-toolbar__segments > *"),
    );
    // A button where canOpenSection says so; the section on screen and the
    // ones ahead are drawn, not pressed.
    expect(segments.map((segment) => segment.tagName)).toEqual(["BUTTON", "SPAN", "SPAN", "SPAN"]);
    fireEvent.click(segments[0] ?? document.body);
    expect(onJump).toHaveBeenCalledWith(0);
  });

  it("opens a section reached before, after going back from it", () => {
    toolbar({ currentStep: 0, doneSteps: new Set([0]), furthestStep: 2 });
    const segments = Array.from(
      document.querySelectorAll<HTMLElement>(".lesson-toolbar__segments > *"),
    );
    expect(segments.map((segment) => segment.tagName)).toEqual([
      "SPAN",
      "BUTTON",
      "BUTTON",
      "SPAN",
    ]);
  });

  it("keeps its segments to the pointer: the plan says the same to everyone", () => {
    toolbar({ currentStep: 2, doneSteps: new Set([0, 1]) });
    const track = document.querySelector<HTMLElement>(".lesson-toolbar__segments");
    expect(track?.getAttribute("aria-hidden")).toBe("true");
    for (const segment of Array.from(track?.querySelectorAll("button") ?? [])) {
      expect(segment.tabIndex).toBe(-1);
    }
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

  it("gives its buttons 44px at every width, which the bar holds as it is", () => {
    const css = readFileSync(path.resolve(__dirname, "../../../../../globals.css"), "utf8");
    const rule = /\n\.lesson-toolbar__btn \{[^}]*?\sheight: (\d+)px;\s*min-width: (\d+)px;/.exec(
      css,
    );
    expect(rule).not.toBeNull();
    const [height, minWidth] = [Number(rule?.[1]), Number(rule?.[2])];
    expect(height).toBeGreaterThanOrEqual(44);
    expect(minWidth).toBeGreaterThanOrEqual(44);
    // Inside the bar, its borders included: the page's offsets stay as they are.
    expect(height).toBeLessThanOrEqual(LESSON_TOOLBAR_HEIGHT - 2);
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
    const finish = button("Terminer la leçon");
    expect(finish.disabled).toBe(true);
    // Square and still with reduced motion (globals.css), not a spinning ring.
    expect(finish.querySelector(".lesson-toolbar__busy")).not.toBeNull();
    expect(finish.querySelector(".animate-spin")).toBeNull();
    expect(finish.textContent).toContain("Validation…");
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
      "01Introduction, terminée",
      "02Les ports, en cours",
      "03Les pare-feu, à venir",
      "04Bilan, à venir",
    ]);
    expect(items.map((item) => item.dataset.state)).toEqual(["done", "current", "ahead", "ahead"]);
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

  it("opens a section reached before, after going back from it", () => {
    const back = { currentStep: 0, doneSteps: new Set([0]), isCompleted: false, furthestStep: 2 };
    expect(canOpenSection(1, back)).toBe(true);
    expect(canOpenSection(2, back)).toBe(true);
    expect(canOpenSection(3, back)).toBe(false);
  });
});
