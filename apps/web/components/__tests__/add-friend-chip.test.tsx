// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendActionResult } from "@/app/(app)/_actions/friend-actions";

const m = vi.hoisted(() => ({
  sendFriendRequestAction: vi.fn<(id: string) => Promise<FriendActionResult>>(),
  sendFriendRequestByHandleAction: vi.fn<(username: string) => Promise<FriendActionResult>>(),
}));

vi.mock("@/app/(app)/_actions/friend-actions", () => m);

const { AddFriendChip } = await import("../add-friend-chip");

/**
 * "Ajouter" on a list that is not about friends: it asks by id (a classmate)
 * or by the handle the row shows (the leaderboard), then says how it went.
 */

const SAM = "22222222-2222-4222-8222-222222222222";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.sendFriendRequestAction.mockResolvedValue({ ok: true, becameFriends: false });
  m.sendFriendRequestByHandleAction.mockResolvedValue({ ok: true, becameFriends: false });
});

describe("AddFriendChip", () => {
  it("asks a classmate by id, then says the request is on its way", async () => {
    render(<AddFriendChip target={{ id: SAM }} name="Sam" view="none" />);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter Sam en ami" }));
    expect(m.sendFriendRequestAction).toHaveBeenCalledWith(SAM);
    expect(await screen.findByText("Demande envoyée")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("asks a player of the board by handle, and becomes the mark when they had asked", async () => {
    m.sendFriendRequestByHandleAction.mockResolvedValue({ ok: true, becameFriends: true });
    render(<AddFriendChip target={{ username: "lou" }} name="@lou" view="incoming" />);
    fireEvent.click(screen.getByRole("button", { name: "Accepter la demande de @lou" }));
    expect(m.sendFriendRequestByHandleAction).toHaveBeenCalledWith("lou");
    expect(await screen.findByRole("img", { name: "Ami" })).toBeTruthy();
  });

  it("says why the server refused, and stays to try again", async () => {
    m.sendFriendRequestAction.mockResolvedValue({ ok: false, error: "Compte introuvable." });
    render(<AddFriendChip target={{ id: SAM }} name="Sam" view="none" />);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter Sam en ami" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Compte introuvable.");
    expect(screen.getByRole("button", { name: "Ajouter Sam en ami" })).toBeTruthy();
  });

  it("says so when the call itself fails", async () => {
    m.sendFriendRequestAction.mockRejectedValue(new Error("network"));
    render(<AddFriendChip target={{ id: SAM }} name="Sam" view="none" />);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter Sam en ami" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Impossible pour l'instant.");
  });

  it("offers nothing to a friend but the mark, and a sent request is said", () => {
    const { rerender } = render(<AddFriendChip target={{ id: SAM }} name="Sam" view="friends" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img", { name: "Ami" })).toBeTruthy();
    rerender(<AddFriendChip key="sent" target={{ id: SAM }} name="Sam" view="outgoing" />);
    expect(screen.getByText("Demande envoyée")).toBeTruthy();
  });
});
