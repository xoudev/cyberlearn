import { existsSync } from "node:fs";
import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";
import { OPEN_GRAPH_SITE, pageAddress } from "./page-metadata";
import { SITE_URL } from "./site-url";
import sitemap from "./sitemap";

/**
 * Each public page's canonical link and link preview are its own.
 *
 * Next merges metadata one key deep, so whatever the root layout declares
 * under `alternates` or `openGraph` is the whole object for every page that
 * declares none. It used to declare the home page's: the legal pages and
 * /verify, listed in the sitemap, told Google they were duplicates of the
 * home page, and a shared certificate previewed as the home page.
 */

// What the modules below import and these tests do not look at.
vi.mock("next/font/google", () => ({
  Plus_Jakarta_Sans: () => ({ variable: "font-sans" }),
  JetBrains_Mono: () => ({ variable: "font-mono" }),
  Barlow_Condensed: () => ({ variable: "font-display" }),
  Space_Grotesk: () => ({ variable: "font-interface" }),
}));
vi.mock("@/components/splash-screen", () => ({ SplashScreen: () => null }));
vi.mock("@/components/cookie-banner", () => ({ CookieBanner: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@cyberlearn/db", () => ({ statsRepository: {} }));
vi.mock("@/lib/paths/cover", () => ({ resolvePathCovers: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getRequestUser: vi.fn(), getActiveBan: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("./_components/landing-client", () => ({ LandingClient: () => null }));

// Imported up front rather than in each test: loading a page's module tree is
// slow enough to run into a test's timeout on a busy machine.
const root = await import("./layout");

/** What each page of the sitemap declares, from where it declares it. */
const SOURCES: Record<string, Metadata> = {
  "/": (await import("./page")).metadata,
  "/download": (await import("./download/page")).metadata,
  "/catalogue": (await import("./catalogue/page")).metadata,
  "/glossaire": (await import("./glossaire/page")).metadata,
  "/verify": (await import("./verify/page")).metadata,
  "/contact": (await import("./contact/layout")).metadata,
  "/legal": (await import("./legal/page")).metadata,
  "/legal/terms": (await import("./legal/terms/page")).metadata,
  "/privacy": (await import("./privacy/page")).metadata,
};

describe("pageAddress", () => {
  it("names the page as its own canonical and as its preview's address", () => {
    expect(pageAddress("/legal")).toEqual({
      alternates: { canonical: "/legal" },
      openGraph: { ...OPEN_GRAPH_SITE, url: "/legal" },
    });
  });

  it("keeps the site's part of the preview, which a page's openGraph replaces", () => {
    const { openGraph } = pageAddress("/verify/abc", { description: "Un certificat." });

    expect(openGraph).toMatchObject({
      siteName: "CyberLearn",
      locale: "fr_FR",
      type: "website",
      url: "/verify/abc",
      description: "Un certificat.",
    });
  });

  it("gives every preview the site's picture, served from public/", () => {
    const { openGraph } = pageAddress("/legal");

    expect(openGraph).toMatchObject({
      images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "CyberLearn" }],
    });
    expect(existsSync(new URL("../public/icon-512.png", import.meta.url))).toBe(true);
  });
});

describe("the root layout", () => {
  it("declares no canonical link and no page's preview for the pages under it", () => {
    const { metadata } = root;

    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).toEqual(OPEN_GRAPH_SITE);
    expect(metadata.twitter).toEqual({ card: "summary" });
  });
});

describe("the pages of the sitemap", () => {
  const paths = sitemap().map(({ url }) => url.slice(SITE_URL.length) || "/");

  it("all have a source listed here", () => {
    expect(Object.keys(SOURCES).sort()).toEqual([...paths].sort());
  });

  it.each(paths)("%s is its own canonical and its own preview's address", (path) => {
    const metadata = SOURCES[path];
    if (metadata === undefined) throw new Error(`no metadata source for ${path}`);

    expect(metadata.alternates?.canonical).toBe(path);
    expect(metadata.openGraph).toMatchObject({ url: path, siteName: "CyberLearn" });
  });
});
