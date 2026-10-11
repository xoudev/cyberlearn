// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  revealHintAction: vi.fn<(id: string) => Promise<{ content?: string; error?: string }>>(),
}));

vi.mock("../../../_actions/challenge-actions", () => m);

const { HintsPanel } = await import("../hints-panel");

/**
 * A hint is a button: the keyboard reaches it, Enter reveals it, and one the
 * reader cannot pay for is disabled rather than a row that ignores the click.
 */

afterEach(cleanup);

beforeEach(() => {
  m.revealHintAction.mockReset();
});

const HINTS = [
  { id: "h1", orderIndex: 0, xpCost: 0 },
  { id: "h2", orderIndex: 1, xpCost: 50 },
];

describe("HintsPanel", () => {
  it("draws each hint as a button, disabled when the XP is not there", () => {
    render(<HintsPanel hints={HINTS} initialRevealed={{}} userXp={10} />);
    const free = screen.getByRole("button", { name: /Révéler l'indice 01/ });
    const paid = screen.getByRole("button", { name: /Révéler l'indice 02/ });
    expect(free.hasAttribute("disabled")).toBe(false);
    expect(paid.hasAttribute("disabled")).toBe(true);
  });

  it("reveals the hint it is pressed for", async () => {
    m.revealHintAction.mockResolvedValue({ content: "Regarde les en-têtes." });
    render(<HintsPanel hints={HINTS} initialRevealed={{}} userXp={100} />);

    fireEvent.click(screen.getByRole("button", { name: /Révéler l'indice 02/ }));

    expect(m.revealHintAction).toHaveBeenCalledWith("h2");
    expect(await screen.findByText("Regarde les en-têtes.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Révéler l'indice 02/ })).toBeNull();
  });

  it("says why a reveal failed, where a screen reader hears it", async () => {
    m.revealHintAction.mockResolvedValue({ error: "XP insuffisants." });
    render(<HintsPanel hints={HINTS} initialRevealed={{}} userXp={100} />);

    fireEvent.click(screen.getByRole("button", { name: /Révéler l'indice 01/ }));

    expect((await screen.findByRole("alert")).textContent).toBe("XP insuffisants.");
  });
});
