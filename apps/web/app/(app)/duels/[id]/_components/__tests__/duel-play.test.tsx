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
  openDialog: vi.fn<(key: string, value?: string) => void>(),
}));

// The hook and the host are covered once (query-dialog-host.test.tsx): here,
// which window a button opens, and for whom.
vi.mock("@/hooks/use-query-dialog", () => ({
  useQueryDialog: (key: string) => ({
    value: null,
    open: (value?: string) => {
      m.openDialog(key, value);
    },
    close: vi.fn(),
  }),
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
 * result with the reader's answers and a rematch; and an invitation answered
 * from the duel itself.
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
  reader: { id: "me", name: "Moi", username: "moi", avatarSrc: null, profileHref: null },
  other: { id: "alex", name: "Alex", username: "alex", avatarSrc: null, profileHref: "/u/alex" },
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

  it("draws both pictures, and opens the other's profile from their name", () => {
    render(
      <DuelPlay
        initial={{ ...BASE, other: { ...BASE.other, avatarSrc: "https://signed/alex.png" } }}
      />,
    );
    const scores = screen.getByLabelText("Les scores");
    expect(scores.querySelector("img")?.getAttribute("src")).toBe("https://signed/alex.png");
    expect(screen.getByRole("link", { name: "Alex" }).getAttribute("href")).toBe("/u/alex");
    // The reader's own side is not a link.
    expect(screen.queryByRole("link", { name: "Moi" })).toBeNull();
  });

  it("names the other without a link when their profile is closed to the reader", () => {
    render(<DuelPlay initial={{ ...BASE, other: { ...BASE.other, profileHref: null } }} />);
    expect(screen.queryByRole("link", { name: "Alex" })).toBeNull();
    expect(screen.getAllByText("Alex").length).toBeGreaterThan(0);
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
    // The rematch is the "Défier" window over the result, the same friend picked.
    fireEvent.click(screen.getByRole("button", { name: "Rejouer" }));
    expect(m.openDialog).toHaveBeenCalledWith("duel", "alex");
    // The reader's answers, the right one named where they missed.
    expect(screen.getByText("Ta réponse : Date")).toBeTruthy();
    expect(screen.getByText("Droits")).toBeTruthy();
  });

  it("says why a tied score still has a winner", () => {
    render(
      <DuelPlay
        initial={{
          ...BASE,
          status: "FINISHED",
          winner: "reader",
          readerScore: { answered: 2, correct: 1 },
          otherScore: { answered: 2, correct: 1 },
        }}
      />,
    );
    expect(screen.getByText("Victoire !")).toBeTruthy();
    expect(screen.getByText("À égalité de bonnes réponses : tu as fini avant Alex.")).toBeTruthy();
  });

  it("lets the challenged friend answer the invitation from the duel", async () => {
    m.respondToDuelAction.mockResolvedValue({ ok: true });
    const { rerender } = render(
      <DuelPlay
        initial={{ ...BASE, status: "PENDING", readerIsChallenger: false, questions: [] }}
      />,
    );
    expect(screen.getByText(/Alex te défie sur « Linux »/u)).toBeTruthy();
    // No score before the duel starts: the board says so rather than show zeros.
    expect(screen.getByLabelText("Les scores").textContent).toContain("pas commencé");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
      await Promise.resolve();
    });
    expect(m.respondToDuelAction).toHaveBeenCalledWith("d1", true);
    expect(m.push).toHaveBeenCalledWith("/duels/d1");
    // The page renders again with the duel accepted: the invitation gives way
    // to the first question, as the server's new view says.
    rerender(<DuelPlay initial={{ ...BASE, readerIsChallenger: false }} />);
    expect(screen.queryByRole("button", { name: "Accepter" })).toBeNull();
    expect(screen.getByText("Que fait ls ?")).toBeTruthy();
  });

  it("offers a new duel with the same friend when this one was declined", () => {
    render(<DuelPlay initial={{ ...BASE, status: "DECLINED", questions: [] }} />);
    expect(screen.getByText("Ce duel a été refusé.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Relancer un duel" }));
    expect(m.openDialog).toHaveBeenCalledWith("duel", "alex");
  });
});
