// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { groupIntoModules } from "@cyberlearn/lib/paths/modules";

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
const { PathCurriculum } = await import("../path-curriculum");
vi.mock("@/components/rappel/rappel-button", () => ({
  RappelButton: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <button type="button" title={title}>
      {children}
    </button>
  ),
}));
const lessons = ["Premiers repères", "Lire une requête", "Observer le réseau"].map(
  (title, index) => ({
    moduleId: null,
    lesson: {
      id: `lesson-${String(index)}`,
      slug: `lesson-${String(index)}`,
      title,
      difficulty: "BEGINNER",
      estimatedMinutes: 20,
      xpReward: 80,
    },
  }),
);
const modules = groupIntoModules(lessons, []);
afterEach(cleanup);

describe("path curriculum", () => {
  it("links completed and readable lessons but never a locked lesson", () => {
    render(
      <PathCurriculum
        pathSlug="network"
        modules={modules}
        lessons={lessons}
        states={["completed", "unlocked", "locked"]}
        resumeSlug="lesson-1"
      />,
    );
    expect(screen.getByRole("link", { name: /Premiers repères/ }).getAttribute("href")).toBe(
      "/lessons/lesson-0",
    );
    const next = screen.getByRole("link", { name: /Lire une requête/ });
    expect(next.getAttribute("href")).toBe("/lessons/lesson-1");
    expect(next.closest("li")?.getAttribute("aria-current")).toBe("step");
    expect(screen.queryByRole("link", { name: /Observer le réseau/ })).toBeNull();
    expect(screen.getByText("À débloquer après « Lire une requête ».")).toBeTruthy();
    expect(screen.getByText("1/3 terminées")).toBeTruthy();
  });

  it("keeps a readable waiver distinct from a completed mission", () => {
    const { container } = render(
      <PathCurriculum
        pathSlug="network"
        modules={modules}
        lessons={lessons}
        states={["unlocked", "unlocked", "locked"]}
        resumeSlug="lesson-1"
      />,
    );
    const waived = screen.getByRole("link", { name: /Premiers repères/ });
    expect(within(waived).getByText("Disponible")).toBeTruthy();
    expect(waived.closest("li")?.hasAttribute("aria-current")).toBe(false);
    expect(screen.getByText("0/3 terminées")).toBeTruthy();
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  });

  it("preserves module order, global lesson numbering and each PDF destination", () => {
    const grouped = lessons.map((lesson, index) => ({
      ...lesson,
      moduleId: index === 0 ? "a" : "b",
    }));
    const moduleGroups = groupIntoModules(grouped, [
      { id: "a", position: 0, title: "Les bases" },
      { id: "b", position: 1, title: "En pratique" },
    ]);
    const { container } = render(
      <PathCurriculum
        pathSlug="network"
        modules={moduleGroups}
        lessons={grouped}
        states={["completed", "unlocked", "locked"]}
        resumeSlug="lesson-1"
      />,
    );
    expect(
      [...container.querySelectorAll(".path-mission h4")].map((element) => element.textContent),
    ).toEqual(lessons.map((item) => item.lesson.title));
    expect(screen.getByText("Mission 03")).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: "Fiche PDF" }).map((link) => link.getAttribute("href")),
    ).toEqual(["/api/paths/network/sheet?module=1", "/api/paths/network/sheet?module=2"]);
  });
});
