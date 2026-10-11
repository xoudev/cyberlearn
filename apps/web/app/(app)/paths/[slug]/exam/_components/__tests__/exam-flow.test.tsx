// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unlockDateLabel } from "@/lib/exam/cooldown-label";

const m = vi.hoisted(() => ({
  startQuizAttempt: vi.fn<(pathId: string) => Promise<unknown>>(),
  submitQuizAttempt: vi.fn<(attemptId: string, answers: unknown) => Promise<unknown>>(),
  refresh: vi.fn(),
}));

vi.mock("../../../_actions/quiz-actions", () => ({
  startQuizAttempt: m.startQuizAttempt,
  submitQuizAttempt: m.submitQuizAttempt,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));

const { ExamFlow, RetryAfterWait } = await import("../exam-flow");

/**
 * The final exam after a fail: the next attempt stays locked while the wait
 * runs, counting down to it and naming the day it ends, then opens and leads
 * back to the rules. It used to be a button disabled for good.
 */

const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);
const SECOND = 1000;

const PROPS = {
  pathId: "p1",
  pathSlug: "python",
  pathTitle: "Python",
  refCode: "CL-PTH-001",
  hasQuiz: true,
  lessonsComplete: true,
  pathCompleted: false,
  certPublicId: null,
  questionCount: 1,
  passThreshold: 70,
  timeLimitMinutes: 30,
  resumeStartedAtMs: null,
  cooldownUntilMs: null,
};

/** Lets the mocked server actions answer, inside act. */
async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

function tick(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function button(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(NOW);
  m.startQuizAttempt.mockReset();
  m.submitQuizAttempt.mockReset();
  m.refresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("RetryAfterWait", () => {
  it("counts down while the wait runs, then opens the next attempt", () => {
    const until = NOW + 2 * SECOND;
    const onRetry = vi.fn();
    render(<RetryAfterWait untilMs={until} pathSlug="python" onRetry={onRetry} />);

    expect(button("Réessayer dans 2 s")).toHaveProperty("disabled", true);
    expect(document.querySelector(".r-cooldown")?.textContent).toContain(
      `Nouvelle tentative possible le ${unlockDateLabel(until)}`,
    );
    expect(screen.queryByRole("button", { name: "Réessayer l'examen" })).toBeNull();

    tick(SECOND);
    expect(button("Réessayer dans 1 s")).toHaveProperty("disabled", true);

    tick(SECOND);
    const retry = button("Réessayer l'examen");
    expect(retry).toHaveProperty("disabled", false);
    expect(document.querySelector(".r-cooldown")).toBeNull();
    // The clock stops with the wait.
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("opens the next attempt at once when there is no wait to count", () => {
    const onRetry = vi.fn();
    render(<RetryAfterWait untilMs={null} pathSlug="python" onRetry={onRetry} />);

    expect(button("Réessayer l'examen")).toHaveProperty("disabled", false);
    expect(document.querySelector(".r-cooldown")).toBeNull();
    // No clock left running: an interval would still be pending after this.
    tick(5 * SECOND);
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole("link", { name: "Revoir le parcours" }).getAttribute("href")).toBe(
      "/paths/python",
    );
  });
});

describe("ExamFlow", () => {
  it("after a failed copy, waits, then goes back to the rules read again", async () => {
    m.startQuizAttempt.mockResolvedValue({
      ok: true,
      attemptId: "a1",
      questions: [
        {
          id: "q1",
          question: "Que vaut len([1, 2]) ?",
          options: [
            { id: "a", text: "1" },
            { id: "b", text: "2" },
          ],
        },
      ],
      startedAt: new Date(NOW),
    });
    m.submitQuizAttempt.mockResolvedValue({
      ok: true,
      score: 0,
      passed: false,
      results: [{ questionId: "q1", selected: "a", correct: false, explanation: null }],
      cooldownUntil: new Date(NOW + 2 * SECOND),
    });
    render(<ExamFlow {...PROPS} />);

    fireEvent.click(button("Commencer l'examen"));
    await settle();
    expect(m.startQuizAttempt).toHaveBeenCalledWith("p1");
    fireEvent.click(screen.getByRole("button", { name: /^A\s*1/ }));
    fireEvent.click(button("Terminer l'examen"));
    await settle();
    expect(m.submitQuizAttempt).toHaveBeenCalledWith("a1", { q1: "a" });

    expect(screen.getByText("Seuil non atteint.")).toBeTruthy();
    expect(button("Réessayer dans 2 s")).toHaveProperty("disabled", true);

    tick(2 * SECOND);
    fireEvent.click(button("Réessayer l'examen"));

    expect(screen.getByRole("button", { name: "Commencer l'examen" })).toBeTruthy();
    expect(m.refresh).toHaveBeenCalledTimes(1);
  });

  it("names the day the wait ends on the rules, once in the browser", () => {
    const until = NOW + 30 * 60 * 60 * SECOND;
    render(<ExamFlow {...PROPS} cooldownUntilMs={until} />);

    expect(button("Commencer l'examen")).toHaveProperty("disabled", true);
    expect(
      screen.getByText(
        `Examen déjà passé récemment : nouvelle tentative possible le ${unlockDateLabel(until)}.`,
      ),
    ).toBeTruthy();
  });

  it("leaves the date out of the server's render, which knows no reader's clock", () => {
    const html = renderToStaticMarkup(
      <ExamFlow {...PROPS} cooldownUntilMs={NOW + 30 * 60 * 60 * SECOND} />,
    );

    expect(html).toContain("réessaie après le délai");
    expect(html).not.toContain("nouvelle tentative possible");
  });
});
