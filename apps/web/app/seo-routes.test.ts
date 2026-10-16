import { describe, expect, it } from "vitest";
import { PROTECTED_ROUTE_PREFIXES } from "@/lib/protected-routes";
import robots from "./robots";
import { SITE_URL } from "./site-url";
import sitemap from "./sitemap";

describe("public SEO routes", () => {
  it("uses the apex production domain everywhere", () => {
    const policy = robots();
    const entries = sitemap();

    expect(SITE_URL).toBe("https://cyberlearn.fr");
    expect(policy.host).toBe(SITE_URL);
    expect(policy.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(
      entries.every((entry) => entry.url === SITE_URL || entry.url.startsWith(`${SITE_URL}/`)),
    ).toBe(true);
    expect(entries.some((entry) => entry.url.includes("www."))).toBe(false);
  });

  it("indexes the public catalogue while keeping account pages private", () => {
    const policy = robots();
    const entries = sitemap();
    const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
    const wildcardRule = rules.find((rule) => rule.userAgent === "*");

    expect(entries.some((entry) => entry.url === `${SITE_URL}/catalogue`)).toBe(true);
    expect(wildcardRule?.allow).toBe("/");
    expect(wildcardRule?.disallow).toEqual(
      expect.arrayContaining(["/dashboard", "/lessons", "/notes", "/api"]),
    );
  });

  it("disallows every route the middleware sends to the login, and the pages under it", () => {
    // robots.ts kept its own list, which missed these five as they were added
    // to the middleware: crawlers indexed the login page under their names.
    const disallowed = disallowedPaths();

    for (const prefix of PROTECTED_ROUTE_PREFIXES) {
      expect(disallowed).toContain(prefix);
      expect(disallowed).toContain(`${prefix}/`);
    }
    expect(disallowed).toEqual(
      expect.arrayContaining(["/forum", "/support", "/my-class", "/duels", "/tournaments"]),
    );
  });

  it("disallows none of the pages the sitemap offers", () => {
    const disallowed = disallowedPaths();

    // A disallow line is a prefix: "/paths" would also cover "/pathsfinder".
    for (const { url } of sitemap()) {
      const path = url.slice(SITE_URL.length) || "/";
      expect(disallowed.filter((rule) => path.startsWith(rule))).toEqual([]);
    }
  });
});

function disallowedPaths(): string[] {
  const policy = robots();
  const rules = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
  const disallow = rules.find((rule) => rule.userAgent === "*")?.disallow ?? [];
  return Array.isArray(disallow) ? disallow : [disallow];
}
