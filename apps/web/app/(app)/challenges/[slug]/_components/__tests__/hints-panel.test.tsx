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
 * The focus stays on it while the call runs and moves to the hint once it is
 * revealed; a call that throws is said, and the button comes back.
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

  it("keeps the focus on the button while it runs, then hands it to the hint", async () => {
    let answer: (value: { content?: string; error?: string }) => void = () => undefined;
    m.revealHintAction.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    render(<HintsPanel hints={HINTS} initialRevealed={{}} userXp={100} />);
    const button = screen.getByRole("button", { name: /Révéler l'indice 01/ });
    button.focus();
    fireEvent.click(button);

    const pending = screen.getByRole("button", { name: /Révélation/ });
    expect(pending.hasAttribute("disabled")).toBe(false);
    expect(pending.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(pending);
    fireEvent.click(pending);
    expect(m.revealHintAction).toHaveBeenCalledTimes(1);

    answer({ content: "Regarde les en-têtes." });
    const hint = await screen.findByRole("group", { name: "Indice 01 révélé" });
    expect(document.activeElement).toBe(hint);
    const describedBy = hint.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe("Regarde les en-têtes.");
  });

  it("leaves a hint revealed on an earlier visit where it is", () => {
    render(<HintsPanel hints={HINTS} initialRevealed={{ h1: "Déjà vu." }} userXp={100} />);
    expect(screen.getByRole("group", { name: "Indice 01 révélé" })).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
  });

  it("says so when the call itself fails, and gives the button back", async () => {
    m.revealHintAction.mockRejectedValue(new Error("network"));
    render(<HintsPanel hints={HINTS} initialRevealed={{}} userXp={100} />);

    fireEvent.click(screen.getByRole("button", { name: /Révéler l'indice 01/ }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/Action impossible/);
    const button = screen.getByRole("button", { name: /Révéler l'indice 01/ });
    expect(button.hasAttribute("aria-disabled")).toBe(false);
  });

  it("says why a reveal failed, where a screen reader hears it", async () => {
    m.revealHintAction.mockResolvedValue({ error: "XP insuffisants." });
    render(<HintsPanel hints={HINTS} initialRevealed={{}} userXp={100} />);

    fireEvent.click(screen.getByRole("button", { name: /Révéler l'indice 01/ }));

    expect((await screen.findByRole("alert")).textContent).toBe("XP insuffisants.");
  });
});
