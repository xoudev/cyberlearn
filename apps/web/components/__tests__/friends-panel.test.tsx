// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendActionResult, FriendEntry } from "@/app/(app)/_actions/friend-actions";

const m = vi.hoisted(() => ({
  getFriendsAction: vi.fn(),
  acceptFriendRequestAction: vi.fn<(id: string) => Promise<FriendActionResult>>(),
  removeFriendAction: vi.fn<(id: string) => Promise<FriendActionResult>>(),
}));

vi.mock("@/app/(app)/_actions/friend-actions", () => m);
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { FriendsPanel } = await import("../friends-panel");

/**
 * The navbar's friends: ending a friendship asks first, in the row, and a
 * refusal from the server is said on the row instead of leaving it as it was.
 */

const ALEX = "11111111-1111-4111-8111-111111111111";
const SAM = "22222222-2222-4222-8222-222222222222";

function entry(id: string, displayName: string, status: "PENDING" | "ACCEPTED"): FriendEntry {
  return {
    id: `edge-${id}`,
    status,
    requestedById: id,
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    avatarSrc: null,
    person: {
      id,
      username: displayName.toLowerCase(),
      displayName,
      avatarUrl: null,
      level: 3,
      xpTotal: 300,
    },
  };
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.getFriendsAction.mockResolvedValue({
    incoming: [entry(SAM, "Sam", "PENDING")],
    friends: [entry(ALEX, "Alex", "ACCEPTED")],
    outgoing: [],
  });
  m.removeFriendAction.mockResolvedValue({ ok: true });
  m.acceptFriendRequestAction.mockResolvedValue({ ok: true });
});

async function openPanel(): Promise<void> {
  render(<FriendsPanel initialRequestCount={1} />);
  fireEvent.click(screen.getByRole("button", { name: "1 demandes d'ami en attente" }));
  await screen.findByText("Alex");
}

function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest("li");
  if (row === null) throw new Error(`no row for ${name}`);
  return row;
}

describe("FriendsPanel rows", () => {
  it("asks before ending a friendship, and ends it once answered", async () => {
    await openPanel();
    const row = rowOf("Alex");

    fireEvent.click(within(row).getByRole("button", { name: "Retirer" }));
    expect(m.removeFriendAction).not.toHaveBeenCalled();
    expect(within(row).getByText("Retirer de tes amis ?")).toBeTruthy();
    expect(within(row).getByRole("group", { name: "Retirer Alex de tes amis ?" })).toBeTruthy();

    fireEvent.click(within(row).getByRole("button", { name: "Retirer" }));
    expect(m.removeFriendAction).toHaveBeenCalledWith(ALEX);
    await vi.waitFor(() => {
      expect(screen.queryByText("Alex")).toBeNull();
    });
  });

  it("backs out without a word to the server", async () => {
    await openPanel();
    const row = rowOf("Alex");
    fireEvent.click(within(row).getByRole("button", { name: "Retirer" }));
    fireEvent.click(within(row).getByRole("button", { name: "Annuler" }));
    expect(m.removeFriendAction).not.toHaveBeenCalled();
    // The level is back where the question was.
    expect(within(row).getByText("Niv. 3")).toBeTruthy();
  });

  it("refuses a request straight away: one tap sends it again", async () => {
    await openPanel();
    fireEvent.click(within(rowOf("Sam")).getByRole("button", { name: "Refuser" }));
    expect(m.removeFriendAction).toHaveBeenCalledWith(SAM);
  });

  it("says why the server refused, on the row", async () => {
    m.acceptFriendRequestAction.mockResolvedValue({
      ok: false,
      error: "Cette demande n'est plus en attente.",
    });
    await openPanel();
    fireEvent.click(within(rowOf("Sam")).getByRole("button", { name: "Accepter" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Cette demande n'est plus en attente.",
    );
    expect(screen.getByText("Sam")).toBeTruthy();
  });

  it("says so when the call itself fails", async () => {
    m.removeFriendAction.mockRejectedValue(new Error("network"));
    await openPanel();
    fireEvent.click(within(rowOf("Sam")).getByRole("button", { name: "Refuser" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Impossible pour l'instant/);
  });
});
