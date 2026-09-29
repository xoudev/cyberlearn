import React from "react";
import type { Metadata } from "next";
import { GhostLink, PageHeader } from "../../_components/admin-ui";
import { PathsGrid } from "../_components/paths-grid";
import { listPaths } from "@/lib/services/path-list.service";

import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: "Parcours archivés" };

export default async function ArchivedPathsPage(): Promise<React.ReactElement> {
  await requireAdminPage();
  const { rows } = await listPaths("archives");

  return (
    <main className="a-page">
      <PageHeader
        eyebrow="Contenu"
        title={`Parcours archivés (${String(rows.length)})`}
        description="Invisibles sur le site et dans l'app. Les progressions et les certificats déjà délivrés sont conservés. Change le statut d'un parcours pour le remettre en brouillon : il retourne dans la liste des parcours."
        actions={<GhostLink href="/paths">Retour aux parcours</GhostLink>}
      />

      <PathsGrid paths={rows} folder="archives" />
    </main>
  );
}
