// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  submitTournamentFlagAction: vi.fn<(input: unknown) => Promise<unknown>>(),
  refresh: vi.fn<() => void>(),
}));

vi.mock("../../../../_actions/tournament-actions", () => ({
  submitTournamentFlagAction: m.submitTournamentFlagAction,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));

const { TournamentFlagForm } = await import("../tournament-flag-form");

/** A flag given in a tournament: the server's answer said, the page read again when it counts. */

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  m.submitTournamentFlagAction.mockReset();
  m.refresh.mockReset();
});

async function give(flag: string): Promise<void> {
  fireEvent.change(screen.getByLabelText(/Flag/u), { target: { value: flag } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    await Promise.resolve();
  });
}

describe("TournamentFlagForm", () => {
  it("counts a right flag and reads the page again", async () => {
    m.submitTournamentFlagAction.mockResolvedValue({
      ok: true,
      correct: true,
      points: 300,
      already: false,
    });
    render(<TournamentFlagForm tournamentId="t1" challengeId="c1" points={300} />);
    await give("CL{bon-flag}");
    expect(m.submitTournamentFlagAction).toHaveBeenCalledWith({
      tournamentId: "t1",
      challengeId: "c1",
      flag: "CL{bon-flag}",
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Flag accepté : +300 points pour toi et ton équipe.",
    );
    expect(m.refresh).toHaveBeenCalled();
  });

  it("says a wrong flag is wrong, and what the server refused", async () => {
    m.submitTournamentFlagAction.mockResolvedValueOnce({ ok: true, correct: false });
    render(<TournamentFlagForm tournamentId="t1" challengeId="c1" points={300} />);
    await give("CL{faux}");
    expect(screen.getByRole("alert").textContent).toBe("Ce n'est pas le flag. Essaie encore.");
    m.submitTournamentFlagAction.mockResolvedValueOnce({
      ok: false,
      error: "Le tournoi est terminé.",
    });
    await give("CL{trop-tard}");
    expect(screen.getByRole("alert").textContent).toBe("Le tournoi est terminé.");
    expect(m.refresh).not.toHaveBeenCalled();
  });
});
