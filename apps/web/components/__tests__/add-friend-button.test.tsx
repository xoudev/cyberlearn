// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendActionResult } from "@/app/(app)/_actions/friend-actions";

const m = vi.hoisted(() => ({
  sendFriendRequestAction: vi.fn<(id: string) => Promise<FriendActionResult>>(),
  removeFriendAction: vi.fn<(id: string) => Promise<FriendActionResult>>(),
}));

vi.mock("@/app/(app)/_actions/friend-actions", () => m);

const { AddFriendButton } = await import("../add-friend-button");

/**
 * The button on somebody's profile: a request goes at once, ending a
 * friendship asks first, and a refusal is said whatever the move.
 */

const TARGET = "11111111-1111-4111-8111-111111111111";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.sendFriendRequestAction.mockResolvedValue({ ok: true });
  m.removeFriendAction.mockResolvedValue({ ok: true });
});

describe("AddFriendButton", () => {
  it("sends a request at once", async () => {
    render(<AddFriendButton targetId={TARGET} name="Alex" initialState="none" />);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter en ami" }));
    expect(m.sendFriendRequestAction).toHaveBeenCalledWith(TARGET);
    expect(await screen.findByRole("button", { name: "Annuler la demande" })).toBeTruthy();
  });

  it("asks before ending a friendship, naming who", async () => {
    render(<AddFriendButton targetId={TARGET} name="Alex" initialState="friends" />);
    fireEvent.click(screen.getByRole("button", { name: "Retirer des amis" }));

    expect(m.removeFriendAction).not.toHaveBeenCalled();
    expect(screen.getByText("Retirer Alex de tes amis ?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(m.removeFriendAction).toHaveBeenCalledWith(TARGET);
    expect(await screen.findByRole("button", { name: "Ajouter en ami" })).toBeTruthy();
  });

  it("says why ending it failed, instead of staying silent", async () => {
    m.removeFriendAction.mockResolvedValue({ ok: false, error: "Compte introuvable." });
    render(<AddFriendButton targetId={TARGET} name="Alex" initialState="friends" />);
    fireEvent.click(screen.getByRole("button", { name: "Retirer des amis" }));
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Compte introuvable.");
    expect(screen.getByRole("button", { name: "Retirer des amis" })).toBeTruthy();
  });

  it("says so when the call itself fails", async () => {
    m.sendFriendRequestAction.mockRejectedValue(new Error("network"));
    render(<AddFriendButton targetId={TARGET} name="Alex" initialState="none" />);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter en ami" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Impossible pour l'instant/);
  });
});
