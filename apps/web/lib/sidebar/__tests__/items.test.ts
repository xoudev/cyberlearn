import { describe, expect, it } from "vitest";
import { ACCOUNT_LINKS, isActiveHref, sidebarGroups } from "../items";

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

  it("keeps the account pages out of the list", () => {
    const hrefs = sidebarGroups({ ...BASE, hasClasses: true }).flatMap((g) =>
      g.items.map((i) => i.href),
    );
    for (const link of ACCOUNT_LINKS) expect(hrefs).not.toContain(link.href);
    expect(hrefs).not.toContain("/profile");
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
