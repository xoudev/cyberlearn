import type { MetadataRoute } from "next";
import { SITE_URL } from "./site-url";

/**
 * Only the pages a signed-out visitor can actually reach. Everything else lives
 * behind the auth middleware and would answer a crawler with the login page.
 */
type PublicPage = [
  path: string,
  priority: number,
  freq: MetadataRoute.Sitemap[number]["changeFrequency"],
];

const PUBLIC_PAGES: PublicPage[] = [
  ["", 1, "weekly"],
  ["/download", 0.7, "monthly"],
  ["/catalogue", 0.8, "weekly"],
  ["/verify", 0.6, "monthly"],
  ["/contact", 0.4, "yearly"],
  ["/legal", 0.3, "yearly"],
  ["/legal/terms", 0.3, "yearly"],
  ["/privacy", 0.3, "yearly"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PAGES.map(([path, priority, changeFrequency]) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
