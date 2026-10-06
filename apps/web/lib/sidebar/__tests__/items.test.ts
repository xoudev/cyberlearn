import { describe, expect, it } from "vitest";
import { isActiveHref, sidebarGroups } from "../items";

const BASE = { hasClasses: false, showRevisions: true, dueReviews: 0 };

function labels(input: typeof BASE): string[] {
  return sidebarGroups(input).flatMap((group) => group.items.map((item) => item.label));
}

describe("sidebarGroups", () => {
  it("opens with the dashboard, alone and unlabelled", () => {
    const [first] = sidebarGroups(BASE);
    expect(first?.label).toBeNull();
    expect(first?.items.map((i) => i.href)).toEqual(["/dashboard"]);
  });

  it("lists the three groups in reading order", () => {
    expect(sidebarGroups(BASE).map((g) => g.label)).toEqual([
      null,
      "Apprendre",
      "Progression",
      "Communauté",
    ]);
  });

  it("leaves the revisions out once they are switched off", () => {
    expect(labels(BASE)).toContain("Révisions");
    expect(labels({ ...BASE, showRevisions: false })).not.toContain("Révisions");
  });

  it("counts the revisions due, and nothing when none are", () => {
    const due = sidebarGroups({ ...BASE, dueReviews: 3 })
      .flatMap((g) => g.items)
      .find((i) => i.href === "/revisions");
    expect(due?.count).toBe(3);
    const none = sidebarGroups(BASE)
      .flatMap((g) => g.items)
      .find((i) => i.href === "/revisions");
    expect(none?.count).toBeNull();
  });

  it("shows the classes only to somebody who has one", () => {
    expect(labels(BASE)).not.toContain("Mes classes");
    expect(labels({ ...BASE, hasClasses: true })).toContain("Mes classes");
  });

  it("lists the locker with the other rewards", () => {
    const progress = sidebarGroups(BASE).find((g) => g.label === "Progression");
    expect(progress?.items.map((i) => i.href)).toEqual([
      "/badges",
      "/certificates",
      "/locker",
      "/leaderboard",
    ]);
  });

  it("ends the community with the help page, after the classes when there are some", () => {
    const without = sidebarGroups(BASE).find((g) => g.label === "Communauté");
    expect(without?.items.map((i) => i.href)).toEqual(["/forum", "/duels", "/support"]);
    const withClasses = sidebarGroups({ ...BASE, hasClasses: true }).find(
      (g) => g.label === "Communauté",
    );
    expect(withClasses?.items.map((i) => i.href)).toEqual([
      "/forum",
      "/duels",
      "/my-class",
      "/support",
    ]);
  });

  it("keeps the account pages out of the list: they are reached from the navbar", () => {
    const hrefs = sidebarGroups({ ...BASE, hasClasses: true }).flatMap((g) =>
      g.items.map((i) => i.href),
    );
    for (const href of ["/profile", "/settings", "/changelog"]) {
      expect(hrefs).not.toContain(href);
    }
  });
});

describe("isActiveHref", () => {
  it("matches the dashboard only on itself", () => {
    expect(isActiveHref("/dashboard", "/dashboard")).toBe(true);
    expect(isActiveHref("/dashboard/anything", "/dashboard")).toBe(false);
  });

  it("gives an entry the pages beneath it, not its lookalikes", () => {
    expect(isActiveHref("/lessons/injection-sql", "/lessons")).toBe(true);
    expect(isActiveHref("/lessons", "/lessons")).toBe(true);
    expect(isActiveHref("/lessonsx", "/lessons")).toBe(false);
  });
});
