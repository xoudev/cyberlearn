// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendActionResult } from "@/app/(app)/_actions/friend-actions";
import { UNFRIEND_DETAIL } from "@cyberlearn/lib/social/friendship";

const m = vi.hoisted(() => ({
  sendFriendRequestAction: vi.fn<(id: string) => Promise<FriendActionResult>>(),
  removeFriendAction: vi.fn<(id: string) => Promise<FriendActionResult>>(),
}));

vi.mock("@/app/(app)/_actions/friend-actions", () => m);

const { FriendshipActions } = await import("../friendship-actions");

/**
 * The friendship on somebody's profile: a request goes at once, one received
 * is accepted or refused, a friendship reads as "Ami ✓" with its ending in a
 * menu that asks first, and the duel follows the state rather than the page
 * load.
 */

const TARGET = "11111111-1111-4111-8111-111111111111";

function duelLink(): HTMLElement | null {
  return screen.queryByRole("link", { name: "Défier en duel" });
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.sendFriendRequestAction.mockResolvedValue({ ok: true });
  m.removeFriendAction.mockResolvedValue({ ok: true });
});

describe("FriendshipActions", () => {
  it("sends a request at once, and offers to take it back", async () => {
    render(<FriendshipActions targetId={TARGET} name="Alex" initialState="none" />);
    expect(duelLink()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ajouter en ami" }));
    expect(m.sendFriendRequestAction).toHaveBeenCalledWith(TARGET);
    const next = await screen.findByRole("button", { name: "Annuler la demande" });
    // The pressed button is gone; the keyboard lands on the next one.
    await waitFor(() => {
      expect(document.activeElement).toBe(next);
    });
  });

  it("answers a request received either way", async () => {
    render(<FriendshipActions targetId={TARGET} name="Alex" initialState="incoming" />);
    expect(screen.getByRole("button", { name: "Accepter" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    // Refusing deletes the request, without a question: they can ask again.
    expect(m.removeFriendAction).toHaveBeenCalledWith(TARGET);
    expect(await screen.findByRole("button", { name: "Ajouter en ami" })).toBeTruthy();
  });

  it("offers the duel the moment a request is accepted, without a reload", async () => {
    m.sendFriendRequestAction.mockResolvedValue({ ok: true, becameFriends: true });
    render(<FriendshipActions targetId={TARGET} name="Alex" initialState="incoming" />);
    expect(duelLink()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
    expect(m.sendFriendRequestAction).toHaveBeenCalledWith(TARGET);
    expect(await screen.findByRole("button", { name: "Ami ✓" })).toBeTruthy();
    expect(duelLink()?.getAttribute("href")).toBe(`/duels?duel=${TARGET}`);
  });

  it("shows a friendship as a state, with its ending behind a menu that asks first", async () => {
    render(<FriendshipActions targetId={TARGET} name="Alex" initialState="friends" />);
    expect(screen.queryByRole("button", { name: "Retirer des amis" })).toBeNull();
    expect(duelLink()).not.toBeNull();

    const chip = screen.getByRole("button", { name: "Ami ✓" });
    expect(chip.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Retirer des amis" }));
    expect(m.removeFriendAction).not.toHaveBeenCalled();
    expect(screen.getByText("Retirer Alex de tes amis ?")).toBeTruthy();
    // The same words as the app's dialog: what ending it does, and does not.
    expect(screen.getByText(UNFRIEND_DETAIL)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(m.removeFriendAction).toHaveBeenCalledWith(TARGET);
    const next = await screen.findByRole("button", { name: "Ajouter en ami" });
    await waitFor(() => {
      expect(document.activeElement).toBe(next);
    });
    // No duel with somebody who is no longer a friend.
    expect(duelLink()).toBeNull();
  });

  it("closes the menu on Escape and gives the keyboard back to the state", () => {
    render(<FriendshipActions targetId={TARGET} name="Alex" initialState="friends" />);
    const chip = screen.getByRole("button", { name: "Ami ✓" });
    fireEvent.click(chip);
    fireEvent.keyDown(screen.getByRole("button", { name: "Retirer des amis" }), { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Retirer des amis" })).toBeNull();
    expect(document.activeElement).toBe(chip);
  });

  it("says why ending it failed, and stays friends", async () => {
    m.removeFriendAction.mockResolvedValue({ ok: false, error: "Compte introuvable." });
    render(<FriendshipActions targetId={TARGET} name="Alex" initialState="friends" />);
    fireEvent.click(screen.getByRole("button", { name: "Ami ✓" }));
    fireEvent.click(screen.getByRole("button", { name: "Retirer des amis" }));
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Compte introuvable.");
    expect(screen.getByRole("button", { name: "Ami ✓" })).toBeTruthy();
    expect(duelLink()).not.toBeNull();
  });

  it("says so when the call itself fails", async () => {
    m.sendFriendRequestAction.mockRejectedValue(new Error("network"));
    render(<FriendshipActions targetId={TARGET} name="Alex" initialState="none" />);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter en ami" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Impossible pour l'instant/);
  });
});
