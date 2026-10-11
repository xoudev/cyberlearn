// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ForumAuthor, ForumTopicSummary } from "@cyberlearn/db";

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

const { TopicRow, authorIsFriend } = await import("../forum-bits");

/**
 * A topic in a list: who opened it, marked when they are one of the reader's
 * friends, as their posts are inside the topic.
 */

const AUTHOR: ForumAuthor = {
  id: "22222222-2222-4222-8222-222222222222",
  username: "sam",
  displayName: "Sam",
  avatarUrl: null,
  level: 4,
  role: "LEARNER",
};

const TOPIC: ForumTopicSummary = {
  id: "33333333-3333-4333-8333-333333333333",
  slug: "subnetting",
  title: "Le découpage en sous-réseaux",
  pinned: false,
  locked: false,
  replyCount: 2,
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  lastPostAt: new Date("2026-10-02T10:00:00.000Z"),
  categorySlug: "reseau",
  categoryName: "Réseau",
  categoryAccent: "#0affd4",
  author: AUTHOR,
  preview: "Le masque /26 laisse 62 hôtes.",
};

afterEach(cleanup);

describe("TopicRow", () => {
  it("marks a topic opened by one of the reader's friends, beside the name", () => {
    render(<TopicRow topic={TOPIC} isFriend />);
    const mark = screen.getByRole("img", { name: "Ami" });
    // On the meta line, right after the author's name and before the date.
    expect(mark.previousSibling?.textContent).toBe("Sam");
    expect(mark.parentElement?.textContent).toMatch(/ouvert par Sam · dernier message/u);
  });

  it("puts no mark beside anybody else", () => {
    render(<TopicRow topic={TOPIC} />);
    expect(screen.queryByRole("img", { name: "Ami" })).toBeNull();
    expect(screen.getByText(/ouvert par Sam · dernier message/u)).toBeTruthy();
  });
});

describe("authorIsFriend", () => {
  it("is true for a friend only, and never for an erased author", () => {
    const friends = new Set([AUTHOR.id]);
    expect(authorIsFriend(AUTHOR, friends)).toBe(true);
    expect(authorIsFriend({ ...AUTHOR, id: "someone-else" }, friends)).toBe(false);
    expect(authorIsFriend(null, friends)).toBe(false);
  });
});
