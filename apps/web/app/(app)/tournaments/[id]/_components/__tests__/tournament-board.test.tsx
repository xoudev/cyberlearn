// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TournamentView } from "@/lib/tournaments/tournaments";

const m = vi.hoisted(() => ({
  tournamentViewAction: vi.fn<(id: unknown) => Promise<unknown>>(),
}));

vi.mock("../../../_actions/tournament-actions", () => ({
  tournamentViewAction: m.tournamentViewAction,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { TournamentBoard } = await import("../tournament-board");

/**
 * The scoreboard as a player sees it: their team and score, the challenges
 * once started, the teams and the players in order, read again while it runs,
 * and opened at the start without a reload.
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const NOW = "2026-10-16T13:00:00.000Z";

const BASE: TournamentView = {
  id: "t1",
  title: "CTF de la Toussaint",
  phase: "RUNNING",
  teamScope: "CLASS",
  startsAt: "2026-10-16T12:00:00.000Z",
  endsAt: "2026-10-16T14:00:00.000Z",
  startsLabel: "vendredi 16 octobre à 14:00",
  endsLabel: "vendredi 16 octobre à 16:00",
  classCount: 2,
  challengeCount: 1,
  description: "Deux heures.",
  serverNow: NOW,
  role: "player",
  myTeam: "SIO1-A",
  canPlay: true,
  challenges: [
    {
      id: "c1",
      slug: "journal",
      title: "Le journal",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      type: "CTF",
      points: 100,
      solvedByMe: false,
      solvedByMyTeam: true,
      solveCount: 2,
      firstTeam: "SIO1-B",
    },
  ],
  teams: [
    { rank: 1, name: "SIO1-B", detail: "Lycée Victor Hugo", points: 100, solved: 1, isMine: false },
    { rank: 2, name: "SIO1-A", detail: "Lycée Jean Moulin", points: 100, solved: 1, isMine: true },
  ],
  players: [
    { rank: 1, name: "Anonyme", team: "SIO1-B", points: 100, solved: 1, isMe: false },
    { rank: 2, name: "Moi", team: "SIO1-A", points: 0, solved: 0, isMe: true },
  ],
  me: { points: 0, solved: 0, rank: 2 },
};

beforeEach(() => {
  m.tournamentViewAction.mockReset();
});

describe("TournamentBoard", () => {
  it("shows the reader's team, the challenges, the teams and the players", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    render(<TournamentBoard initial={BASE} />);
    expect(screen.getByLabelText("Ta place").textContent).toContain("Tu joues pour SIO1-A");
    expect(screen.getByLabelText("Ta place").textContent).toContain("0 pts · 0 flag · 2e");
    const challenge = screen.getByRole("link", { name: /Le journal/u });
    expect(challenge.getAttribute("href")).toBe("/tournaments/t1/journal");
    expect(challenge.textContent).toContain("trouvé par ton équipe");
    expect(challenge.textContent).toContain("premier : SIO1-B");
    expect(screen.getByLabelText("Les équipes").textContent).toContain("1erSIO1-B");
    expect(screen.getByLabelText("Les joueurs").textContent).toContain("Toi");
    expect(screen.getByText("Fin dans 1 h 00 min")).toBeTruthy();
  });

  it("reads the scoreboard again every few seconds while it runs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    m.tournamentViewAction.mockResolvedValue({
      ...BASE,
      teams: [
        { ...BASE.teams[1], rank: 1, points: 400 },
        { ...BASE.teams[0], rank: 2 },
      ],
    });
    render(<TournamentBoard initial={BASE} />);
    await act(async () => {
      vi.advanceTimersByTime(5100);
      await Promise.resolve();
    });
    expect(m.tournamentViewAction).toHaveBeenCalledWith("t1");
    expect(screen.getByLabelText("Les équipes").textContent).toContain("1erSIO1-A");
    expect(screen.getByLabelText("Les équipes").textContent).toContain("400 pts");
  });

  it("keeps the challenges hidden before the start, and opens them when it comes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T11:59:58.000Z"));
    m.tournamentViewAction.mockResolvedValue({ ...BASE, serverNow: "2026-10-16T12:00:01.000Z" });
    render(
      <TournamentBoard
        initial={{
          ...BASE,
          phase: "UPCOMING",
          challenges: [],
          players: [],
          serverNow: "2026-10-16T11:59:58.000Z",
        }}
      />,
    );
    expect(screen.getByText("Le défi s'ouvre au début du tournoi.")).toBeTruthy();
    expect(screen.queryByLabelText("Les joueurs")).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });
    expect(m.tournamentViewAction).toHaveBeenCalledWith("t1");
    expect(screen.getByRole("link", { name: /Le journal/u })).toBeTruthy();
  });

  it("tells a teacher they follow the scores", () => {
    render(<TournamentBoard initial={{ ...BASE, role: "teacher", myTeam: null, me: null }} />);
    expect(screen.getByText(/Tu suis ce tournoi comme professeur/u)).toBeTruthy();
  });
});
