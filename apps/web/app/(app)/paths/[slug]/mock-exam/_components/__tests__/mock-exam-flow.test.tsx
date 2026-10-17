// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STICKY_TOP } from "@/lib/chrome";
import type { MockOverview } from "@/lib/exam/mock-exam";

const m = vi.hoisted(() => ({
  startMockExamAction: vi.fn<(pathId: unknown) => Promise<unknown>>(),
  submitMockExamAction: vi.fn<(attemptId: unknown, answers: unknown) => Promise<unknown>>(),
  replace: vi.fn<(href: string) => void>(),
}));

vi.mock("../../_actions/mock-exam-actions", () => ({
  startMockExamAction: m.startMockExamAction,
  submitMockExamAction: m.submitMockExamAction,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: m.replace }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { MockExamFlow } = await import("../mock-exam-flow");

/**
 * The mock exam as a learner goes through it, once the window on the path's
 * page has sent them here: the exam started as the page opens, the questions
 * by module with the clock, the copy handed in, the score by module, the
 * advice and the correction; and the copy handed in by itself at zero. The
 * page brought back without the window's ?go=1 starts nothing.
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Draws the page at an address, as the router would bring it there. */
async function openAt(address: string, overview: MockOverview = OVERVIEW): Promise<void> {
  window.history.replaceState(null, "", address);
  render(<MockExamFlow overview={overview} />);
  await act(async () => {
    await Promise.resolve();
  });
}

/** The page as the window's "Commencer" opens it: the exam starts on its own. */
async function open(overview: MockOverview = OVERVIEW): Promise<void> {
  await openAt("/paths/linux/mock-exam?go=1", overview);
}

const OVERVIEW: MockOverview = {
  pathId: "p1",
  pathSlug: "linux",
  pathTitle: "Linux",
  domains: [
    { domain: "Les fichiers", available: 5, drawn: 3 },
    { domain: "Les droits", available: 3, drawn: 3 },
  ],
  questionCount: 6,
  timeLimitMinutes: 10,
  ready: true,
  running: null,
  history: [{ submittedAt: "2026-10-01T10:00:00.000Z", score: 50, late: false, domains: [] }],
};

const QUESTIONS = [
  { index: 0, domain: "Les fichiers", question: "Que fait ls ?", options: ["Liste", "Copie"] },
  { index: 1, domain: "Les droits", question: "Que fait chmod ?", options: ["Droits", "Date"] },
];

beforeEach(() => {
  m.startMockExamAction.mockReset();
  m.submitMockExamAction.mockReset();
  m.replace.mockReset();
  m.startMockExamAction.mockResolvedValue({
    ok: true,
    attemptId: "a1",
    startedAt: new Date().toISOString(),
    timeLimitMinutes: 10,
    questions: QUESTIONS,
  });
  m.submitMockExamAction.mockResolvedValue({
    ok: true,
    late: false,
    result: {
      score: 50,
      correct: 1,
      total: 2,
      domains: [
        { domain: "Les fichiers", correct: 1, total: 1, percent: 100 },
        { domain: "Les droits", correct: 0, total: 1, percent: 0 },
      ],
      review: [
        {
          index: 0,
          domain: "Les fichiers",
          question: "Que fait ls ?",
          options: ["Liste", "Copie"],
          selected: 0,
          correct: 0,
          right: true,
          explanation: null,
        },
        {
          index: 1,
          domain: "Les droits",
          question: "Que fait chmod ?",
          options: ["Droits", "Date"],
          selected: 1,
          correct: 0,
          right: false,
          explanation: "chmod change les droits.",
        },
      ],
    },
  });
});

describe("MockExamFlow", () => {
  it("starts the exam as the page opens, once, and takes ?go=1 off the address", async () => {
    await open();
    expect(m.startMockExamAction).toHaveBeenCalledTimes(1);
    expect(m.startMockExamAction).toHaveBeenCalledWith("p1");
    expect(screen.getByText("0 / 2 répondues")).toBeTruthy();
    // A reload now lands on the window on the path's page, not on a new paper.
    expect(window.location.pathname).toBe("/paths/linux/mock-exam");
    expect(window.location.search).toBe("");
    expect(m.replace).not.toHaveBeenCalled();
  });

  it("starts nothing when brought back without ?go=1, and goes to the window", async () => {
    // Back or Forward to the page once the exam ran: the router restores it
    // from its cache, and the redirect never sees it.
    await openAt("/paths/linux/mock-exam");
    expect(m.startMockExamAction).not.toHaveBeenCalled();
    expect(m.replace).toHaveBeenCalledWith("/paths/linux?mock=1");
    expect(screen.getByRole("status").textContent).toContain(
      "Retour à la présentation de l'examen…",
    );
    expect(screen.queryByText("0 / 2 répondues")).toBeNull();
  });

  it("runs the exam by module, hands the copy in, and reads the score by module", async () => {
    await open();
    expect(screen.getByText("0 / 2 répondues")).toBeTruthy();
    expect(screen.getByText("10:00")).toBeTruthy();
    expect(screen.getByText("2 questions sans réponse.")).toBeTruthy();
    // A way to each blank question, named with the number it shows.
    expect(screen.getByRole("button", { name: "Aller à la question 01" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Liste"));
    fireEvent.click(screen.getByLabelText("Date"));
    expect(screen.getByText("2 / 2 répondues")).toBeTruthy();
    expect(screen.getByText("Toutes les questions ont une réponse.")).toBeTruthy();
    await act(async () => {
      const [handIn] = screen.getAllByRole("button", { name: "Rendre la copie" });
      if (handIn === undefined) throw new Error("no hand-in button");
      fireEvent.click(handIn);
      await Promise.resolve();
    });
    expect(m.submitMockExamAction).toHaveBeenCalledWith("a1", { "0": 0, "1": 1 });
    expect(screen.getByText("50 %")).toBeTruthy();
    expect(screen.getByText("À revoir en premier : Les droits.")).toBeTruthy();
    const scores = within(screen.getByRole("list", { name: "Score par module" })).getAllByRole(
      "listitem",
    );
    expect(scores[0]?.textContent).toContain("1 / 1 · acquis");
    expect(scores[1]?.textContent).toContain("0 / 1 · à revoir");
    // The scores follow the reader down the correction, under the navbar.
    const scoreColumn = screen.getByRole("list", { name: "Score par module" }).closest("section");
    expect(scoreColumn?.style.top).toBe(`${String(STICKY_TOP)}px`);
    const correction = screen.getByRole("region", { name: "Correction" });
    expect(within(correction).getByText("Droits").closest("li")?.textContent).toContain(
      "Bonne réponse",
    );
    expect(correction.textContent).toContain("chmod change les droits.");
    // The wrong answer is opened on its correction, the right one is not.
    expect(within(correction).getByText("Que fait chmod ?").closest("details")?.open).toBe(true);
    expect(within(correction).getByText("Que fait ls ?").closest("details")?.open).toBe(false);
  });

  it("draws another paper in place from the result", async () => {
    await open();
    await act(async () => {
      const [handIn] = screen.getAllByRole("button", { name: "Rendre la copie" });
      if (handIn === undefined) throw new Error("no hand-in button");
      fireEvent.click(handIn);
      await Promise.resolve();
    });
    await act(async () => {
      const [restart] = screen.getAllByRole("button", {
        name: "Recommencer avec d'autres questions",
      });
      if (restart === undefined) throw new Error("no restart button");
      fireEvent.click(restart);
      await Promise.resolve();
    });
    expect(m.startMockExamAction).toHaveBeenCalledTimes(2);
    expect(screen.getByText("0 / 2 répondues")).toBeTruthy();
  });

  it("does not carry a failed hand-in's error onto the result", async () => {
    m.submitMockExamAction.mockResolvedValueOnce({
      ok: false,
      error: "Trop d'envois. Réessaie dans un moment.",
    });
    await open();
    const handIn = async (): Promise<void> => {
      await act(async () => {
        const [button] = screen.getAllByRole("button", { name: "Rendre la copie" });
        if (button === undefined) throw new Error("no hand-in button");
        fireEvent.click(button);
        await Promise.resolve();
      });
    };
    await handIn();
    expect(screen.getByRole("alert").textContent).toBe("Trop d'envois. Réessaie dans un moment.");
    await handIn();
    expect(m.submitMockExamAction).toHaveBeenCalledTimes(2);
    expect(screen.getByText("50 %")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("hands the copy in by itself when the time is up", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const start = Date.now();
    m.startMockExamAction.mockResolvedValue({
      ok: true,
      attemptId: "a1",
      startedAt: new Date(start).toISOString(),
      timeLimitMinutes: 1,
      questions: QUESTIONS,
    });
    await open();
    await act(async () => {
      vi.advanceTimersByTime(61_000);
      await Promise.resolve();
    });
    expect(m.submitMockExamAction).toHaveBeenCalledTimes(1);
  });

  it("tries the hand-in at zero once, and leaves the retry to the learner", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const start = Date.now();
    m.startMockExamAction.mockResolvedValue({
      ok: true,
      attemptId: "a1",
      startedAt: new Date(start).toISOString(),
      timeLimitMinutes: 1,
      questions: QUESTIONS,
    });
    m.submitMockExamAction.mockResolvedValue({ ok: false, error: "Trop de tentatives." });
    await open();
    // Past zero, then five more ticks of the clock: still a single request.
    for (const ms of [61_000, 1000, 1000, 1000, 1000, 1000]) {
      await act(async () => {
        vi.advanceTimersByTime(ms);
        await Promise.resolve();
      });
    }
    expect(m.submitMockExamAction).toHaveBeenCalledTimes(1);
    const [handIn] = screen.getAllByRole("button", { name: "Rendre la copie" });
    expect(handIn).toBeTruthy();
  });

  it("says why the exam could not start, and tries again on demand", async () => {
    m.startMockExamAction
      .mockResolvedValueOnce({ ok: false, error: "Trop de tentatives. Réessaie plus tard." })
      .mockRejectedValueOnce(new Error("network"));
    await open();
    expect(screen.getByRole("alert").textContent).toBe("Trop de tentatives. Réessaie plus tard.");
    expect(screen.getByRole("link", { name: "Retour au parcours" }).getAttribute("href")).toBe(
      "/paths/linux",
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("alert").textContent).toBe(
      "Impossible de lancer l'examen pour l'instant. Réessaie dans un moment.",
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
      await Promise.resolve();
    });
    expect(m.startMockExamAction).toHaveBeenCalledTimes(3);
    expect(screen.getByText("0 / 2 répondues")).toBeTruthy();
  });

  it("starts nothing on a path with too few questions, and says so", async () => {
    await open({ ...OVERVIEW, ready: false });
    expect(m.startMockExamAction).not.toHaveBeenCalled();
    expect(
      screen.getByText("Ce parcours n'a pas encore assez de questions pour un examen blanc."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
  });
});
