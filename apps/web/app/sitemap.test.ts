import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  statsRepository: {
    findPublicPathSlugs: vi.fn<() => Promise<{ slug: string; updatedAt: Date }[]>>(),
  },
}));
vi.mock("@cyberlearn/db", () => db);

const { default: sitemap } = await import("./sitemap");
const { fixedSitemapEntries } = await import("./sitemap-pages");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the sitemap", () => {
  it("offers each path of the public catalogue after the fixed pages, with the day it changed", async () => {
    db.statsRepository.findPublicPathSlugs.mockResolvedValue([
      { slug: "linux", updatedAt: new Date("2026-11-01T10:00:00Z") },
      { slug: "pentest", updatedAt: new Date("2026-10-12T08:00:00Z") },
    ]);

    const entries = await sitemap();
    const fixed = fixedSitemapEntries().length;

    expect(entries).toHaveLength(fixed + 2);
    expect(entries.slice(fixed)).toEqual([
      {
        url: "https://cyberlearn.fr/catalogue/linux",
        lastModified: new Date("2026-11-01T10:00:00Z"),
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: "https://cyberlearn.fr/catalogue/pentest",
        lastModified: new Date("2026-10-12T08:00:00Z"),
        changeFrequency: "weekly",
        priority: 0.7,
      },
    ]);
  });

  it("still serves the fixed pages when the database does not answer", async () => {
    db.statsRepository.findPublicPathSlugs.mockRejectedValue(new Error("db down"));

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual(
      fixedSitemapEntries().map((entry) => entry.url),
    );
  });
});
