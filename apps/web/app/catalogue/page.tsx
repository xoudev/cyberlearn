import type { Metadata } from "next";
import { statsRepository, type PublicCatalogPath } from "@cyberlearn/db";
import { getActiveBan, getRequestUser } from "@/lib/auth";
import { pageAddress } from "@/app/page-metadata";
import { resolvePathCovers } from "@/lib/paths/cover";
import { PublicCatalogue } from "./public-catalogue";

export const metadata: Metadata = {
  title: "Catalogue des parcours",
  description:
    "Découvre les parcours CyberLearn en cybersécurité, développement et réseaux avant de créer ton compte.",
  ...pageAddress("/catalogue"),
};

export default async function CataloguePage(): Promise<React.JSX.Element> {
  let paths: PublicCatalogPath[] = [];
  try {
    paths = await statsRepository.findPublicCatalog();
  } catch {
    // The catalogue remains reachable during a temporary database outage.
  }

  // Rendered for each request, since the layout reads the session: an
  // uploaded cover's signed URL is fresh each time (it lasts an hour), and a
  // path without one shows its illustration.
  const covers = await resolvePathCovers(paths);
  // The layout's rule, read again (both reads are cached for the request):
  // whoever it draws in the app's shell gets cards that open the path.
  const viewer = await getRequestUser();
  const member = viewer !== null && (await getActiveBan()) === null;
  return (
    <PublicCatalogue
      member={member}
      paths={paths.map((path, index) => ({
        ...path,
        coverSrc: covers[index] ?? `/covers/paths/category-dev.svg`,
      }))}
    />
  );
}
