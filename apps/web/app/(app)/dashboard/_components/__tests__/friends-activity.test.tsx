import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { FriendActivityItem } from "@cyberlearn/lib/social/friend-activity";

// The hook and the host are covered once (query-dialog-host.test.tsx).
vi.mock("@/hooks/use-query-dialog", () => ({
  useQueryDialog: () => ({ value: null, open: vi.fn(), close: vi.fn() }),
}));

const { FriendsActivity } = await import("../friends-activity");

/**
 * "Tes amis" on the dashboard: a friend's moment a line, "Défier" once per
 * friend, greyed into "Duel en cours" while a duel is open, and a sentence
 * when the friends have been quiet.
 */

const NOW = new Date("2026-10-17T12:00:00Z").getTime();

function item(
  key: string,
  friendId: string,
  overrides: Partial<FriendActivityItem["friend"]> = {},
  kind: FriendActivityItem["kind"] = "lesson",
): FriendActivityItem {
  return {
    key,
    kind,
    at: "2026-10-17T09:00:00.000Z",
    title: "Les ports",
    friend: {
      id: friendId,
      name: "Alex",
      username: "alex",
      avatarSrc: null,
      profileOpen: true,
      duelOpen: false,
      ...overrides,
    },
  };
}

const render = (items: FriendActivityItem[]): string =>
  renderToStaticMarkup(<FriendsActivity items={items} now={NOW} />);

describe("FriendsActivity", () => {
  it("says who did what and when, the name opening their profile", () => {
    const html = render([item("lesson:1", "a")]);
    expect(html).toContain("Tes amis");
    expect(html).toContain('href="/u/alex"');
    expect(html).toContain("a terminé la leçon « Les ports »");
    expect(html).toContain("il y a 3 h");
  });

  it("offers Défier once per friend, on their most recent line", () => {
    const html = render([
      item("badge:1", "a", {}, "badge"),
      item("lesson:1", "a"),
      item("lesson:2", "s", { name: "Sam", username: "sam" }),
    ]);
    expect(html.split("Défier").length - 1).toBe(2);
    expect(html).toContain('Défier<span class="sr-only"> Alex en duel</span>');
    expect(html).toContain('Défier<span class="sr-only"> Sam en duel</span>');
  });

  it("says a duel is still open rather than offering another", () => {
    const html = render([item("lesson:1", "a", { duelOpen: true })]);
    expect(html).toContain("Duel en cours");
    expect(html).not.toContain("Alex en duel");
  });

  it("names a friend without a page without a link", () => {
    expect(render([item("lesson:1", "a", { username: null, profileOpen: false })])).not.toContain(
      'href="/u/',
    );
  });

  it("says the friends have been quiet, and offers a duel", () => {
    const html = render([]);
    expect(html).toContain("Rien de neuf chez tes amis pour l&#x27;instant.");
    expect(html).toContain("Défier un ami");
  });
});
