import type { MetadataRoute } from "next";
import { statsRepository } from "@cyberlearn/db";
import { SITE_URL } from "./site-url";
import { fixedSitemapEntries } from "./sitemap-pages";

// Read again every hour: a path published this morning is offered to
// crawlers today, without a query on each of their visits.
export const revalidate = 3600;

/**
 * The fixed pages (sitemap-pages.ts), then one address per path of the public
 * catalogue (catalogue/[slug]), each with the day it last changed.
 *
 * The fixed pages alone when the database does not answer: a sitemap that
 * failed would take the whole file from the crawlers, where a short one only
 * delays the paths until the next read.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let paths: { slug: string; updatedAt: Date }[] = [];
  try {
    paths = await statsRepository.findPublicPathSlugs();
  } catch {
    // The fixed pages are still worth serving.
  }

  return [
    ...fixedSitemapEntries(),
    ...paths.map(({ slug, updatedAt }) => ({
      url: `${SITE_URL}/catalogue/${slug}`,
      lastModified: updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
