import { describe, expect, it } from "vitest";
import { isActiveHref, sidebarGroups, type SidebarInput } from "../items";

const BASE: SidebarInput = { hasClasses: false, duelInvitations: 0 };

function hrefs(input: SidebarInput): string[] {
  return sidebarGroups(input).flatMap((group) => group.items.map((item) => item.href));
}

function group(input: SidebarInput, label: string): string[] {
  return (
    sidebarGroups(input)
      .find((g) => g.label === label)
      ?.items.map((item) => item.href) ?? []
  );
}

function item(input: SidebarInput, href: string) {
  return sidebarGroups(input)
    .flatMap((g) => g.items)
    .find((i) => i.href === href);
}

describe("sidebarGroups", () => {
  it("opens with the dashboard, alone and unlabelled", () => {
    const [first] = sidebarGroups(BASE);
    expect(first?.label).toBeNull();
    expect(first?.items.map((i) => i.href)).toEqual(["/dashboard"]);
  });

  it("lists the five groups in reading order", () => {
    expect(sidebarGroups(BASE).map((g) => g.label)).toEqual([
      null,
      "Apprendre",
      "S'entraîner",
      "Progression",
      "Communauté",
    ]);
  });

  it("learns from the paths, the lessons, the notes and the glossary", () => {
    expect(group(BASE, "Apprendre")).toEqual(["/paths", "/lessons", "/notes", "/glossaire"]);
  });

  it("practises with the challenges and the duels", () => {
    expect(group(BASE, "S'entraîner")).toEqual(["/challenges", "/duels"]);
  });

  it("follows the progress from the profile, the leaderboard and the locker", () => {
    expect(group(BASE, "Progression")).toEqual(["/profile", "/leaderboard", "/locker"]);
    expect(item(BASE, "/profile")?.label).toBe("Mon profil");
  });

  it("ends the community with the help page, after the classes", () => {
    expect(group(BASE, "Communauté")).toEqual(["/forum", "/support"]);
    expect(group({ ...BASE, hasClasses: true }, "Communauté")).toEqual([
      "/forum",
      "/my-class",
      "/support",
    ]);
  });

  it("counts the duel invitations waiting on the reader, and says what they are", () => {
    expect(item({ ...BASE, duelInvitations: 1 }, "/duels")).toMatchObject({
      count: 1,
      countLabel: "1 invitation en attente",
    });
    expect(item({ ...BASE, duelInvitations: 3 }, "/duels")).toMatchObject({
      count: 3,
      countLabel: "3 invitations en attente",
    });
  });

  it("draws no zero beside the duels", () => {
    expect(item(BASE, "/duels")?.count).toBeNull();
  });

  it("counts nothing but the duels", () => {
    const counted = sidebarGroups({ hasClasses: true, duelInvitations: 2 })
      .flatMap((g) => g.items)
      .filter((i) => i.count !== null)
      .map((i) => i.href);
    expect(counted).toEqual(["/duels"]);
  });

  it("gives every entry an icon of its own", () => {
    const icons = sidebarGroups({ ...BASE, hasClasses: true })
      .flatMap((g) => g.items)
      .map((i) => i.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("lists no page that became a tab: badges, certificates, tournaments", () => {
    for (const hasClasses of [false, true]) {
      const listed = hrefs({ ...BASE, hasClasses });
      for (const href of ["/badges", "/certificates", "/tournaments"]) {
        expect(listed).not.toContain(href);
      }
      // The tournaments are reached from the challenges, listed for everyone.
      expect(listed).toContain("/challenges");
    }
  });

  it("keeps the windows out of the list: they are reached from the navbar", () => {
    // The day's recall included: a window over the page, not a page, its
    // button sits in the top bar beside the bell (components/navbar.tsx).
    const listed = hrefs({ ...BASE, hasClasses: true });
    for (const href of ["/settings", "/changelog", "/review", "/revisions"]) {
      expect(listed).not.toContain(href);
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
