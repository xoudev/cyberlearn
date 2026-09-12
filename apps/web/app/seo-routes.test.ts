import { describe, expect, it } from "vitest";
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
});
