import { describe, expect, it } from "vitest";
import { NAV_GROUPS, navGroupsFor, type NavGroup } from "./groups";

function labelsOf(groups: ReturnType<typeof navGroupsFor>): (string | null)[] {
  return groups.map((group) => group.label);
}

describe("NAV_GROUPS", () => {
  it("names every entry once, so code can single one out", () => {
    const keys = NAV_GROUPS.flatMap((group) => group.entries.map((entry) => entry.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every entry a place on one side at least", () => {
    for (const entry of NAV_GROUPS.flatMap((group) => group.entries)) {
      expect(entry.web !== null || entry.mobile !== null).toBe(true);
    }
  });

  it("writes every address as a path of its own side", () => {
    for (const entry of NAV_GROUPS.flatMap((group) => group.entries)) {
      for (const href of [entry.web, entry.mobile]) {
        if (href !== null) expect(href).toMatch(/^\/[a-z-]+$/u);
      }
    }
  });
});

describe("navGroupsFor('web')", () => {
  const web = navGroupsFor("web");

  it("lists the dashboard alone, then four headed groups", () => {
    expect(labelsOf(web)).toEqual([null, "Apprendre", "S'entraîner", "Progression", "Communauté"]);
    expect(web[0]?.entries.map((entry) => entry.href)).toEqual(["/dashboard"]);
  });

  it("puts each page in the group the plan gives it, in order", () => {
    expect(web.map((group) => group.entries.map((entry) => entry.label))).toEqual([
      ["Tableau de bord"],
      ["Parcours", "Leçons", "Bloc-notes", "Glossaire"],
      ["Défis", "Duels"],
      ["Mon profil", "Classement", "Casier"],
      ["Forum", "Mes classes", "Aide"],
    ]);
  });

  it("leaves out what the site keeps elsewhere: the tournaments' tab, the top bar's account", () => {
    const keys = web.flatMap((group) => group.entries.map((entry) => entry.key));
    expect(keys).not.toContain("tournaments");
    expect(keys).not.toContain("settings");
    expect(web.map((group) => group.key)).not.toContain("account");
  });

  it("leaves the day's recall to the top bar: a window over the page, not a page", () => {
    const keys = web.flatMap((group) => group.entries.map((entry) => entry.key));
    expect(keys).not.toContain("revisions");
  });
});

describe("navGroupsFor('mobile')", () => {
  const mobile = navGroupsFor("mobile");

  it("keeps the same groups in the same order, and adds the account", () => {
    expect(labelsOf(mobile)).toEqual([
      null,
      "Apprendre",
      "S'entraîner",
      "Progression",
      "Communauté",
      "Compte",
    ]);
  });

  it("leads to the app's screens, the tournaments among them", () => {
    const practice = mobile.find((group) => group.key === "practice");
    expect(practice?.entries.map((entry) => entry.href)).toEqual([
      "/challenges",
      "/duels",
      "/tournaments",
    ]);
    const learn = mobile.find((group) => group.key === "learn");
    expect(learn?.entries.find((entry) => entry.key === "glossary")?.href).toBe("/glossary");
  });

  it("leaves out the profile, where the app's list already is", () => {
    const keys = mobile.flatMap((group) => group.entries.map((entry) => entry.key));
    expect(keys).not.toContain("profile");
  });
});

describe("navGroupsFor", () => {
  it("drops a group left with nothing for that side", () => {
    const groups: NavGroup[] = [
      {
        key: "home",
        label: null,
        entries: [{ key: "dashboard", label: "A", web: "/a", mobile: null }],
      },
      {
        key: "learn",
        label: "B",
        entries: [{ key: "paths", label: "B", web: null, mobile: "/b" }],
      },
    ];
    expect(navGroupsFor("web", groups).map((group) => group.key)).toEqual(["home"]);
    expect(navGroupsFor("mobile", groups).map((group) => group.key)).toEqual(["learn"]);
  });
});
