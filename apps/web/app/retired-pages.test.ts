import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

/**
 * Pages that became windows over another page: the page is gone, and its
 * address still lands somewhere, with the window open (docs/dev/dialogs.md).
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
];

describe("pages that became windows", () => {
  it.each(RETIRED)("$source redirects to $destination, not remembered", async (retired) => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects).toContainEqual({
      source: retired.source,
      destination: retired.destination,
      permanent: false,
    });
  });

  it.each(RETIRED)("$page has no page left behind the redirect", ({ page }) => {
    expect(existsSync(path.join(__dirname, "..", page))).toBe(false);
  });
});

describe("a page whose presentation became a window", () => {
  it("sends the mock exam's address to its window unless the window started it", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    expect(redirects).toContainEqual({
      source: "/paths/:slug/mock-exam",
      missing: [{ type: "query", key: "go" }],
      destination: "/paths/:slug?mock=1",
      permanent: false,
    });
    // The exam itself still has its page, reached with ?go=1.
    expect(existsSync(path.join(__dirname, "(app)/paths/[slug]/mock-exam/page.tsx"))).toBe(true);
  });
});
