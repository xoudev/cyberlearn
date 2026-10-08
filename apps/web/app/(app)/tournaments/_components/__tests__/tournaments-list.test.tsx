// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TournamentSummary } from "@/lib/tournaments/tournaments";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { TournamentsList } = await import("../tournaments-list");

/**
 * The tournaments list: the tally in the header, a running tournament first
 * with how much of its window has gone by, the ones to come and the ones
 * played under their heads, and the empty state when there is none.
 */

afterEach(() => {
  cleanup();
});

/** A two-hour class tournament to come, with the fields a test sets. */
function tournament(
  fields: Partial<TournamentSummary> & Pick<TournamentSummary, "id">,
): TournamentSummary {
  return {
    title: `Tournoi ${fields.id}`,
    phase: "UPCOMING",
    teamScope: "CLASS",
    startsAt: "2026-10-16T12:00:00.000Z",
    endsAt: "2026-10-16T14:00:00.000Z",
    startsLabel: "vendredi 16 octobre à 14:00",
    endsLabel: "vendredi 16 octobre à 16:00",
    classCount: 2,
    challengeCount: 3,
    ...fields,
  };
}

const LIVE = tournament({
  id: "live",
  title: "CTF de la Toussaint",
  phase: "RUNNING",
  startsAt: "2026-10-16T12:00:00.000Z",
  endsAt: "2026-10-16T14:30:00.000Z",
});
const LATER = tournament({
  id: "later",
  startsAt: "2026-11-20T09:00:00.000Z",
  endsAt: "2026-11-23T09:00:00.000Z",
});
const SOONER = tournament({
  id: "sooner",
  startsAt: "2026-10-30T09:00:00.000Z",
  endsAt: "2026-10-30T09:15:00.000Z",
});
const PLAYED = tournament({
  id: "played",
  phase: "FINISHED",
  startsAt: "2026-09-01T09:00:00.000Z",
  endsAt: "2026-09-02T13:00:00.000Z",
});

/** Halfway through the live tournament's window. */
const NOW = Date.parse("2026-10-16T13:15:00.000Z");

describe("TournamentsList", () => {
  it("counts the tournaments of each phase in the header", () => {
    render(<TournamentsList tournaments={[PLAYED, LATER, LIVE, SOONER]} nowMs={NOW} />);
    const tally = screen.getByLabelText("Les tournois");
    expect(
      within(tally)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["1en cours", "2à venir", "1terminé"]);
  });

  it("puts a running tournament first, its window measured at the server's clock", () => {
    render(<TournamentsList tournaments={[PLAYED, LATER, LIVE, SOONER]} nowMs={NOW} />);
    const live = screen.getByRole("region", { name: "CTF de la Toussaint" });
    expect(live.textContent).toContain("50 % du temps écoulé");
    expect(within(live).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50");
    expect(live.textContent).toContain("2 h 30");
    expect(
      within(live)
        .getByRole("link", { name: /Entrer dans le tournoi/u })
        .getAttribute("href"),
    ).toBe("/tournaments/live");
    // Before the steps that explain the scoring: it is what the page is for.
    const steps = screen.getByText("Un flag, des points");
    expect(live.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lists the ones to come by their start, and the ones played", () => {
    render(<TournamentsList tournaments={[PLAYED, LATER, LIVE, SOONER]} nowMs={NOW} />);
    const upcoming = screen.getByRole("region", { name: "À venir" });
    expect(
      within(upcoming)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Tournoi sooner", "Tournoi later"]);
    expect(upcoming.textContent).toContain("15 min de jeu");
    expect(upcoming.textContent).toContain("3 jours de jeu");
    const finished = screen.getByRole("region", { name: "Terminés" });
    expect(
      within(finished)
        .getByRole("link", { name: /Voir les scores/u })
        .getAttribute("href"),
    ).toBe("/tournaments/played");
    expect(finished.textContent).toContain("1 jour 4 h de jeu");
  });

  it("says there is none yet, without a tally", () => {
    render(<TournamentsList tournaments={[]} nowMs={NOW} />);
    expect(screen.getByText("Aucun tournoi pour l'instant")).toBeTruthy();
    expect(screen.queryByLabelText("Les tournois")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
  });
});
