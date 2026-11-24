import type { MetadataRoute } from "next";
import { SITE_URL } from "./site-url";

/**
 * The fixed part of the sitemap: only the pages a signed-out visitor can
 * actually reach. Everything else lives behind the auth middleware and would
 * answer a crawler with the login page.
 *
 * Apart from sitemap.ts, which adds the catalogue's paths from the database:
 * the tests that check each of these pages against robots.txt and against its
 * own metadata read this list, and need neither a database nor a promise.
 */
type PublicPage = [
  path: string,
  priority: number,
  freq: MetadataRoute.Sitemap[number]["changeFrequency"],
];

const PUBLIC_PAGES: PublicPage[] = [
  ["", 1, "weekly"],
  ["/catalogue", 0.8, "weekly"],
  ["/glossaire", 0.6, "monthly"],
  ["/verify", 0.6, "monthly"],
  ["/contact", 0.4, "yearly"],
  ["/legal", 0.3, "yearly"],
  ["/legal/terms", 0.3, "yearly"],
  ["/privacy", 0.3, "yearly"],
];

export function fixedSitemapEntries(lastModified: Date = new Date()): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map(([path, priority, changeFrequency]) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
