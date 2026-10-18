import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { BoardRow } from "@/lib/leaderboard/boards";

// The page's client half imports the switch's server action; nothing here
// calls it.
vi.mock("@/app/(app)/_settings/privacy/_actions/update-privacy", () => ({
  setFriendsLeaderboardAction: vi.fn(),
}));
vi.mock("@/app/(app)/_actions/friend-actions", () => ({
  sendFriendRequestAction: vi.fn(),
  sendFriendRequestByHandleAction: vi.fn(),
}));

const { addableHandle, PlayerCard, showsFriendMark } = await import("../LeaderboardClient");

/**
 * A row of the board as the server hands it over: named or anonymous, a
 * profile link or none, a friend or not. The card draws what it is given and
 * checks one thing again - that a friend mark never lands on a row that does
 * not say who it is.
 */

function row(overrides: Partial<BoardRow> = {}): BoardRow {
  return {
    rank: 4,
    isCurrentUser: false,
    displayName: "Alex Martin",
    username: "alex",
    avatarUrl: "/avatars/av-2.svg",
    level: 12,
    xpTotal: 4200,
    streakDays: 5,
    hasPublicProfile: true,
    isFriend: false,
    profileHref: "/u/alex",
    avatarSrc: "/avatars/av-2.svg",
    ...overrides,
  };
}

const ANONYMOUS = row({
  displayName: null,
  username: null,
  avatarUrl: null,
  avatarSrc: null,
  hasPublicProfile: false,
  profileHref: null,
});

const render = (entry: BoardRow, markFriends?: boolean): string =>
  renderToStaticMarkup(
    <ol>
      {markFriends === undefined ? (
        <PlayerCard entry={entry} />
      ) : (
        <PlayerCard entry={entry} markFriends={markFriends} />
      )}
    </ol>,
  );

describe("PlayerCard", () => {
  it("links a public player's name to their profile and shows their picture", () => {
    const html = render(row());
    expect(html).toContain('href="/u/alex"');
    expect(html).toContain('src="/avatars/av-2.svg"');
    expect(html).toContain("@alex");
  });

  it("leaves an anonymous row as it was: no link, no picture, a monogram", () => {
    const html = render(ANONYMOUS);
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<img");
    expect(html).toContain("@Anonyme");
  });

  it("marks a public friend", () => {
    expect(render(row({ isFriend: true }))).toContain('aria-label="Ami"');
  });

  it("never marks an anonymous row, even one flagged by mistake", () => {
    expect(render(ANONYMOUS)).not.toContain('aria-label="Ami"');
    // The server never sends this; the row refuses it anyway.
    expect(render({ ...ANONYMOUS, isFriend: true })).not.toContain('aria-label="Ami"');
  });

  it("does not mark the reader's own row nor the friends board's rows", () => {
    expect(render(row({ isFriend: true, isCurrentUser: true }))).not.toContain('aria-label="Ami"');
    expect(render(row({ isFriend: true }), false)).not.toContain('aria-label="Ami"');
  });

  it("names a public player without a profile page, without a link", () => {
    const html = render(row({ hasPublicProfile: false, profileHref: null }));
    expect(html).toContain("@alex");
    // React preloads the picture with a <link href>; what matters is no <a>.
    expect(html).not.toContain("<a ");
  });
});

describe("the row's Ajouter", () => {
  it("asks a stranger, or agrees with somebody who asked, on a public row", () => {
    expect(render(row({ friendship: "none" }))).toContain('aria-label="Ajouter @alex en ami"');
    expect(render(row({ friendship: "incoming" }))).toContain(
      'aria-label="Accepter la demande de @alex"',
    );
  });

  it("says a request already sent, and offers nothing to a friend", () => {
    expect(render(row({ friendship: "outgoing" }))).toContain("Demande envoyée");
    expect(render(row({ friendship: "friends", isFriend: true }))).not.toContain("Ajouter");
  });

  it("offers nothing on an anonymous row, the reader's own, or the friends board", () => {
    expect(render({ ...ANONYMOUS, friendship: null })).not.toContain("Ajouter");
    expect(render(row({ friendship: "none", isCurrentUser: true }))).not.toContain("Ajouter");
    expect(render(row({ friendship: "none" }), false)).not.toContain("Ajouter");
    // A board built without relations (an older caller) offers nothing either.
    expect(render(row())).not.toContain("Ajouter");
  });

  it("asks by the handle the row shows", () => {
    expect(addableHandle(row({ friendship: "none" }))).toBe("alex");
    expect(addableHandle(row({ friendship: "none", username: null }))).toBeNull();
    expect(addableHandle(row({ friendship: "friends" }))).toBeNull();
  });
});

describe("showsFriendMark", () => {
  it("needs the flag and a name on the row", () => {
    expect(showsFriendMark(row({ isFriend: true }))).toBe(true);
    expect(showsFriendMark(row({ isFriend: true, username: null }))).toBe(true);
    expect(showsFriendMark({ ...ANONYMOUS, isFriend: true })).toBe(false);
    expect(showsFriendMark(row())).toBe(false);
  });
});
