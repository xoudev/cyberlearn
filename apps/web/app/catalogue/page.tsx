import type { Metadata } from "next";
import { statsRepository, type PublicCatalogPath } from "@cyberlearn/db";
import { resolvePathCovers } from "@/lib/paths/cover";
import { PublicCatalogue } from "./public-catalogue";

export const metadata: Metadata = {
  title: "Catalogue des parcours",
  description:
    "Découvre les parcours CyberLearn en cybersécurité, développement et réseaux avant de créer ton compte.",
  alternates: { canonical: "/catalogue" },
};

export const revalidate = 3600;

export default async function CataloguePage(): Promise<React.JSX.Element> {
  let paths: PublicCatalogPath[] = [];
  try {
    paths = await statsRepository.findPublicCatalog();
  } catch {
    // The catalogue remains reachable during a temporary database outage.
  }

  // Regenerated hourly at most, within the hour an uploaded cover's signed
  // URL lasts; a path without one shows its illustration.
  const covers = await resolvePathCovers(paths);
  return (
    <PublicCatalogue
      paths={paths.map((path, index) => ({
        ...path,
        coverSrc: covers[index] ?? `/covers/paths/category-dev.svg`,
      }))}
    />
  );
}
