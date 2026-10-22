// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendActionResult, FriendEntry } from "@/app/(app)/_actions/friend-actions";
import { UNFRIEND_DETAIL } from "@cyberlearn/lib/social/friendship";

const m = vi.hoisted(() => ({
  getFriendsAction: vi.fn(),
  acceptFriendRequestAction: vi.fn<(id: string) => Promise<FriendActionResult>>(),
  removeFriendAction: vi.fn<(id: string) => Promise<FriendActionResult>>(),
}));
const nav = vi.hoisted(() => ({
  push: vi.fn<(href: string) => void>(),
  openDialog: vi.fn<(key: string, value?: string) => void>(),
}));

vi.mock("@/app/(app)/_actions/friend-actions", () => m);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }) }));
// The hook and the host are covered once (query-dialog-host.test.tsx): here,
// which window "Défier" opens, and for whom.
vi.mock("@/hooks/use-query-dialog", () => ({
  useQueryDialog: (key: string) => ({
    value: null,
    open: (value?: string) => {
      nav.openDialog(key, value);
    },
    close: vi.fn(),
  }),
}));
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

function entry(
  id: string,
  displayName: string,
  status: "PENDING" | "ACCEPTED",
  profileOpen = true,
  duelOpen = false,
): FriendEntry {
  return {
    id: `edge-${id}`,
    status,
    requestedById: id,
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    avatarSrc: null,
    profileOpen,
    duelOpen,
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
    const group = within(row).getByRole("group", { name: "Retirer Alex de tes amis ?" });
    // What it does, as on the profile and in the app: read out, not drawn.
    const describedBy = group.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe(UNFRIEND_DETAIL);

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

  it("asks again after a failed removal, instead of keeping the old failure", async () => {
    m.removeFriendAction.mockRejectedValue(new Error("network"));
    await openPanel();
    const row = rowOf("Alex");
    fireEvent.click(within(row).getByRole("button", { name: "Retirer" }));
    fireEvent.click(within(row).getByRole("button", { name: "Retirer" }));
    expect((await within(row).findByRole("alert")).textContent).toMatch(
      /Impossible pour l'instant/,
    );
    await vi.waitFor(() => {
      expect(
        within(row).getByRole("button", { name: "Retirer" }).hasAttribute("aria-disabled"),
      ).toBe(false);
    });

    fireEvent.click(within(row).getByRole("button", { name: "Retirer" }));
    expect(within(row).queryByRole("alert")).toBeNull();
    expect(within(row).getByText("Retirer de tes amis ?")).toBeTruthy();
  });

  it("links a name only when the profile would open for the reader", async () => {
    // Sam's profile is private and Sam has only asked: the page would be a 404.
    m.getFriendsAction.mockResolvedValue({
      incoming: [entry(SAM, "Sam", "PENDING", false)],
      friends: [entry(ALEX, "Alex", "ACCEPTED")],
      outgoing: [],
    });
    await openPanel();
    expect(screen.getByText("Sam").closest("a")).toBeNull();
    expect(screen.getByText("Alex").closest("a")?.getAttribute("href")).toBe("/u/alex");
  });

  it("says so when the call itself fails", async () => {
    m.removeFriendAction.mockRejectedValue(new Error("network"));
    await openPanel();
    fireEvent.click(within(rowOf("Sam")).getByRole("button", { name: "Refuser" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Impossible pour l'instant/);
  });
});

describe("FriendsPanel challenges", () => {
  it("opens the Défier window over the page, the friend picked, and gets out of its way", async () => {
    await openPanel();
    fireEvent.click(within(rowOf("Alex")).getByRole("button", { name: "Défier Alex en duel" }));
    expect(nav.openDialog).toHaveBeenCalledWith("duel", ALEX);
    expect(screen.queryByText("Alex")).toBeNull();
  });

  it("greys Défier while a duel is open between the two, and says why", async () => {
    m.getFriendsAction.mockResolvedValue({
      incoming: [],
      friends: [entry(ALEX, "Alex", "ACCEPTED", true, true)],
      outgoing: [],
    });
    await openPanel();
    const button = within(rowOf("Alex")).getByRole("button", { name: "Duel en cours avec Alex" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.textContent).toBe("Duel en cours");
    fireEvent.click(button);
    expect(nav.openDialog).not.toHaveBeenCalled();
  });

  it("reads the lists again on the next opening, where the duel made since is greyed", async () => {
    await openPanel();
    fireEvent.click(within(rowOf("Alex")).getByRole("button", { name: "Défier Alex en duel" }));
    expect(m.getFriendsAction).toHaveBeenCalledTimes(1);

    m.getFriendsAction.mockResolvedValue({
      incoming: [entry(SAM, "Sam", "PENDING")],
      friends: [entry(ALEX, "Alex", "ACCEPTED", true, true)],
      outgoing: [],
    });
    fireEvent.click(screen.getByRole("button", { name: "1 demandes d'ami en attente" }));
    expect(await screen.findByRole("button", { name: "Duel en cours avec Alex" })).toBeTruthy();
    expect(m.getFriendsAction).toHaveBeenCalledTimes(2);
  });

  it("offers no duel on a request: a duel is between friends", async () => {
    await openPanel();
    expect(within(rowOf("Sam")).queryByRole("button", { name: /Défier/ })).toBeNull();
  });
});

describe("FriendsPanel request count", () => {
  const KIM = "33333333-3333-4333-8333-333333333333";

  it("follows the count the server sends after a request was answered elsewhere", () => {
    // Accepted or refused from a notification: the layout refreshes, and the
    // badge on the button has to go with it.
    const { rerender } = render(<FriendsPanel initialRequestCount={1} />);
    expect(screen.getByRole("button", { name: "1 demandes d'ami en attente" })).toBeTruthy();

    rerender(<FriendsPanel initialRequestCount={0} />);
    expect(screen.getByRole("button", { name: "Amis" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /en attente/ })).toBeNull();
  });

  it("reads the lists again when the count changes under a panel that already loaded them", async () => {
    const { rerender } = render(<FriendsPanel initialRequestCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "1 demandes d'ami en attente" }));
    await screen.findByText("Sam");
    expect(m.getFriendsAction).toHaveBeenCalledTimes(1);

    // The request was answered from the notification: the server's lists
    // no longer hold it, and "Accepter" on the stale row would say "déjà traitée".
    m.getFriendsAction.mockResolvedValue({
      incoming: [],
      friends: [entry(ALEX, "Alex", "ACCEPTED"), entry(SAM, "Sam", "ACCEPTED")],
      outgoing: [],
    });
    rerender(<FriendsPanel initialRequestCount={0} />);

    await vi.waitFor(() => {
      expect(m.getFriendsAction).toHaveBeenCalledTimes(2);
    });
    await vi.waitFor(() => {
      expect(screen.queryByRole("button", { name: "Accepter" })).toBeNull();
    });
    expect(screen.queryByText("Demandes reçues · 1")).toBeNull();
  });

  it("does not read the lists again for a count the panel lowered itself", async () => {
    const { rerender } = render(<FriendsPanel initialRequestCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "1 demandes d'ami en attente" }));
    await screen.findByText("Sam");

    fireEvent.click(within(rowOf("Sam")).getByRole("button", { name: "Accepter" }));
    expect(m.acceptFriendRequestAction).toHaveBeenCalledWith(SAM);
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Amis" })).toBeTruthy();
    });

    // The layout's refresh reaches the panel with the same number it holds.
    rerender(<FriendsPanel initialRequestCount={0} />);
    expect(m.getFriendsAction).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Sam")).toBeTruthy();
  });

  it("lowers the count once when the refresh arrives before the panel has settled", async () => {
    m.getFriendsAction.mockResolvedValue({
      incoming: [entry(SAM, "Sam", "PENDING"), entry(KIM, "Kim", "PENDING")],
      friends: [entry(ALEX, "Alex", "ACCEPTED")],
      outgoing: [],
    });
    const { rerender } = render(<FriendsPanel initialRequestCount={2} />);
    fireEvent.click(screen.getByRole("button", { name: "2 demandes d'ami en attente" }));
    await screen.findByText("Kim");

    // Sam's request is answered here; the server's new count (1) is the first
    // thing to reach the panel, and the lists it reads next hold Kim alone.
    m.getFriendsAction.mockResolvedValue({
      incoming: [entry(KIM, "Kim", "PENDING")],
      friends: [entry(ALEX, "Alex", "ACCEPTED"), entry(SAM, "Sam", "ACCEPTED")],
      outgoing: [],
    });
    rerender(<FriendsPanel initialRequestCount={1} />);
    await vi.waitFor(() => {
      expect(m.getFriendsAction).toHaveBeenCalledTimes(2);
    });
    await screen.findByText("1 en attente");

    // Kim is then answered in the panel: nobody is left waiting, not -1.
    fireEvent.click(within(rowOf("Kim")).getByRole("button", { name: "Accepter" }));
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Amis" })).toBeTruthy();
    });
  });
});

