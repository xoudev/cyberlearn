import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { challengesTabHref } from "@cyberlearn/lib/challenges/tabs";
import { profileTabHref } from "@cyberlearn/lib/social/profile-tabs";
import nextConfig from "../next.config";

/**
 * Pages that became windows over another page, or tabs of another page, or
 * that only ever redirected: the page is gone, and its address still lands
 * somewhere, with the window open (docs/dev/dialogs.md), on the tab, or on
 * the page it was sending people to.
 */

const RETIRED = [
  {
    page: "app/(app)/changelog",
    source: "/changelog",
    destination: "/dashboard?news=1",
  },
  {
    page: "app/(app)/forum/[category]/nouveau",
    source: "/forum/:category/nouveau",
    destination: "/forum/:category?compose=1",
  },
  {
    page: "app/(app)/badges",
    source: "/badges",
    destination: profileTabHref("badges"),
  },
  {
    page: "app/(app)/certificates",
    source: "/certificates",
    destination: profileTabHref("certificats"),
  },
  {
    // The list only: a tournament's own pages live on beneath it.
    page: "app/(app)/tournaments/page.tsx",
    source: "/tournaments",
    destination: challengesTabHref("tournois"),
  },
  {
    // The old SM-2 queue, retired: the day's recall is a window now.
    page: "app/(app)/revisions",
    source: "/revisions",
    destination: "/dashboard?rappel=1",
  },
  {
    // An older address of the same queue, a page that only redirected.
    page: "app/(app)/review",
    source: "/review",
    destination: "/dashboard?rappel=1",
  },
  {
    // The mobile app's install page: the site stopped promoting the app on
    // 27 October 2026, for the time being.
    page: "app/download",
    source: "/download",
    destination: "/",
  },
  {
    // Its older French address, sent on to the same place.
    page: "app/telecharger",
    source: "/telecharger",
    destination: "/",
  },
];

async function redirects(): Promise<unknown[]> {
  return (await nextConfig.redirects?.()) ?? [];
}

describe("pages that became windows or tabs", () => {
  it.each(RETIRED)("$source redirects to $destination, not remembered", async (retired) => {
    expect(await redirects()).toContainEqual({
      source: retired.source,
      destination: retired.destination,
      permanent: false,
    });
  });

  it.each(RETIRED)("$page has no page left behind the redirect", ({ page }) => {
    expect(existsSync(path.join(__dirname, "..", page))).toBe(false);
  });

  it("keeps a tournament's own pages", () => {
    expect(existsSync(path.join(__dirname, "(app)/tournaments/[id]/page.tsx"))).toBe(true);
    expect(existsSync(path.join(__dirname, "(app)/tournaments/[id]/[slug]/page.tsx"))).toBe(true);
  });

  it("sends the old French address of the certificates straight to their tab", async () => {
    expect(await redirects()).toContainEqual(
      expect.objectContaining({ source: "/certifs", destination: profileTabHref("certificats") }),
    );
  });
});

describe("a page whose presentation became a window", () => {
  async function mockExamRedirect() {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    return redirects.find((redirect) => redirect.source === "/paths/:slug/mock-exam");
  }

  it("sends the mock exam's address to its window unless the window started it", async () => {
    const redirect = await mockExamRedirect();
    expect(redirect?.destination).toBe("/paths/:slug?mock=1");
    expect(redirect?.permanent).toBe(false);
    expect(redirect?.missing).toContainEqual({ type: "query", key: "go" });
    // The exam itself still has its page, reached with ?go=1.
    expect(existsSync(path.join(__dirname, "(app)/paths/[slug]/mock-exam/page.tsx"))).toBe(true);
  });

  it("redirects a page load only, never the router's requests to the running exam", async () => {
    // Once the exam runs, ?go=1 is off the address, and the hand-in (a server
    // action's POST) and a refresh go to that address: redirected, they would
    // run under the path's page.
    const redirect = await mockExamRedirect();
    expect(redirect?.missing).toEqual(
      expect.arrayContaining([
        { type: "header", key: "next-action" },
        { type: "header", key: "rsc" },
      ]),
    );
  });
});
