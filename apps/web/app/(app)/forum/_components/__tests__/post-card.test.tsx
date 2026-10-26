// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ForumPostView } from "@cyberlearn/db";

const m = vi.hoisted(() => ({
  editPostAction: vi.fn(),
  hidePostAction:
    vi.fn<(input: { postId: string; path: string }) => Promise<{ ok: boolean; error?: string }>>(),
}));

vi.mock("../../_actions/forum-actions", () => m);
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

const { PostCard } = await import("../post-card");

/**
 * One forum message: taking it down asks first, and the author's name opens
 * their profile only when the page was told the reader may see it.
 */

const POST: ForumPostView = {
  id: "11111111-1111-4111-8111-111111111111",
  content: "Le masque /26 laisse 62 hôtes.",
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  editedAt: null,
  isHidden: false,
  removal: null,
  author: {
    id: "22222222-2222-4222-8222-222222222222",
    username: "sam",
    displayName: "Sam",
    avatarUrl: null,
    level: 4,
    role: "LEARNER",
  },
};

const PATH = "/forum/reseau/subnetting";

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  m.hidePostAction.mockResolvedValue({ ok: true });
});

function renderCard(profileHref: string | null, isFriend = false): void {
  render(
    <PostCard
      post={POST}
      avatarSrc={null}
      profileHref={profileHref}
      canEdit={false}
      canRemove
      path={PATH}
      isFriend={isFriend}
    />,
  );
}

describe("PostCard", () => {
  it("asks before taking a message down, then takes it down", () => {
    renderCard(null);
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    expect(m.hidePostAction).not.toHaveBeenCalled();
    expect(screen.getByText("Retirer ce message ?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(m.hidePostAction).toHaveBeenCalledWith({ postId: POST.id, path: PATH });
  });

  it("backs out on Annuler", () => {
    renderCard(null);
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(m.hidePostAction).not.toHaveBeenCalled();
    expect(screen.queryByText("Retirer ce message ?")).toBeNull();
  });

  it("says why a take-down failed", async () => {
    m.hidePostAction.mockResolvedValue({ ok: false, error: "Message introuvable." });
    renderCard(null);
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Message introuvable.");
  });

  it("says so when the take-down call itself fails, and lets it be tried again", async () => {
    m.hidePostAction.mockRejectedValue(new Error("network"));
    renderCard(null);
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(
      /Suppression impossible pour l'instant/,
    );
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Retirer" }).hasAttribute("aria-disabled")).toBe(
        false,
      );
    });
  });

  describe("a message of the reader's own that is out of the thread", () => {
    function renderOut(removal: ForumPostView["removal"]): void {
      render(
        <PostCard
          post={{ ...POST, isHidden: true, removal }}
          avatarSrc={null}
          profileHref={null}
          canEdit
          canRemove
          path={PATH}
          hidden
        />,
      );
    }

    it("says « retiré » of a message its author took down", () => {
      renderOut("WITHDRAWN");
      expect(screen.getByText(/· retiré/)).toBeTruthy();
    });

    it("says a message the screen holds is waiting for a moderator, not removed", () => {
      // It was posted a moment ago and carries the form's "en attente de
      // validation": it is not gone, and must not read as if it were.
      renderOut("HELD");
      expect(screen.getByText(/· en attente de validation/)).toBeTruthy();
      expect(screen.queryByText(/retiré/)).toBeNull();
    });

    it("says a message a moderator hid was hidden by the moderation, not by the author", () => {
      renderOut("MODERATED");
      expect(screen.getByText(/· masqué par la modération/)).toBeTruthy();
      expect(screen.queryByText(/retiré/)).toBeNull();
    });

    it("keeps « retiré » for a hidden message whose reason is not known", () => {
      renderOut(null);
      expect(screen.getByText(/· retiré/)).toBeTruthy();
    });

    it("offers no tools on any of them: the message is out of the thread", () => {
      renderOut("HELD");
      expect(screen.queryByRole("button", { name: "Modifier" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Retirer" })).toBeNull();
    });
  });

  it("links the author's name to a profile the reader may open", () => {
    renderCard("/u/sam");
    expect(screen.getByRole("link", { name: "Sam" }).getAttribute("href")).toBe("/u/sam");
  });

  it("leaves the name as text when the profile is closed to the reader", () => {
    renderCard(null);
    expect(screen.queryByRole("link", { name: "Sam" })).toBeNull();
    expect(screen.getByText("Sam")).toBeTruthy();
  });

  it("marks an author who is the reader's friend, beside the name and outside the link", () => {
    renderCard("/u/sam", true);
    expect(screen.getByRole("img", { name: "Ami" })).toBeTruthy();
    // The link still says only the name.
    expect(screen.getByRole("link", { name: "Sam" })).toBeTruthy();
  });

  it("offers « Signaler » on somebody else's message, and only where it is asked", () => {
    render(
      <PostCard
        post={POST}
        avatarSrc={null}
        profileHref={null}
        canEdit={false}
        canRemove={false}
        canReport
        path={PATH}
      />,
    );
    expect(screen.getByRole("button", { name: "Signaler ce message" })).toBeTruthy();
    cleanup();

    renderCard(null);
    expect(screen.queryByRole("button", { name: "Signaler ce message" })).toBeNull();
  });

  it("puts no mark beside anybody else", () => {
    renderCard("/u/sam");
    expect(screen.queryByRole("img", { name: "Ami" })).toBeNull();
  });
});
