// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DuelView } from "@/lib/social/duels";

const m = vi.hoisted(() => ({
  answerDuelAction: vi.fn<(input: unknown) => Promise<unknown>>(),
  duelViewAction: vi.fn<(id: unknown) => Promise<unknown>>(),
  respondToDuelAction: vi.fn<(id: unknown, accept: unknown) => Promise<unknown>>(),
  push: vi.fn<(href: string) => void>(),
  refresh: vi.fn<() => void>(),
}));

vi.mock("../../../_actions/duel-actions", () => ({
  answerDuelAction: m.answerDuelAction,
  duelViewAction: m.duelViewAction,
  respondToDuelAction: m.respondToDuelAction,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push, refresh: m.refresh }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { DuelPlay } = await import("../duel-play");

/**
 * A duel as one player sees it: both scores, the next question, the right
 * answer once wrong, the other's score moving with the page's refresh, the
 * result; and an invitation answered from the duel itself.
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const BASE: DuelView = {
  id: "d1",
  status: "ACTIVE",
  pathTitle: "Linux",
  pathSlug: "linux",
  reader: { id: "me", name: "Moi", username: "moi" },
  other: { id: "alex", name: "Alex", username: "alex" },
  readerIsChallenger: true,
  questionCount: 2,
  readerScore: { answered: 0, correct: 0 },
  otherScore: { answered: 1, correct: 1 },
  winner: null,
  createdAt: "2026-10-08T10:00:00.000Z",
  expiresAt: "2026-10-09T10:00:00.000Z",
  questions: [
    { index: 0, domain: "Les fichiers", question: "Que fait ls ?", options: ["Copie", "Liste"] },
    { index: 1, domain: "Les droits", question: "Que fait chmod ?", options: ["Droits", "Date"] },
  ],
  readerAnswers: [],
};

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
});

describe("DuelPlay", () => {
  it("shows both scores and the next question, then the right answer after a miss", async () => {
    m.answerDuelAction.mockResolvedValue({ ok: true, correct: false, correctIndex: 1 });
    m.duelViewAction.mockResolvedValue({
      ...BASE,
      readerScore: { answered: 1, correct: 0 },
      readerAnswers: [{ index: 0, selected: 0, correct: false, correctIndex: 1 }],
    });
    render(<DuelPlay initial={BASE} />);
    const scores = screen.getByLabelText("Les scores").textContent;
    expect(scores).toContain("0 / 2 répondues");
    expect(scores).toContain("1 / 2 répondues");
    expect(screen.getByText("Que fait ls ?")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copie" }));
      await Promise.resolve();
    });
    expect(m.answerDuelAction).toHaveBeenCalledWith({ duelId: "d1", index: 0, selected: 0 });
    expect(screen.getByText("Raté. La bonne réponse : Liste.")).toBeTruthy();
    expect(screen.getByText("Que fait chmod ?")).toBeTruthy();
  });

  it("reads the duel again every few seconds while it is going on", async () => {
    vi.useFakeTimers();
    m.duelViewAction.mockResolvedValue({ ...BASE, otherScore: { answered: 2, correct: 2 } });
    render(<DuelPlay initial={BASE} />);
    await act(async () => {
      vi.advanceTimersByTime(2600);
      await Promise.resolve();
    });
    expect(m.duelViewAction).toHaveBeenCalledWith("d1");
    expect(screen.getByLabelText("Les scores").textContent).toContain("2 / 2 répondues");
  });

  it("says who won once both are done", () => {
    render(
      <DuelPlay
        initial={{
          ...BASE,
          status: "FINISHED",
          winner: "other",
          readerScore: { answered: 2, correct: 1 },
          otherScore: { answered: 2, correct: 2 },
          readerAnswers: [
            { index: 0, selected: 1, correct: true, correctIndex: 1 },
            { index: 1, selected: 1, correct: false, correctIndex: 0 },
          ],
        }}
      />,
    );
    expect(screen.getByText("Défaite.")).toBeTruthy();
    expect(screen.getByText("1 à 2 contre Alex.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Liste" })).toBeNull();
  });

  it("lets the challenged friend answer the invitation from the duel", async () => {
    m.respondToDuelAction.mockResolvedValue({ ok: true });
    render(
      <DuelPlay
        initial={{ ...BASE, status: "PENDING", readerIsChallenger: false, questions: [] }}
      />,
    );
    expect(screen.getByText(/Alex te défie sur « Linux »/u)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
      await Promise.resolve();
    });
    expect(m.respondToDuelAction).toHaveBeenCalledWith("d1", true);
  });
});
