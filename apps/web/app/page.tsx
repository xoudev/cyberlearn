import type React from "react";
import type { Metadata } from "next";
import {
  statsRepository,
  type FeaturedPath,
  type LandingStats,
  type PublicCatalogPath,
} from "@cyberlearn/db";
import { builtInPathCover } from "@/lib/paths/cover";
import { LandingClient, type DomainCounts, type HomePath } from "./_components/landing-client";
import { pageAddress } from "./page-metadata";

// The title is the root layout's default. The preview gets a shorter
// description than the search snippet, as it always has.
export const metadata: Metadata = {
  ...pageAddress("/", {
    description:
      "Exercices de code exécutés dans le navigateur, parcours progressifs et certificat vérifiable, en cybersécurité, développement et réseaux.",
  }),
  twitter: {
    card: "summary",
    description:
      "Exercices de code exécutés dans le navigateur, parcours progressifs et certificat vérifiable.",
  },
};

// The stats strip is informative, not real-time: regenerate at most hourly.
export const revalidate = 3600;

/**
 * A featured path with what its poster needs. The cover is the illustration
 * shipped with the site: an uploaded one is a signed URL that lasts an hour,
 * and this page is cached for as long.
 */
function toHomePath(path: FeaturedPath, catalogue: PublicCatalogPath[]): HomePath {
  const entry = catalogue.find((candidate) => candidate.slug === path.slug);
  return {
    ...path,
    refCode: entry?.refCode ?? null,
    hasCertificate: entry?.hasCertificate ?? false,
    coverSrc: builtInPathCover(path),
  };
}

function countByDomain(catalogue: PublicCatalogPath[]): DomainCounts {
  const counts: DomainCounts = { CYBERSEC: 0, DEV: 0, NETWORK: 0 };
  for (const path of catalogue) counts[path.category] += 1;
  return counts;
}

export default async function HomePage(): Promise<React.ReactElement> {
  let stats: LandingStats | null = null;
  let featuredPaths: HomePath[] = [];
  let domainCounts: DomainCounts | null = null;
  try {
    const [landingStats, featured, catalogue] = await Promise.all([
      statsRepository.findLandingStats(),
      statsRepository.findFeaturedPaths(3),
      statsRepository.findPublicCatalog(),
    ]);
    stats = landingStats;
    featuredPaths = featured.map((path) => toHomePath(path, catalogue));
    domainCounts = countByDomain(catalogue);
  } catch {
    // Keep the page available without presenting invented catalogue counters.
  }
  return <LandingClient stats={stats} featuredPaths={featuredPaths} domainCounts={domainCounts} />;
}
