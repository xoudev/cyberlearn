import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hubSections, TAB_ROUTES } from "../hub";

const APP_DIR = path.resolve(__dirname, "../../app");

/** Whether expo-router has a screen at `route`: app/<route>.tsx or app/<route>/index.tsx. */
function hasScreen(route: string): boolean {
  const segment = route.slice(1);
  return (
    existsSync(path.join(APP_DIR, `${segment}.tsx`)) ||
    existsSync(path.join(APP_DIR, segment, "index.tsx"))
  );
}

describe("hubSections", () => {
  const sections = hubSections();

  it("leads only to screens the app has", () => {
    for (const link of sections.flatMap((section) => section.links)) {
      expect(hasScreen(link.route), link.route).toBe(true);
    }
  });

  it("groups the screens as the site's sidebar does, then the app's own account", () => {
    expect(sections.map((section) => section.title)).toEqual([
      "Apprendre",
      "S'entraîner",
      "Progression",
      "Communauté",
      "Compte",
    ]);
  });

  it("lists no screen the tab bar already leads to", () => {
    const routes = sections.flatMap((section) => section.links.map((link) => link.route));
    for (const tab of TAB_ROUTES) expect(routes).not.toContain(tab);
  });

  it("keeps every screen the hub used to list, each once", () => {
    const routes = sections.flatMap((section) => section.links.map((link) => link.route));
    expect(new Set(routes).size).toBe(routes.length);
    expect([...routes].sort()).toEqual(
      [
        "/my-class",
        "/leaderboard",
        "/friends",
        "/duels",
        "/tournaments",
        "/notes",
        "/locker",
        "/revisions",
        "/offline",
        "/glossary",
        "/challenges",
        "/forum",
        "/support",
        "/notifications",
        "/moderation",
        "/settings",
        "/changelog",
      ].sort(),
    );
  });

  it("puts the duels and the tournaments with the challenges", () => {
    const practice = sections.find((section) => section.key === "practice");
    expect(practice?.links.map((link) => link.label)).toEqual(["Défis", "Duels", "Tournois"]);
  });

  it("closes with the account: what the site keeps in its top bar", () => {
    expect(sections.at(-1)?.links.map((link) => link.route)).toEqual([
      "/friends",
      "/offline",
      "/notifications",
      "/moderation",
      "/settings",
      "/changelog",
    ]);
  });
});
