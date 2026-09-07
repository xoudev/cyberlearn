import type React from "react";
import { statsRepository, type FeaturedPath, type LandingStats } from "@cyberlearn/db";
import { LandingClient } from "./_components/landing-client";

// The stats strip is informative, not real-time: regenerate at most hourly.
export const revalidate = 3600;

// Shown when the database is unreachable, notably during CI builds where the
// prerender runs against a placeholder DATABASE_URL. The first successful
// revalidation replaces these with live counters.
const FALLBACK_STATS: LandingStats = {
  domains: 3,
  publishedLessons: 142,
  publishedPaths: 12,
};

export default async function HomePage(): Promise<React.ReactElement> {
  let stats = FALLBACK_STATS;
  let featuredPaths: FeaturedPath[] = [];
  try {
    [stats, featuredPaths] = await Promise.all([
      statsRepository.findLandingStats(),
      statsRepository.findFeaturedPaths(3),
    ]);
  } catch {
    // Keep the landing up even if the database is down: fall back to the
    // static counters rather than failing the whole page.
  }
  return <LandingClient stats={stats} featuredPaths={featuredPaths} />;
}
