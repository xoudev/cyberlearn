// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ForumCategorySummary, ForumTopicSummary } from "@cyberlearn/db";

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

const { ForumHome } = await import("../forum-home");
const CATEGORY: ForumCategorySummary = {
  id: "general",
  slug: "general",
  name: "Général",
  description: "Les discussions communes.",
  accent: "#ff6b2b",
  topicCount: 1,
  lastPostAt: new Date("2026-10-25T10:00:00Z"),
};
const TOPIC: ForumTopicSummary = {
  id: "topic",
  slug: "question",
  title: "Une question de réseau",
  pinned: false,
  locked: true,
  replyCount: 0,
  createdAt: new Date("2026-10-25T10:00:00Z"),
  lastPostAt: new Date("2026-10-25T10:00:00Z"),
  categorySlug: "general",
  categoryName: "Général",
  categoryAccent: "#ff6b2b",
  author: null,
  preview: "Un exemple de question pour ce test.",
};
afterEach(cleanup);

describe("forum home", () => {
  it("keeps the real thread destination, reply count and closed status", () => {
    render(<ForumHome categories={[CATEGORY]} recent={[TOPIC]} friends={new Set()} />);
    const recent = screen.getByRole("region", { name: "Derniers échanges" });
    const link = within(recent).getByRole("link", { name: /Une question de réseau/ });
    expect(link.getAttribute("href")).toBe("/forum/general/question");
    expect(within(link).getByText("Fermé")).toBeTruthy();
    expect(within(link).getByText("0")).toBeTruthy();
    expect(link.textContent).toContain("Lire la discussion");
  });

  it("distinguishes browsing a section from composing in that section", () => {
    const { container } = render(
      <ForumHome categories={[CATEGORY]} recent={[]} friends={new Set()} />,
    );
    const directory = screen.getByRole("navigation", { name: "Les sections" });
    expect(within(directory).getByRole("link").getAttribute("href")).toBe("/forum/general");
    const chooser = container.querySelector("details");
    expect(chooser?.hasAttribute("open")).toBe(false);
    expect(chooser?.querySelector("a")?.getAttribute("href")).toBe("/forum/general?compose=1");
    expect(screen.getByRole("link", { name: "Ouvrir un sujet" }).getAttribute("href")).toBe(
      "/forum/general?compose=1",
    );
  });

  it("shows an honest empty state without inventing threads or a dead compose action", () => {
    const { container } = render(<ForumHome categories={[]} recent={[]} friends={new Set()} />);
    expect(screen.getByText("La première discussion reste à écrire.")).toBeTruthy();
    expect(screen.getByText("Les sections ne sont pas encore disponibles.")).toBeTruthy();
    expect(container.querySelector("details")).toBeNull();
    expect(screen.queryByRole("link", { name: "Ouvrir un sujet" })).toBeNull();
  });
});
