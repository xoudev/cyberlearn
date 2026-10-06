// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChallengeItem, WeeklyChallenge } from "@/lib/challenges/catalogue";

/**
 * The challenges list: the week's challenge with its bonus and its time left,
 * the tabs that filter the rest, and each card's way in, by its state.
 */

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { ChallengesClient } = await import("../challenges-client");

function item(id: string, over: Partial<ChallengeItem> = {}): ChallengeItem {
  return {
    id,
    refCode: `CL-CHG-00${id}`,
    slug: `defi-${id}`,
    title: `Défi ${id}`,
    description: `L'histoire du défi ${id}.`,
    category: "CYBERSEC",
    difficulty: "BEGINNER",
    type: "CTF",
    xpReward: 50,
    timeLimitMin: 0,
    maxAttempts: 10,
    userAttempts: 0,
    displayStatus: "AVAILABLE",
    lockedByTitle: null,
    prerequisiteSlug: null,
    hintCount: 2,
    xpEarned: null,
    supplied: "La machine « web01 »",
    evidence: {
      listing: [
        { kind: "cmd", text: "ls" },
        { kind: "out", text: "logs/  LISEZMOI.txt" },
      ],
      excerpt: { file: "logs/auth.log", lines: [`Oct 2 sshd ${id}`] },
    },
    ...over,
  };
}

const NOW = Date.parse("2026-10-06T12:00:00Z");
const WEEKLY: WeeklyChallenge = {
  id: "2",
  endsAt: "2026-10-12T00:00:00.000Z",
  multiplier: 2,
  nextId: "3",
};

const ITEMS = [
  item("1", { displayStatus: "COMPLETED", xpEarned: 100 }),
  item("2", { xpReward: 75 }),
  item("3", {
    displayStatus: "LOCKED",
    lockedByTitle: "Défi 2",
    prerequisiteSlug: "defi-2",
    evidence: null,
  }),
  item("4", { displayStatus: "IN_PROGRESS", userAttempts: 3 }),
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  refresh.mockReset();
});

function renderList(items = ITEMS, weekly: WeeklyChallenge | null = WEEKLY): void {
  render(<ChallengesClient items={items} weekly={weekly} nowMs={NOW} />);
}

describe("the week's challenge", () => {
  it("is set apart, with its doubled reward, its evidence and its way in", () => {
    renderList();
    const panel = screen.getByRole("region", { name: "Défi 2" });
    expect(within(panel).getByText("Défi de la semaine")).toBeTruthy();
    expect(within(panel).getByText(/150 XP cette semaine/)).toBeTruthy();
    expect(within(panel).getByText(/^logs\/\s+LISEZMOI\.txt$/u)).toBeTruthy();
    const go = within(panel).getByRole("link", { name: /Relever le défi/ });
    expect(go.getAttribute("href")).toBe("/challenges/defi-2");
  });

  it("counts down to the end of the week, and reads the page again when it ends", () => {
    renderList();
    expect(screen.getByText("5 j 12 h")).toBeTruthy();
    act(() => {
      vi.setSystemTime(Date.parse("2026-10-11T23:59:58Z"));
      vi.advanceTimersByTime(1000);
    });
    // A second later, by the reader's clock.
    expect(screen.getByText("1 s")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
    act(() => {
      vi.setSystemTime(Date.parse("2026-10-12T00:00:01Z"));
      vi.advanceTimersByTime(1000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("sends a learner it is locked for to the challenge that opens it", () => {
    renderList([
      item("2", {
        displayStatus: "LOCKED",
        lockedByTitle: "Défi 1",
        prerequisiteSlug: "defi-1",
        evidence: null,
      }),
    ]);
    const go = screen.getByRole("link", { name: /Termine d'abord « Défi 1 »/ });
    expect(go.getAttribute("href")).toBe("/challenges/defi-1");
    expect(screen.getAllByRole("img", { name: "Contenu verrouillé" }).length).toBeGreaterThan(0);
  });
});

describe("the list", () => {
  it("leaves the week's challenge to its panel, and names next week's", () => {
    renderList();
    const list = screen.getByRole("region", { name: "Tous les défis" });
    expect(within(list).queryByRole("heading", { name: "Défi 2" })).toBeNull();
    expect(within(list).getByRole("link", { name: "Défi 3" }).getAttribute("href")).toBe(
      "/challenges/defi-3",
    );
  });

  it("gives each card its way in: to see, to resume, or to the prerequisite", () => {
    renderList();
    expect(screen.getByRole("link", { name: /Voir le défi/ }).getAttribute("href")).toBe(
      "/challenges/defi-1",
    );
    expect(screen.getByRole("link", { name: /Reprendre · 7 essais restants/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Termine d'abord Défi 2/ }).getAttribute("href")).toBe(
      "/challenges/defi-2",
    );
    expect(screen.getByText("100 XP gagnés")).toBeTruthy();
  });

  it("filters with the tabs, the week's challenge counted", () => {
    renderList();
    expect(screen.getByRole("tab", { name: /Tous 4/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /À faire 2/ }));
    const list = screen.getByRole("region", { name: "Tous les défis" });
    expect(within(list).getByRole("heading", { name: "Défi 2" })).toBeTruthy();
    expect(within(list).getByRole("heading", { name: "Défi 4" })).toBeTruthy();
    expect(within(list).queryByRole("heading", { name: "Défi 1" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Résolus 1/ }));
    expect(within(list).getByRole("heading", { name: "Défi 1" })).toBeTruthy();
  });

  it("says when a tab is empty, and goes back to everything", () => {
    renderList([item("2")]);
    fireEvent.click(screen.getByRole("tab", { name: /Résolus 0/ }));
    expect(screen.getByText("Aucun défi résolu")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voir tous les défis" }));
    expect(screen.getByRole("tab", { name: /Tous/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("tallies where the learner stands", () => {
    renderList();
    const tally = screen.getByRole("list", { name: "Où tu en es" });
    expect(tally.textContent).toContain("1résolu");
    expect(tally.textContent).toContain("1en cours");
    expect(tally.textContent).toContain("1verrouillé");
  });
});
