import React from "react";
import type { Metadata } from "next";
import { GhostLink, PageHeader, PrimaryLink } from "../_components/admin-ui";
import { ArchiveFirstCatalogueButton } from "../_components/archive-first-catalogue-button";
import { PathsGrid } from "./_components/paths-grid";
import { firstCatalogueCounts } from "@/lib/services/first-catalogue.service";
import { listPaths } from "@/lib/services/path-list.service";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Parcours" };

export default async function AdminPathsPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const [{ rows, counts }, first] = await Promise.all([
    listPaths("active"),
    firstCatalogueCounts(),
  ]);

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Contenu"
        title="Parcours"
        description={`${String(counts.published)} publié${counts.published !== 1 ? "s" : ""} · ${String(counts.draft)} brouillon${counts.draft !== 1 ? "s" : ""}. Les parcours archivés sont rangés à part ; un parcours publié doit être archivé avant suppression.`}
        actions={
          <>
            <ArchiveFirstCatalogueButton paths={first.paths} lessons={first.lessons} />
            <GhostLink href="/paths/archives">Archives ({String(counts.archived)})</GhostLink>
            <PrimaryLink href="/paths/new">Nouveau parcours</PrimaryLink>
          </>
        }
      />

      <PathsGrid paths={rows} folder="active" />
    </main>
  );
}
