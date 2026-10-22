import type React from "react";
import type { Metadata } from "next";
import { statsRepository, type FeaturedPath, type LandingStats } from "@cyberlearn/db";
import { LandingClient } from "./_components/landing-client";
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

export default async function HomePage(): Promise<React.ReactElement> {
  let stats: LandingStats | null = null;
  let featuredPaths: FeaturedPath[] = [];
  try {
    [stats, featuredPaths] = await Promise.all([
      statsRepository.findLandingStats(),
      statsRepository.findFeaturedPaths(3),
    ]);
  } catch {
    // Keep the page available without presenting invented catalogue counters.
  }
  return <LandingClient stats={stats} featuredPaths={featuredPaths} />;
}
