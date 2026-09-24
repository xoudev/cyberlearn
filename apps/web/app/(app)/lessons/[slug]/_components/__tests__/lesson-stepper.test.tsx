// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Changing section starts the reader at the top of the new one.
 *
 * The "Section suivante" button sits at the bottom of a section. Before, the
 * page kept its scroll position, so the next section opened wherever the
 * previous one had ended: halfway down, or past its end.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../_actions/track-progress", () => ({ completeLesson: vi.fn() }));

const { LessonStepper } = await import("../lesson-stepper");
const { SectionPane } = await import("../section-pane");

const SECTIONS = [
  { text: "Première", id: "premiere" },
  { text: "Deuxième", id: "deuxieme" },
  { text: "Troisième", id: "troisieme" },
];

function Lesson(): React.ReactElement {
  return (
    <LessonStepper
      lessonId="lesson"
      lessonTitle="Leçon"
      xpReward={50}
      isCompleted={false}
      sections={SECTIONS}
    >
      {SECTIONS.map((s, i) => (
        <SectionPane key={s.id} index={i}>
          <p>{s.text} section</p>
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
  window.matchMedia = ((query: string) => ({
    matches: query.includes("reduce") && reducedMotion,
    media: query,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
});

function article(): HTMLElement {
  return screen.getByRole("article");
}

describe("changing section", () => {
  it("does not move the page when the lesson opens", () => {
    render(<Lesson />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("brings the top of the next section into view", () => {
    render(<Lesson />);
    fireEvent.click(screen.getByRole("button", { name: /Section suivante/ }));
    expect(screen.getByText("Deuxième section")).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(article());
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("does the same going back", () => {
    render(<Lesson />);
    fireEvent.click(screen.getByRole("button", { name: /Section suivante/ }));
    fireEvent.click(screen.getByRole("button", { name: /Précédent/ }));
    expect(screen.getByText("Première section")).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("jumps instead of gliding when the reader asked for less motion", () => {
    reducedMotion = true;
    render(<Lesson />);
    fireEvent.click(screen.getByRole("button", { name: /Section suivante/ }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("moves keyboard focus to the new section, named after its heading", () => {
    render(<Lesson />);
    fireEvent.click(screen.getByRole("button", { name: /Section suivante/ }));
    expect(document.activeElement).toBe(article());
    expect(article().getAttribute("aria-label")).toBe("Deuxième");
  });
});