describe("FriendsPanel search", () => {
  it("opens the profile behind a typed handle, and closes", async () => {
    await openPanel();
    fireEvent.change(screen.getByLabelText("Ouvrir un profil"), { target: { value: " @Alex " } });
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(nav.push).toHaveBeenCalledWith("/u/alex");
    expect(screen.queryByLabelText("Ouvrir un profil")).toBeNull();
  });

  it("says, under the field, what a handle is when the one typed cannot be", async () => {
    await openPanel();
    const field = screen.getByLabelText("Ouvrir un profil");
    fireEvent.change(field, { target: { value: "a" } });
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(nav.push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe(
      "Un pseudo compte de 3 à 32 caractères : lettres, chiffres et tirets.",
    );
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });

  it("tells somebody without anyone yet where to find people", async () => {
    m.getFriendsAction.mockResolvedValue({ incoming: [], friends: [], outgoing: [] });
    render(<FriendsPanel initialRequestCount={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Amis" }));
    expect(await screen.findByText(/Personne pour l'instant/)).toBeTruthy();
    expect(screen.getByText(/ta classe ou le classement/)).toBeTruthy();
  });
});

describe("FriendsPanel loading", () => {
  it("says a failed load in the panel, instead of throwing to the site's error screen", async () => {
    m.getFriendsAction.mockRejectedValueOnce(new Error("db down"));
    render(<FriendsPanel initialRequestCount={1} />);
    fireEvent.click(screen.getByRole("button", { name: "1 demandes d'ami en attente" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Chargement impossible/);

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Alex")).toBeTruthy();
    expect(screen.queryByText(/Chargement impossible/)).toBeNull();
  });
});
