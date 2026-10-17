// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DuelFriend, DuelSetup } from "@/lib/social/duels";

/**
 * "Défier un ami" in its window: the friends as cards, one already in a duel
 * shown but not offered, the friend asked for picked, the path, and the new
 * duel's page in place of the window once the challenge is sent.
 */

const m = vi.hoisted(() => ({
  replace: vi.fn<(href: string) => void>(),
  duelSetupAction: vi.fn<() => Promise<DuelSetup>>(),
  createDuelAction:
    vi.fn<
      (input: {
        opponentId: string;
        pathId: string;
      }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>
    >(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: m.replace }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../../_actions/duel-actions", () => ({
  duelSetupAction: m.duelSetupAction,
  createDuelAction: m.createDuelAction,
}));

const { default: ChallengeDialog } = await import("../challenge-dialog");

const ALEX = "22222222-2222-4222-8222-222222222222";
const SAM = "55555555-5555-4555-8555-555555555555";
const BUSY = "66666666-6666-4666-8666-666666666666";
const LINUX = "33333333-3333-4333-8333-333333333333";
const WEB = "77777777-7777-4777-8777-777777777777";

function friend(overrides: Partial<DuelFriend> & { id: string; name: string }): DuelFriend {
  return { username: null, avatarSrc: null, level: 1, openDuelId: null, ...overrides };
}

const SETUP: DuelSetup = {
  friends: [
    friend({ id: ALEX, name: "Alex", username: "alex", level: 4 }),
    friend({ id: BUSY, name: "Lou", username: "lou", level: 2, openDuelId: "d9" }),
    friend({ id: SAM, name: "Sam", level: 7 }),
  ],
  paths: [
    { id: LINUX, title: "Linux" },
    { id: WEB, title: "Web" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  m.duelSetupAction.mockResolvedValue(SETUP);
  // jsdom has no layout: the open list keeps its highlighted option in view.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

async function friendsGroup(): Promise<HTMLElement> {
  return screen.findByRole("group", { name: "Ami" });
}

function radio(group: HTMLElement, name: RegExp): HTMLInputElement {
  return within(group).getByRole<HTMLInputElement>("radio", { name });
}

describe("ChallengeDialog", () => {
  it("shows each friend as a card with their handle and level", async () => {
    render(<ChallengeDialog value="1" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Défier un ami" })).toBeTruthy();
    const group = await friendsGroup();
    const alex = within(group).getByRole("radio", { name: /Alex/u });
    expect(alex.closest("li")?.textContent).toContain("@alex · Niv. 4");
    // Without a handle, the level alone.
    expect(within(group).getByRole("radio", { name: /Sam/u }).closest("li")?.textContent).toContain(
      "Niv. 7",
    );
    expect(m.duelSetupAction).toHaveBeenCalledTimes(1);
  });

  it("shows a friend already in a duel without offering them, with the way to that duel", async () => {
    render(<ChallengeDialog value="1" onClose={vi.fn()} />);
    const group = await friendsGroup();
    expect(within(group).queryByRole("radio", { name: /Lou/u })).toBeNull();
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    const card = within(group).getByText("Lou").closest("li");
    if (card === null) throw new Error("no card for Lou");
    expect(card.textContent).toContain("Duel en cours");
    expect(
      within(card)
        .getByRole("link", { name: /Voir le duel/u })
        .getAttribute("href"),
    ).toBe("/duels/d9");
  });

  it("starts on the friend the window was opened for", async () => {
    render(<ChallengeDialog value={SAM} onClose={vi.fn()} />);
    const group = await friendsGroup();
    expect(radio(group, /Sam/u).checked).toBe(true);
    expect(radio(group, /Alex/u).checked).toBe(false);
  });

  it("starts on the first free friend when the one asked for is already in a duel", async () => {
    render(<ChallengeDialog value={BUSY} onClose={vi.fn()} />);
    const group = await friendsGroup();
    expect(radio(group, /Alex/u).checked).toBe(true);
  });

  it("sends the challenge and opens the new duel in place of the window", async () => {
    m.createDuelAction.mockResolvedValue({ ok: true, id: "d42" });
    render(<ChallengeDialog value="1" onClose={vi.fn()} />);
    const group = await friendsGroup();
    fireEvent.click(within(group).getByRole("radio", { name: /Sam/u }));
    fireEvent.click(screen.getByRole("combobox", { name: "Parcours" }));
    fireEvent.click(screen.getByRole("option", { name: "Web" }));
    fireEvent.click(screen.getByRole("button", { name: /Lancer le défi/u }));

    await vi.waitFor(() => {
      expect(m.replace).toHaveBeenCalledWith("/duels/d42");
    });
    expect(m.createDuelAction).toHaveBeenCalledWith({ opponentId: SAM, pathId: WEB });
  });

  it("says why the server refused, and stays open", async () => {
    m.createDuelAction.mockResolvedValue({
      ok: false,
      error: "Ce parcours n'a pas encore assez de questions pour un duel.",
    });
    render(<ChallengeDialog value={ALEX} onClose={vi.fn()} />);
    await friendsGroup();
    fireEvent.click(screen.getByRole("button", { name: /Lancer le défi/u }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Ce parcours n'a pas encore assez de questions pour un duel.",
    );
    expect(m.createDuelAction).toHaveBeenCalledWith({ opponentId: ALEX, pathId: LINUX });
    expect(m.replace).not.toHaveBeenCalled();
  });

  it("says so when the call itself fails", async () => {
    m.createDuelAction.mockRejectedValue(new Error("network"));
    render(<ChallengeDialog value="1" onClose={vi.fn()} />);
    await friendsGroup();
    fireEvent.click(screen.getByRole("button", { name: /Lancer le défi/u }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Envoi impossible. Réessaie dans un moment.",
    );
  });

  it("cannot be sent when every friend is already in a duel", async () => {
    m.duelSetupAction.mockResolvedValue({
      ...SETUP,
      friends: [friend({ id: BUSY, name: "Lou", openDuelId: "d9" })],
    });
    render(<ChallengeDialog value="1" onClose={vi.fn()} />);
    await friendsGroup();
    expect(screen.getByText(/déjà un duel en cours avec chacun de tes amis/u)).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: /Lancer le défi/u }).disabled,
    ).toBe(true);
  });

  it("says how to make a friend when there is none", async () => {
    m.duelSetupAction.mockResolvedValue({ friends: [], paths: SETUP.paths });
    render(<ChallengeDialog value="1" onClose={vi.fn()} />);
    expect(await screen.findByText("Pas encore d'ami à défier")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Lancer le défi/u })).toBeNull();
  });

  it("says so when the friends cannot be read, and tries again on demand", async () => {
    m.duelSetupAction.mockRejectedValueOnce(new Error("db"));
    render(<ChallengeDialog value="1" onClose={vi.fn()} />);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Impossible de charger tes amis",
    );
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await friendsGroup();
    expect(m.duelSetupAction).toHaveBeenCalledTimes(2);
  });

  it("closes on Escape and from its button", async () => {
    const onClose = vi.fn();
    render(<ChallengeDialog value="1" onClose={onClose} />);
    await friendsGroup();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
